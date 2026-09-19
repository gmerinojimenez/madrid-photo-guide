import type { LocalizedText } from './schema.ts';

/** Returns the requested locale's text, falling back to Spanish. Never returns empty. */
export function localize(text: LocalizedText, locale: string): string {
  const variant = locale === 'es' ? text.es : (text as Record<string, string | undefined>)[locale];
  return variant ?? text.es;
}
