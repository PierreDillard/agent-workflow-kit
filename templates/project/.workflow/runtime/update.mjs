import { existsSync, readFileSync, lstatSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { safePath, digest } from './paths.mjs';
import { loadCatalog, resolveModules } from './catalog.mjs';
import { materializeModule, materializeCore, composeRules, composeComponents } from './compose.mjs';
import { loadState, checkState } from './doctor.mjs';
import { applyPlan } from './transaction.mjs';
import { captureSource, checkSourceLineage } from './update-source.mjs';

const keyOf = file => `${file.root}:${file.path}`;

function checkVersion(previous, next, label) {
  if (previous === next) return;
  const parse = value => /^\d+\.\d+\.\d+$/.test(value) ? value.split('.').map(Number) : null;
  const before = parse(previous), after = parse(next);
  if (!before || !after) throw new Error(`Ambiguous version change for ${label}: ${previous} -> ${next}; explicit migration required`);
  for (let index = 0; index < 3; index++) {
    if (after[index] < before[index]) throw new Error(`Version downgrade refused for ${label}: ${previous} -> ${next}`);
    if (after[index] > before[index]) return;
  }
}

function showDifference(entry, roots) {
  const path = safePath(roots[entry.root], entry.path);
  const before = existsSync(path) ? readFileSync(path) : Buffer.alloc(0);
  if (before.equals(entry.content)) return;
  console.log(`DIFF ${keyOf(entry)} ${digest(before)} -> ${digest(entry.content)}`);
  if (before.includes(0) || entry.content.includes(0)) return;
  const previousLines = before.toString().split('\n'), nextLines = entry.content.toString().split('\n');
  let start = 0, previousEnd = previousLines.length, nextEnd = nextLines.length;
  while (start < previousEnd && start < nextEnd && previousLines[start] === nextLines[start]) start++;
  while (previousEnd > start && nextEnd > start && previousLines[previousEnd - 1] === nextLines[nextEnd - 1]) { previousEnd--; nextEnd--; }
  console.log(`@@ ${start + 1}: ${previousEnd - start} removed, ${nextEnd - start} added @@`);
  for (const line of previousLines.slice(start, previousEnd)) console.log('-' + line);
  for (const line of nextLines.slice(start, nextEnd)) console.log('+' + line);
}

export function updateKit(options) {
  if (options.modules || options.profile || Object.keys(options.settings ?? {}).length) throw new Error('update preserves selection and settings; use add for new modules');
  const projectRoot = resolve(options.target);
  if (execFileSync('git', ['-C', projectRoot, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim() !== projectRoot) throw new Error('Target must be a Git repository root');
  const previous = loadState(projectRoot);
  const configuration = previous.configuration;
  const userRoot = resolve(options.userRoot ?? process.env.WORKFLOW_USER_ROOT ?? configuration.userRoot);
  if (userRoot !== resolve(configuration.userRoot)) throw new Error('update cannot relocate user exports');
  if (projectRoot === userRoot || userRoot.startsWith(projectRoot + '/') || projectRoot.startsWith(userRoot + '/.claude/')) throw new Error('User skill root must not overlap project');
  const roots = { project: projectRoot, user: userRoot };
  checkState(previous, roots);
  const inventoryContent = readFileSync(safePath(projectRoot, '.workflow-kit.json'));
  const { catalog } = loadCatalog(options.catalogs, options.sources ?? []);
  const selectedSources = previous.modules.map(module => {
    const source = catalog.get(module.id);
    if (!source) throw new Error(`Update source missing for installed module: ${module.id}`);
    checkVersion(module.version, source.manifest.version, module.id);
    return source;
  });
  const source = captureSource(options.kitRoot, selectedSources, options.revision);
  checkSourceLineage(options.kitRoot, previous.source, source);
  const version = readFileSync(safePath(options.kitRoot, 'VERSION'), 'utf8').trim();
  checkVersion(previous.version, version, 'core');
  const ordered = resolveModules(catalog, previous.modules.map(module => module.id));
  if (ordered.length !== previous.modules.length || ordered.some(module => !previous.modules.some(installed => installed.id === module.id))) throw new Error('Update would change installed modules; explicit migration required');
  const entries = materializeCore(options.kitRoot);
  const modules = [];
  for (const manifest of ordered) {
    const installed = previous.modules.find(module => module.id === manifest.id);
    const settings = Object.fromEntries(Object.entries(installed.settings).map(([key, value]) => [`${manifest.id}.${key}`, value]));
    const candidate = materializeModule(catalog.get(manifest.id), configuration, settings);
    if (JSON.stringify(candidate.module.settings) !== JSON.stringify(installed.settings)) throw new Error(`Update would change settings for ${manifest.id}; explicit migration required`);
    entries.push(...candidate.entries);
    modules.push(candidate.module);
  }
  const preservedPaths = ['.workflow-kit.env', '.workflow/branch-policy.md', 'AGENTS.md', 'CLAUDE.md'];
  const proposedKeys = new Set(entries.map(keyOf));
  for (const file of previous.files) {
    if (file.root === 'project' && preservedPaths.includes(file.path)) proposedKeys.add(keyOf(file));
    if (!proposedKeys.has(keyOf(file)) && !['.workflow/PROJECT_RULES.md', '.workflow/components.tsv'].includes(file.path)) throw new Error(`Managed file removal unsupported: ${keyOf(file)}; explicit migration required`);
  }
  const previousFiles = new Map(previous.files.map(file => [keyOf(file), file]));
  const getContent = path => {
    const prior = previousFiles.get(`project:${path}`);
    if (prior?.editable) return readFileSync(safePath(projectRoot, path));
    return entries.find(entry => entry.root === 'project' && entry.path === path)?.content ?? readFileSync(safePath(projectRoot, path));
  };
  entries.push(
    { root: 'project', path: '.workflow/PROJECT_RULES.md', content: composeRules(modules, getContent), mode: 0o644, owner: 'core', editable: false },
    { root: 'project', path: '.workflow/components.tsv', content: composeComponents(modules), mode: 0o644, owner: 'core', editable: false },
  );
  const seen = new Set();
  const writes = [];
  const files = [...previous.files];
  for (const entry of entries) {
    const key = keyOf(entry);
    if (seen.has(key)) throw new Error(`Duplicate destination: ${key}`);
    seen.add(key);
    const prior = previousFiles.get(key);
    if (prior && (prior.owner !== entry.owner || prior.editable !== entry.editable)) throw new Error(`File ownership/editability changed: ${key}; explicit migration required`);
    if (prior?.editable) { console.log(`PRESERVE ${key}`); continue; }
    const path = safePath(roots[entry.root], entry.path);
    if (prior) entry.expected = prior.sha256;
    else if (existsSync(path)) throw new Error(`Collision: ${key}`);
    writes.push(entry);
    const record = { root: entry.root, path: entry.path, mode: entry.mode, owner: entry.owner, editable: entry.editable, sha256: digest(entry.content) };
    const index = files.findIndex(file => keyOf(file) === key);
    if (index < 0) files.push(record); else files[index] = record;
  }
  for (const module of modules) for (const check of module.checks) {
    const content = getContent(check.path);
    if (check.maxBytes && content.length > check.maxBytes) throw new Error(`Size limit exceeded: ${check.path}`);
    if (check.type === 'json' || check.type === 'timezone') {
      const value = JSON.parse(content);
      if (check.type === 'timezone') new Intl.DateTimeFormat('en', { timeZone: value.timezone });
    }
  }
  const state = { ...previous, version, source, modules, files };
  writes.push({ root: 'project', path: '.workflow-kit.json', mode: 0o644, content: Buffer.from(JSON.stringify(state, null, 2) + '\n'), expected: digest(inventoryContent) });
  const guards = previous.files.map(file => {
    const path = safePath(roots[file.root], file.path);
    return [keyOf(file), digest(readFileSync(path)), lstatSync(path).mode & 0o777];
  });
  const plan = digest(JSON.stringify({ source, guards, inventory: digest(inventoryContent), writes: writes.map(entry => [keyOf(entry), entry.mode, digest(entry.content)]) }));
  console.log(`Installed source: ${previous.source ? JSON.stringify(previous.source) : 'unknown; history/upgrade direction cannot be established'}`);
  console.log(`Candidate source: ${JSON.stringify(source)}`);
  console.log(`Modules: ${modules.map(module => module.id + '@' + module.version).join(', ')}`);
  for (const path of preservedPaths) console.log(`PRESERVE project:${path}`);
  console.log(`Plan: ${plan}`);
  if (options.dryRun) for (const entry of writes) showDifference(entry, roots);
  else if (options.expectPlan !== plan) throw new Error('Plan approval missing or stale; run update --dry-run and pass its exact --expect-plan fingerprint');
  const beforeApply = () => {
    if (JSON.stringify(captureSource(options.kitRoot, selectedSources, options.revision)) !== JSON.stringify(source)) throw new Error('Concurrent source change; recalculate the plan');
    if (!readFileSync(safePath(projectRoot, '.workflow-kit.json')).equals(inventoryContent)) throw new Error('Concurrent inventory change; recalculate the plan');
    checkState(previous, roots);
    for (const [key, hash, mode] of guards) {
      const file = previousFiles.get(key), path = safePath(roots[file.root], file.path);
      if (digest(readFileSync(path)) !== hash || (lstatSync(path).mode & 0o777) !== mode) throw new Error(`Concurrent change: ${key}`);
    }
  };
  options.beforeApply?.();
  applyPlan(writes, roots, { dryRun: options.dryRun, beforeApply, afterWrite: options.afterWrite });
  return { state, plan };
}
