import { readJson, safePath, assertKeys } from './paths.mjs';

// Provenance is review evidence supplied by intake, not authenticated by a manifest.
export function reviewExternalPackage(inspection, directory, state) {
  const provenance = readJson(safePath(directory, 'provenance.json'));
  const fields = ['origin', 'revision', 'source_path', 'license', 'transformation', 'runtime_requirements'];
  assertKeys(provenance, fields, 'provenance');
  if (fields.some(field => typeof provenance[field] !== 'string' || !provenance[field].trim())) {
    throw new Error('External skill requires complete provenance, license, transformations and runtime requirements');
  }
  let origin;
  try { origin = new URL(provenance.origin); } catch { throw new Error('External skill origin must be an identified HTTPS repository'); }
  if (origin.protocol !== 'https:' || origin.username || origin.password || !origin.hostname ||
      !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(provenance.revision)) {
    throw new Error('External skill requires an HTTPS origin and exact Git revision');
  }
  safePath('/', provenance.source_path);
  const licensePath = `${inspection.module.skills[0].source}/LICENSE.txt`;
  if (!inspection.files.some(file => file.path === licensePath && file.bytes > 0)) {
    throw new Error('External skill must retain its license in the reviewed package');
  }
  for (const [dependency, version] of Object.entries(inspection.module.requires ?? {})) {
    if (!state.modules.some(module => module.id === dependency && (version === '*' || module.version === version))) {
      throw new Error(`External skill dependency must already be installed at the required version: ${dependency}`);
    }
  }
  return provenance;
}
