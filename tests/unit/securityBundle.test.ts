/**
 * Online Store Platform — Client Source & Compiled Bundle Secret Guard Test
 * Author: JoNa (https://github.com/jona-datasol)
 *
 * Verifies that neither client source files (src/, public/, index.html, vercel.json)
 * nor compiled production artifacts (dist/, when present after `vite build`) contain
 * privileged server secrets, private keys, or service_role credentials.
 *
 * Scope note: This test covers workspace client sources and built bundles.
 * Full Git history secret scanning is enforced separately via CI secret scanning / gitleaks.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const WORKSPACE_ROOT = process.cwd();
const CLIENT_SCAN_TARGETS = ['src', 'public', 'index.html', 'vercel.json'];
const DIST_ROOT = path.resolve(WORKSPACE_ROOT, 'dist');

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
  {
    rule: 'privileged_server_env_access_in_client',
    pattern:
      /(import\.meta\.env|process\.env)\.(VITE_)?(SUPABASE_SERVICE_ROLE_KEY|WHATSAPP_CLOUD_TOKEN|WHATSAPP_ACCESS_TOKEN|WHATSAPP_APP_SECRET|WHATSAPP_VERIFY_TOKEN|OPENAI_API_KEY|GEMINI_API_KEY|ANTHROPIC_API_KEY)\b/,
  },
  {
    rule: 'meta_whatsapp_access_token_literal',
    pattern: /\bEAA[A-Za-z0-9]{20,}\b/,
  },
  {
    rule: 'ai_provider_secret_key_literal',
    pattern: /\b(sk-(proj-|ant-)?[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{35})\b/,
  },
  {
    rule: 'private_key_pem_block',
    pattern: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/,
  },
  {
    rule: 'hardcoded_service_role_jwt',
    // Base64url fragment for `"role":"service_role"` inside a JWT payload
    pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]*(InJvbGUiOiJzZXJ2aWNlX3JvbGUi|cm9sZSI6InNlcnZpY2Vfcm9sZQ)[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+/,
  },
];

function collectFiles(targetPath: string): string[] {
  if (!existsSync(targetPath)) {
    return [];
  }

  const stats = statSync(targetPath);
  if (stats.isFile()) {
    return SCANNABLE_EXTENSIONS.has(path.extname(targetPath).toLowerCase()) ? [targetPath] : [];
  }

  const entries = readdirSync(targetPath);
  const collected: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(targetPath, entry);
    const entryStats = statSync(fullPath);

    if (entryStats.isDirectory()) {
      collected.push(...collectFiles(fullPath));
    } else if (entryStats.isFile() && SCANNABLE_EXTENSIONS.has(path.extname(entry).toLowerCase())) {
      collected.push(fullPath);
    }
  }

  return collected;
}

function scanFilesForSecrets(filePaths: readonly string[]): SecurityViolation[] {
  const violations: SecurityViolation[] = [];

  for (const filePath of filePaths) {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const lineText = lines[index] ?? '';
      for (const { rule, pattern } of FORBIDDEN_PATTERNS) {
        if (pattern.test(lineText)) {
          violations.push({
            file: path.relative(WORKSPACE_ROOT, filePath),
            line: index + 1,
            rule,
            snippet: lineText.trim().slice(0, 140),
          });
        }
      }
    }
  }

  return violations;
}

describe('Seguridad cliente y bundle — proteccion contra exposicion de secretos privilegiados', () => {
  it('escanea src/, public/, index.html y vercel.json sin secretos ni llaves privilegiadas', () => {
    const files = CLIENT_SCAN_TARGETS.flatMap((rel) =>
      collectFiles(path.resolve(WORKSPACE_ROOT, rel))
    );
    expect(files.length).toBeGreaterThan(0);

    const violations = scanFilesForSecrets(files);
    expect(violations).toEqual([]);
  });

  it('escanea el bundle compilado dist/ (cuando existe) sin credenciales privilegiadas', () => {
    if (!existsSync(DIST_ROOT)) {
      return;
    }

    const distFiles = collectFiles(DIST_ROOT);
    expect(distFiles.length).toBeGreaterThan(0);

    const violations = scanFilesForSecrets(distFiles);
    expect(violations).toEqual([]);
  });
});
