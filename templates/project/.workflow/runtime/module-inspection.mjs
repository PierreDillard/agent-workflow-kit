import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateManifest } from './catalog.mjs';
import { digest, readJson, readTree, safePath } from './paths.mjs';

function decodeText(content) {
  if (content.includes(0)) return null;
  try { return new TextDecoder('utf-8', { fatal: true }).decode(content); }
  catch { return null; }
}

// Files are review data, including scripts and instructions; none are executed.
export function inspectModule(directory) {
  const sourceRoot = resolve(directory);
  const manifest = validateManifest(readJson(safePath(sourceRoot, 'module.json')));
  for (const contribution of [...(manifest.skills ?? []), ...(manifest.files ?? []), ...(manifest.rules ?? [])]) {
    safePath(sourceRoot, contribution.source);
  }
  const files = readdirSync(sourceRoot).sort().flatMap(name => readTree(sourceRoot, name))
    .map(file => ({
      path: file.path,
      mode: file.mode,
      bytes: file.content.length,
      sha256: digest(file.content),
      text: decodeText(file.content),
    }));
  return {
    module: manifest,
    files,
    packageFingerprint: digest(JSON.stringify(files.map(file => ({ path: file.path, mode: file.mode, sha256: file.sha256 })))),
    requiresUserApproval: true,
    isActivation: false,
    scriptsExecuted: false,
  };
}
