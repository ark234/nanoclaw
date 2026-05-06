/**
 * Helpers for writing secret env files (.env, data/env/env) with strict
 * permissions. Use these instead of bare `fs.writeFileSync` so the perms
 * don't drift back to umask defaults (typically 0644 — world-readable) the
 * next time setup or a channel-install flow rewrites the file.
 *
 * `mode: 0o600` on writeFileSync is honored only when the file is created;
 * existing files keep their old perms. So every helper also runs an
 * explicit `chmodSync(0o600)` to fix legacy 0644 files in place.
 */
import fs from 'fs';

export function writeSecretEnvFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, { mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

export function copySecretEnvFile(src: string, dst: string): void {
  fs.copyFileSync(src, dst);
  fs.chmodSync(dst, 0o600);
}
