import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { readTree, digest } from './paths.mjs';

// A kit run through npx is an extracted package, not a checkout: it is identified by name@version.
function isCheckout(kitRoot) {
  const result = spawnSync('git', ['-C', kitRoot, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  return result.status === 0 && realpathSync(result.stdout.trim()) === realpathSync(kitRoot);
}

export function captureSource(kitRoot, moduleSources, revision) {
  const checkout = isCheckout(kitRoot);
  if (revision !== undefined && !checkout) throw new Error('--revision requires a Git checkout of the kit');
  const head = checkout ? execFileSync('git', ['-C', kitRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() : null;
  if (revision !== undefined && (!/^[a-f0-9]{40}$/.test(revision) || revision !== head)) {
    throw new Error('Requested source revision must be the exact checked-out full SHA; no substitution');
  }
  const sources = ['core', 'templates/project', 'bin', 'VERSION', 'package.json', 'install.sh', 'module.sh'];
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
  const fingerprint = digest(JSON.stringify(fingerprints));
  if (!checkout) {
    const { name, version } = JSON.parse(readFileSync(join(kitRoot, 'package.json'), 'utf8'));
    return { package: `${name}@${version}`, fingerprint };
  }
  const status = execFileSync('git', ['-C', kitRoot, 'status', '--porcelain', '--untracked-files=all'], { encoding: 'utf8' });
  return { revision: head, dirty: status.length > 0, fingerprint };
}

export function checkSourceLineage(kitRoot, previousSource, nextSource) {
  if (!previousSource) return; // Unknown history is disclosed in the plan, never invented.
  // Package releases carry no Git history; their order is enforced by the version checks instead.
  if (previousSource.package !== undefined || nextSource.revision === undefined) return;
  if (!/^[a-f0-9]{40}$/.test(previousSource.revision)) throw new Error('Invalid installed source revision');
  const result = spawnSync('git', ['-C', kitRoot, 'merge-base', '--is-ancestor', previousSource.revision, nextSource.revision]);
  if (result.status !== 0) throw new Error('Installed source revision is unavailable or not an ancestor; explicit migration required');
}
