import { existsSync, readFileSync, lstatSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { safePath, digest } from './paths.mjs';
import { loadCatalog, verifyCheck, resolveModules } from './catalog.mjs';
import { materializeModule, materializeCore, composeRules, composeComponents } from './compose.mjs';
import { loadState, checkState } from './doctor.mjs';
import { applyPlan } from './transaction.mjs';
import { captureSource, checkSourceLineage } from './update-source.mjs';
import { layoutFor, pointerBlock, pointerPattern, validateTasksDirectory } from './layout.mjs';

const keyOf = file => `${file.root}:${file.path}`;

function checkVersion(previous, next, label) {
  if (previous === next) return;
  const parse = value => {
    const match = /^(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?$/.exec(value);
    return match ? { numbers: match.slice(1, 4).map(Number), prerelease: match[4] } : null;
  };
  const before = parse(previous), after = parse(next);
  if (!before || !after) throw new Error(`Ambiguous version change for ${label}: ${previous} -> ${next}; explicit migration required`);
  for (let index = 0; index < 3; index++) {
    if (after.numbers[index] < before.numbers[index]) throw new Error(`Version downgrade refused for ${label}: ${previous} -> ${next}`);
    if (after.numbers[index] > before.numbers[index]) return;
  }
  // Same numbers: only a prerelease reaching its release is an upgrade.
  if (before.prerelease && after.prerelease) throw new Error(`Ambiguous version change for ${label}: ${previous} -> ${next}; explicit migration required`);
  if (!before.prerelease) throw new Error(`Version downgrade refused for ${label}: ${previous} -> ${next}`);
}

function showDifference(entry, roots) {
  if (entry.remove) { console.log(`REMOVE ${keyOf(entry)}`); return; }
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
  const { state: previous, layout: previousLayout } = loadState(projectRoot);
  const configuration = previous.configuration;
  const layout = layoutFor(validateTasksDirectory(configuration.tasksDirectory));
  // A 0.1 installation keeps its kit at the project root; the update relocates it into TASKS_DIR.
  const migrating = previousLayout.legacy;
  const userRoot = resolve(options.userRoot ?? process.env.WORKFLOW_USER_ROOT ?? configuration.userRoot);
  if (userRoot !== resolve(configuration.userRoot)) throw new Error('update cannot relocate user exports');
  if (projectRoot === userRoot || userRoot.startsWith(projectRoot + '/') || projectRoot.startsWith(userRoot + '/.claude/')) throw new Error('User skill root must not overlap project');
  const roots = { project: projectRoot, user: userRoot };
  checkState(previous, roots);
  const inventoryContent = readFileSync(safePath(projectRoot, previousLayout.inventory));
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
  const entries = materializeCore(options.kitRoot, configuration);
  const modules = [];
  for (const manifest of ordered) {
    const installed = previous.modules.find(module => module.id === manifest.id);
    const settings = Object.fromEntries(Object.entries(installed.settings).map(([key, value]) => [`${manifest.id}.${key}`, value]));
    const candidate = materializeModule(catalog.get(manifest.id), configuration, settings);
    if (JSON.stringify(candidate.module.settings) !== JSON.stringify(installed.settings)) throw new Error(`Update would change settings for ${manifest.id}; explicit migration required`);
    entries.push(...candidate.entries);
    modules.push(candidate.module);
  }
  const previousFiles = new Map(previous.files.map(file => [keyOf(file), file]));
  // Configuration and branch policy keep their bytes; a migration only moves them.
  const preservedPaths = migrating ? [] : [layout.environment, layout.branchPolicy, 'AGENTS.md', 'CLAUDE.md'];
  if (migrating) {
    for (const [from, to] of [[previousLayout.environment, layout.environment], [previousLayout.branchPolicy, layout.branchPolicy]]) {
      const prior = previousFiles.get(`project:${from}`);
      if (!prior) throw new Error(`Managed file missing from inventory: ${from}; explicit migration required`);
      entries.push({ root: 'project', path: to, content: readFileSync(safePath(projectRoot, from)), mode: prior.mode, owner: 'core', editable: false });
    }
    // Only the pointer block changes; the rest of CLAUDE.md and AGENTS.md belongs to the project.
    for (const filename of ['CLAUDE.md', 'AGENTS.md']) {
      const current = readFileSync(safePath(projectRoot, filename));
      const content = Buffer.from(current.toString().replace(pointerPattern, () => pointerBlock(layout)));
      entries.push({ root: 'project', path: filename, content, mode: previousFiles.get(`project:${filename}`)?.mode ?? 0o644,
        owner: 'core', editable: true, rewrite: true, expected: digest(current) });
    }
  }
  const getContent = path => {
    const prior = previousFiles.get(`project:${path}`);
    if (prior?.editable) return readFileSync(safePath(projectRoot, path));
    return entries.find(entry => entry.root === 'project' && entry.path === path)?.content ?? readFileSync(safePath(projectRoot, path));
  };
  entries.push(
    { root: 'project', path: layout.rules, content: composeRules(modules, getContent, layout), mode: 0o644, owner: 'core', editable: false },
    { root: 'project', path: layout.components, content: composeComponents(modules), mode: 0o644, owner: 'core', editable: false },
  );
  const proposedKeys = new Set(entries.map(keyOf));
  const removals = [];
  for (const file of previous.files) {
    if (proposedKeys.has(keyOf(file)) || (file.root === 'project' && preservedPaths.includes(file.path))) continue;
    if (!migrating || file.editable) throw new Error(`Managed file removal unsupported: ${keyOf(file)}; explicit migration required`);
    removals.push({ root: file.root, path: file.path, remove: true, expected: file.sha256 });
  }
  const seen = new Set();
  const writes = [];
  const files = previous.files.filter(file => !removals.some(removal => keyOf(removal) === keyOf(file)));
  for (const entry of entries) {
    const key = keyOf(entry);
    if (seen.has(key)) throw new Error(`Duplicate destination: ${key}`);
    seen.add(key);
    const prior = previousFiles.get(key);
    if (prior && (prior.owner !== entry.owner || prior.editable !== entry.editable)) throw new Error(`File ownership/editability changed: ${key}; explicit migration required`);
    if (prior?.editable && !entry.rewrite) { if (!options.quiet) console.log(`PRESERVE ${key}`); continue; }
    const path = safePath(roots[entry.root], entry.path);
    if (prior && !entry.rewrite) entry.expected = prior.sha256;
    else if (!prior && existsSync(path)) throw new Error(`Collision: ${key}`);
    writes.push(entry);
    const record = { root: entry.root, path: entry.path, mode: entry.mode, owner: entry.owner, editable: entry.editable, sha256: digest(entry.content) };
    const index = files.findIndex(file => keyOf(file) === key);
    if (index < 0) files.push(record); else files[index] = record;
  }
  for (const module of modules) for (const check of module.checks) {
    if ((check.level ?? 'fail') === 'fail') verifyCheck(check, check.path, getContent(check.path));
  }
  const state = { ...previous, version, source, modules, files };
  const inventory = Buffer.from(JSON.stringify(state, null, 2) + '\n');
  if (migrating) writes.push(...removals, { root: 'project', path: previousLayout.inventory, remove: true, expected: digest(inventoryContent) },
    { root: 'project', path: layout.inventory, mode: 0o644, content: inventory });
  else writes.push({ root: 'project', path: layout.inventory, mode: 0o644, content: inventory, expected: digest(inventoryContent) });
  const guards = previous.files.map(file => {
    const path = safePath(roots[file.root], file.path);
    return [keyOf(file), digest(readFileSync(path)), lstatSync(path).mode & 0o777];
  });
  const plan = digest(JSON.stringify({ source, guards, inventory: digest(inventoryContent),
    writes: writes.map(entry => [keyOf(entry), entry.mode, entry.remove ? 'remove' : digest(entry.content)]) }));
  // `quiet` is the apply pass of an already displayed plan; `showDiff: false` keeps a preview to its file list.
  if (!options.quiet) {
    console.log(`Installed source: ${previous.source ? JSON.stringify(previous.source) : 'unknown; history/upgrade direction cannot be established'}`);
    console.log(`Candidate source: ${JSON.stringify(source)}`);
    console.log(`Modules: ${modules.map(module => module.id + '@' + module.version).join(', ')}`);
    if (migrating) console.log(`Layout: migrate the 0.1 root-level kit into ${layout.kit}; unmanaged files stay in place`);
    for (const path of preservedPaths) console.log(`PRESERVE project:${path}`);
    console.log(`Plan: ${plan}`);
  }
  if (options.dryRun) { if (options.showDiff !== false) for (const entry of writes) showDifference(entry, roots); }
  else if (options.expectPlan !== plan) throw new Error('Plan approval missing or stale; run update --dry-run and pass its exact --expect-plan fingerprint');
  const beforeApply = () => {
    if (JSON.stringify(captureSource(options.kitRoot, selectedSources, options.revision)) !== JSON.stringify(source)) throw new Error('Concurrent source change; recalculate the plan');
    if (!readFileSync(safePath(projectRoot, previousLayout.inventory)).equals(inventoryContent)) throw new Error('Concurrent inventory change; recalculate the plan');
    checkState(previous, roots);
    for (const [key, hash, mode] of guards) {
      const file = previousFiles.get(key), path = safePath(roots[file.root], file.path);
      if (digest(readFileSync(path)) !== hash || (lstatSync(path).mode & 0o777) !== mode) throw new Error(`Concurrent change: ${key}`);
    }
  };
  options.beforeApply?.();
  applyPlan(writes, roots, { dryRun: options.dryRun, beforeApply, afterWrite: options.afterWrite });
  return { state, plan, migrating };
}
