import { execFileSync, spawnSync } from 'node:child_process';
import { readTree, digest } from './paths.mjs';

export function captureSource(kitRoot, moduleSources, revision) {
  const head = execFileSync('git', ['-C', kitRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (revision !== undefined && (!/^[a-f0-9]{40}$/.test(revision) || revision !== head)) {
    throw new Error('Requested source revision must be the exact checked-out full SHA; no substitution');
  }
  const status = execFileSync('git', ['-C', kitRoot, 'status', '--porcelain', '--untracked-files=all'], { encoding: 'utf8' });
  const sources = ['core', 'templates/project', 'scripts', 'VERSION', 'install.sh', 'module.sh'];
  const fingerprints = sources.flatMap(source => readTree(kitRoot, source).map(file =>
    [file.path, file.mode, digest(file.content)]));
  for (const source of moduleSources) {
    fingerprints.push(...readTree(source.directory, 'module.json').map(file =>
      [source.manifest.id + ':' + file.path, file.mode, digest(file.content)]));
    // The manifest may select assets anywhere within the module, including external catalogs.
    for (const path of [...new Set([
      ...(source.manifest.skills ?? []).map(skill => skill.source),
      ...(source.manifest.files ?? []).map(file => file.source),
      ...(source.manifest.rules ?? []).map(rule => rule.source),
    ])].sort()) fingerprints.push(...readTree(source.directory, path).map(file =>
      [source.manifest.id + ':' + file.path, file.mode, digest(file.content)]));
  }
  return { revision: head, dirty: status.length > 0, fingerprint: digest(JSON.stringify(fingerprints)) };
}

export function checkSourceLineage(kitRoot, previousSource, nextSource) {
  if (!previousSource) return; // Unknown history is disclosed in the plan, never invented.
  if (!/^[a-f0-9]{40}$/.test(previousSource.revision)) throw new Error('Invalid installed source revision');
  const result = spawnSync('git', ['-C', kitRoot, 'merge-base', '--is-ancestor', previousSource.revision, nextSource.revision]);
  if (result.status !== 0) throw new Error('Installed source revision is unavailable or not an ancestor; explicit migration required');
}
