import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { catalog as catalogRootShape, location as locationSchema, tip as tipSchema, type Location } from '../src/core/content/schema.ts';

const REPO_ROOT = join(import.meta.dirname, '..');
const DEFAULT_CATALOG_PATH = join(REPO_ROOT, 'src/content/catalog.json');
const PHOTOS_ROOT = join(REPO_ROOT, 'assets/content/photos');

const MINIMUM_PREMIUM_FIELDS = [
  'coords',
  'capture',
  'shotDescription',
  'neighbourhoodDescription',
  'detailImage',
];
// "neighbourhoodDescription" no es una clave del esquema de Location: se resuelve a partir
// de neighbourhoodId (ver data-model.md), pero sigue siendo un nombre válido en
// access.premiumFields porque el núcleo lo trata como campo reservado a la compra.
const LOCATION_FIELD_NAMES = new Set([
  ...Object.keys(locationSchema.shape),
  'neighbourhoodDescription',
]);

type Severity = 'error' | 'warning';
type Finding = { severity: Severity; message: string };

const findings: Finding[] = [];
function fail(message: string): void {
  findings.push({ severity: 'error', message });
}
function warn(message: string): void {
  findings.push({ severity: 'warning', message });
}

function findDuplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates];
}

function imagePath(locationId: string, usage: string, index?: number): string {
  const filename = usage === 'extra' ? `extra-${index ?? 0}.jpg` : `${usage}.jpg`;
  return join(PHOTOS_ROOT, locationId, filename);
}

function main(): void {
  const catalogPath = process.argv[2] ?? DEFAULT_CATALOG_PATH;

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(catalogPath, 'utf-8'));
  } catch (error) {
    fail(`no se pudo leer o parsear "${catalogPath}": ${(error as Error).message}`);
    report();
    return;
  }

  const rootResult = catalogRootShape
    .extend({
      locations: locationSchema.array(),
      tips: tipSchema.array(),
    })
    .safeParse(raw);

  if (!rootResult.success) {
    fail(`el catálogo no valida contra el esquema: ${rootResult.error.message}`);
    report();
    return;
  }

  const data = rootResult.data;

  for (const [collectionName, items] of [
    ['tags', data.tags],
    ['tipCategories', data.tipCategories],
    ['neighbourhoods', data.neighbourhoods],
    ['locations', data.locations],
    ['tips', data.tips],
  ] as const) {
    const duplicates = findDuplicates(items.map((item) => item.id));
    for (const id of duplicates) {
      fail(`identificador duplicado "${id}" en "${collectionName}"`);
    }
  }

  const neighbourhoodIds = new Set(data.neighbourhoods.map((n) => n.id));
  const tagIds = new Set(data.tags.map((t) => t.id));
  const tipCategoryIds = new Set(data.tipCategories.map((c) => c.id));
  const locationIds = new Set(data.locations.map((l) => l.id));

  for (const field of MINIMUM_PREMIUM_FIELDS) {
    if (!data.access.premiumFields.includes(field)) {
      fail(`"access.premiumFields" no incluye el campo mínimo obligatorio "${field}"`);
    }
  }
  for (const field of data.access.premiumFields) {
    if (!LOCATION_FIELD_NAMES.has(field)) {
      fail(`"access.premiumFields" declara "${field}", que no es un campo de Location`);
    }
  }

  for (const location of data.locations) {
    if (!neighbourhoodIds.has(location.neighbourhoodId)) {
      fail(
        `la localización "${location.id}" referencia un neighbourhoodId inexistente "${location.neighbourhoodId}"`,
      );
    }
    if (location.tagIds.length === 0) {
      warn(`la localización "${location.id}" no tiene ninguna etiqueta`);
    }
    for (const tagId of location.tagIds) {
      if (!tagIds.has(tagId)) {
        warn(`la localización "${location.id}" usa una etiqueta fuera del vocabulario "${tagId}"`);
      }
    }
    if (location.access === 'premium' && !location.thumbnail) {
      warn(`la localización de pago "${location.id}" no tiene miniatura`);
    }

    // La miniatura siempre es pública y debe estar empaquetada, sea gratis o de pago.
    checkImageExists(location.id, location.thumbnail);

    // El detalle y las imágenes adicionales solo se empaquetan para localizaciones
    // gratuitas; en las de pago NO deben existir en disco (D-003).
    if (location.access === 'free') {
      checkImageExists(location.id, location.detailImage);
      for (const extra of location.extraImages ?? []) {
        checkImageExists(location.id, extra);
      }
    } else {
      checkImageAbsent(location.id, location.detailImage);
      for (const extra of location.extraImages ?? []) {
        checkImageAbsent(location.id, extra);
      }
    }
  }

  for (const tipItem of data.tips) {
    if (!tipCategoryIds.has(tipItem.categoryId)) {
      warn(
        `el consejo "${tipItem.id}" usa una categoría fuera del vocabulario "${tipItem.categoryId}"`,
      );
    }
    for (const relatedId of tipItem.relatedLocationIds ?? []) {
      if (!locationIds.has(relatedId)) {
        warn(
          `el consejo "${tipItem.id}" referencia una localización inexistente "${relatedId}" en relatedLocationIds`,
        );
      }
    }
  }

  checkOrphanFiles(data.locations);

  report();

  function checkImageExists(
    locationId: string,
    ref: { locationId: string; usage: string; index?: number },
  ): void {
    const path = imagePath(ref.locationId, ref.usage, ref.index);
    if (!existsSync(path)) {
      fail(`la imagen declarada por "${locationId}" no existe en disco: ${path}`);
    }
  }

  function checkImageAbsent(
    locationId: string,
    ref: { locationId: string; usage: string; index?: number },
  ): void {
    const path = imagePath(ref.locationId, ref.usage, ref.index);
    if (existsSync(path)) {
      fail(
        `la localización de pago "${locationId}" tiene la imagen "${ref.usage}" almacenada localmente (${path}), lo que incumple la constitución`,
      );
    }
  }

  function checkOrphanFiles(locations: Location[]): void {
    const declared = new Set<string>();
    for (const location of locations) {
      declared.add(
        imagePath(
          location.thumbnail.locationId,
          location.thumbnail.usage,
          location.thumbnail.index,
        ),
      );
      if (location.access === 'free') {
        declared.add(
          imagePath(
            location.detailImage.locationId,
            location.detailImage.usage,
            location.detailImage.index,
          ),
        );
        for (const extra of location.extraImages ?? []) {
          declared.add(imagePath(extra.locationId, extra.usage, extra.index));
        }
      }
    }

    if (!existsSync(PHOTOS_ROOT)) return;
    walkJpgFiles(PHOTOS_ROOT, (filePath) => {
      if (!declared.has(filePath)) {
        warn(`fichero JPG presente que ningún ImageRef declara: ${filePath}`);
      }
    });
  }
}

function walkJpgFiles(dir: string, onFile: (path: string) => void): void {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walkJpgFiles(fullPath, onFile);
    } else if (entry.endsWith('.jpg')) {
      onFile(fullPath);
    }
  }
}

function report(): void {
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');

  for (const finding of findings) {
    const prefix = finding.severity === 'error' ? 'ERROR' : 'AVISO';
    console.log(`${prefix}: ${finding.message}`);
  }

  if (errors.length === 0) {
    console.log(`Catálogo válido (${warnings.length} avisos)`);
  }

  process.exitCode = errors.length > 0 ? 1 : 0;
}

main();
