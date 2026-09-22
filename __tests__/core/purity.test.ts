import { describe, expect, it } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '..', '..');

function walk(dir: string, onFile: (path: string) => void): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      walk(full, onFile);
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      onFile(full);
    }
  }
}

/**
 * Principio I (núcleo compartido en TypeScript puro) y D-003/D-005/D-007:
 * lo nativo entra SIEMPRE tras un puerto. Esta batería lo hace verificable
 * en CI en lugar de depender de la disciplina de cada PR.
 */
describe('pureza de capas', () => {
  it('src/core/ no importa react, react-native ni ningún módulo expo-*', () => {
    const offenders: string[] = [];
    walk(join(REPO_ROOT, 'src/core'), (file) => {
      const content = readFileSync(file, 'utf-8');
      if (/from ['"](react|react-native|expo(-|\/))/.test(content)) {
        offenders.push(file);
      }
    });
    expect(offenders).toEqual([]);
  });

  it('app/ no importa expo-maps ni expo-clipboard directamente: pasan por src/ui y src/platform', () => {
    const offenders: string[] = [];
    walk(join(REPO_ROOT, 'app'), (file) => {
      const content = readFileSync(file, 'utf-8');
      if (/from ['"]expo-maps['"]|from ['"]expo-clipboard['"]/.test(content)) {
        offenders.push(file);
      }
    });
    expect(offenders).toEqual([]);
  });

  it('app/ no importa expo-sqlite directamente, salvo el layout raíz (que abre la base de datos)', () => {
    const offenders: string[] = [];
    walk(join(REPO_ROOT, 'app'), (file) => {
      if (file === join(REPO_ROOT, 'app', '_layout.tsx')) return;
      const content = readFileSync(file, 'utf-8');
      if (/from ['"]expo-sqlite['"]/.test(content)) offenders.push(file);
    });
    expect(offenders).toEqual([]);
  });

  it('app/ no importa Linking de react-native directamente: pasa por platform/system/external.ts', () => {
    const offenders: string[] = [];
    walk(join(REPO_ROOT, 'app'), (file) => {
      const content = readFileSync(file, 'utf-8');
      if (/\bLinking\b/.test(content)) offenders.push(file);
    });
    expect(offenders).toEqual([]);
  });

  it('nadie fuera de src/platform/purchases/ importa react-native-purchases (D-002/D-003)', () => {
    const offenders: string[] = [];
    const purchasesDir = join(REPO_ROOT, 'src', 'platform', 'purchases');
    for (const dir of ['src', 'app']) {
      walk(join(REPO_ROOT, dir), (file) => {
        if (file.startsWith(purchasesDir)) return;
        const content = readFileSync(file, 'utf-8');
        if (/from ['"]react-native-purchases['"]/.test(content)) offenders.push(file);
      });
    }
    expect(offenders).toEqual([]);
  });
});
