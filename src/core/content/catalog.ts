import { z } from 'zod';

import type { ContentLogger, DiscardedPiece } from './logging.ts';
import {
  catalog as catalogSchema,
  location as locationSchema,
  tip as tipSchema,
  type Catalog,
  type Location,
  type Tip,
} from './schema.ts';

export const SUPPORTED_SCHEMA_VERSION = 1;

export type LoadResult =
  | { status: 'ok'; catalog: Catalog }
  | { status: 'partial'; catalog: Catalog; discarded: DiscardedPiece[] }
  | { status: 'unsupported-version'; found: number; supported: number }
  | { status: 'invalid'; reason: string };

const shellSchema = catalogSchema.extend({
  locations: z.array(z.unknown()),
  tips: z.array(z.unknown()),
});

function readId(raw: unknown): string | null {
  if (
    raw &&
    typeof raw === 'object' &&
    'id' in raw &&
    typeof (raw as { id: unknown }).id === 'string'
  ) {
    return (raw as { id: string }).id;
  }
  return null;
}

/** Validates and normalizes an already-parsed catalog. Never throws. Never does I/O. */
export function loadCatalog(raw: unknown, logger?: ContentLogger): LoadResult {
  if (typeof raw !== 'object' || raw === null) {
    return { status: 'invalid', reason: 'catalog root is not an object' };
  }

  const versionCandidate = (raw as Record<string, unknown>).schemaVersion;
  if (typeof versionCandidate === 'number' && versionCandidate > SUPPORTED_SCHEMA_VERSION) {
    return {
      status: 'unsupported-version',
      found: versionCandidate,
      supported: SUPPORTED_SCHEMA_VERSION,
    };
  }

  const shellResult = shellSchema.safeParse(raw);
  if (!shellResult.success) {
    return { status: 'invalid', reason: shellResult.error.message };
  }

  const shell = shellResult.data;
  const neighbourhoodIds = new Set(shell.neighbourhoods.map((n) => n.id));

  const discarded: DiscardedPiece[] = [];

  const locations: Location[] = [];
  for (const rawLocation of shell.locations) {
    const parsed = locationSchema.safeParse(rawLocation);
    if (!parsed.success) {
      const piece: DiscardedPiece = {
        collection: 'locations',
        id: readId(rawLocation),
        reason: parsed.error.message,
      };
      discarded.push(piece);
      logger?.discarded(piece);
      continue;
    }
    if (!neighbourhoodIds.has(parsed.data.neighbourhoodId)) {
      const piece: DiscardedPiece = {
        collection: 'locations',
        id: parsed.data.id,
        reason: `unknown neighbourhoodId "${parsed.data.neighbourhoodId}"`,
      };
      discarded.push(piece);
      logger?.discarded(piece);
      continue;
    }
    locations.push(parsed.data);
  }

  const tips: Tip[] = [];
  for (const rawTip of shell.tips) {
    const parsed = tipSchema.safeParse(rawTip);
    if (!parsed.success) {
      const piece: DiscardedPiece = {
        collection: 'tips',
        id: readId(rawTip),
        reason: parsed.error.message,
      };
      discarded.push(piece);
      logger?.discarded(piece);
      continue;
    }
    tips.push(parsed.data);
  }

  const finalCatalog: Catalog = { ...shell, locations, tips };

  if (discarded.length > 0) {
    return { status: 'partial', catalog: finalCatalog, discarded };
  }
  return { status: 'ok', catalog: finalCatalog };
}
