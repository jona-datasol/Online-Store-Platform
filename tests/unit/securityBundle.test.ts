/**
 * Online Store Platform — Client Bundle & Source Secret Guard Test
 * Author: JoNa (https://github.com/jona-datasol)
 *
 * Verifies that no file in src/ references SUPABASE_SERVICE_ROLE_KEY or uses service_role
 * as a client-side credential (RNF-04 / ACCESS_CONTROL_MATRIX.md).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = path.resolve(process.cwd(), 'src');
const SCANNABLE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.css',
  '.html',
]);

interface SecurityViolation {
  readonly file: string;
  readonly line: number;
  readonly rule: string;
  readonly snippet: string;
}

const FORBIDDEN_PATTERNS: ReadonlyArray<{ readonly rule: string; readonly pattern: RegExp }> = [
  {
    rule: 'SUPABASE_SERVICE_ROLE_KEY',
    pattern: /SUPABASE_SERVICE_ROLE_KEY/i,
  },
  {
    rule: 'service_role_client_credential',
    pattern: /\bservice_role\b/i,
  },
  {
    rule: 'supabase_secret_key_prefix',
    pattern: /\bsb_secret_[A-Za-z0-9_-]+/,
  },
];

function collectSourceFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const collected: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      collected.push(...collectSourceFiles(fullPath));
    } else if (stats.isFile() && SCANNABLE_EXTENSIONS.has(path.extname(entry).toLowerCase())) {
      collected.push(fullPath);
    }
  }

  return collected;
}

describe('Seguridad cliente — proteccion contra exposicion de credenciales privilegiadas en src/', () => {
  it('escanea archivos reales de src/ sin referencias a SUPABASE_SERVICE_ROLE_KEY ni service_role', () => {
    const sourceFiles = collectSourceFiles(SRC_ROOT);
    expect(sourceFiles.length).toBeGreaterThan(0);

    const violations: SecurityViolation[] = [];

    for (const filePath of sourceFiles) {
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/);

      for (let index = 0; index < lines.length; index += 1) {
        const lineText = lines[index] ?? '';
        for (const { rule, pattern } of FORBIDDEN_PATTERNS) {
          if (pattern.test(lineText)) {
            violations.push({
              file: path.relative(process.cwd(), filePath),
              line: index + 1,
              rule,
              snippet: lineText.trim(),
            });
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
