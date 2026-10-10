import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { digest, safePath } from './paths.mjs';
import { loadCatalog, resolveModules, officialModules } from './catalog.mjs';
import { materializeModule, materializeCore, composeRules, composeComponents } from './compose.mjs';
import { loadState, checkState, checkPrecommit } from './doctor.mjs';
import { applyPlan } from './transaction.mjs';

const pointer = '<!-- workflow-kit:start -->\nWorkflow authority: [.workflow/PROJECT_RULES.md](.workflow/PROJECT_RULES.md).\nRead `.workflow-kit.env` and the installed module rules; load only relevant context.\n<!-- workflow-kit:end -->';
const quoteShell = value => `'${String(value).replaceAll("'", "'\\''")}'`;

function rootRules(projectRoot, filename, projectName) {
  const path = safePath(projectRoot, filename);
  if (existsSync(path)) {
    const content = readFileSync(path);
    if (content.includes('<!-- workflow-kit:start -->')) throw new Error(`Workflow marker already present: ${filename}`);
    return { content: Buffer.from(`${content}\n${pointer}\n`), expected: digest(content) };
  }
  return { content: Buffer.from(`# Project context: ${projectName}\n\n## Purpose\n\nDescribe the project purpose and boundaries.\n\n## Architecture map\n\nDescribe modules and main flows.\n\n## Persisted data and external integrations\n\nDescribe storage and external services.\n\n## Documentation maintenance\n\nKeep CLAUDE.md and AGENTS.md synchronized.\n\n${pointer}\n`) };
}

export function installOrAdd(options) {
  const projectRoot = resolve(options.target);
  const gitRoot = execFileSync('git', ['-C', projectRoot, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  if (gitRoot !== projectRoot) throw new Error('Target must be a Git repository root');
  const isAdding = options.command === 'add';
  if (!isAdding && existsSync(safePath(projectRoot, '.workflow-kit.json'))) throw new Error('Workflow kit already installed; use module.sh add');
  const previous = isAdding ? loadState(projectRoot) : null;
  const configuration = previous?.configuration ?? options.configuration;
  const userRoot = resolve(options.userRoot ?? process.env.WORKFLOW_USER_ROOT ?? configuration.userRoot);
  const roots = { project: projectRoot, user: userRoot };
  if (projectRoot === userRoot || userRoot.startsWith(`${projectRoot}/`) || projectRoot.startsWith(`${userRoot}/.claude/`)) throw new Error('User skill root must not overlap project');
  if (previous) checkState(previous, roots);
  else if (configuration.requirePrecommit) checkPrecommit(projectRoot);
  const { catalog, explicit } = loadCatalog(options.catalogs, options.sources);
  const profiles = { minimal: ['tasks', 'memory'], continuity: ['tasks', 'memory', 'continuity'], complete: officialModules };
  if (options.profile && !Object.hasOwn(profiles, options.profile)) throw new Error(`Unknown profile: ${options.profile}`);
  const requested = [...new Set([...(previous?.selected ?? []),
    ...(options.modules ?? (isAdding ? [] : profiles[options.profile ?? 'minimal'])), ...explicit])];
  if (isAdding && !options.modules?.length && !explicit.length) throw new Error('add requires --modules or --module');
  const ordered = resolveModules(catalog, requested, previous?.modules);
  const selectedIds = new Set(ordered.map(module => module.id));
  for (const key of Object.keys(options.settings)) if (!selectedIds.has(key.split('.')[0])) throw new Error(`Setting for unselected module: ${key}`);
  const entries = [];
  const modules = [];
  for (const manifest of ordered) {
    const installed = previous?.modules.find(module => module.id === manifest.id);
    if (installed) {
      if (explicit.includes(manifest.id) || options.modules?.includes(manifest.id) || Object.keys(options.settings).some(key => key.startsWith(`${manifest.id}.`))) {
        const source = catalog.get(manifest.id);
        if (!source) throw new Error(`Source required to verify installed module: ${manifest.id}`);
        const savedSettings = Object.fromEntries(Object.entries(installed.settings).map(([key, value]) => [`${manifest.id}.${key}`, value]));
        const candidate = materializeModule(source, configuration, { ...savedSettings, ...options.settings });
        if (candidate.module.fingerprint !== installed.fingerprint) throw new Error(`Module already installed with different content or configuration: ${manifest.id}; use module.sh update with an explicit source plan`);
      }
      modules.push(installed);
    } else {
      const materialized = materializeModule(catalog.get(manifest.id), configuration, options.settings);
      modules.push(materialized.module);
      entries.push(...materialized.entries);
    }
  }
  if (!previous) {
    entries.push(...materializeCore(options.kitRoot));
    const shellValues = { ...options.shellValues, WORKFLOW_USER_ROOT: userRoot };
    entries.push({ root: 'project', path: '.workflow-kit.env', content: Buffer.from(Object.entries(shellValues).map(([key, value]) =>
      key === 'WORKFLOW_USER_ROOT' ? `WORKFLOW_USER_ROOT=\${WORKFLOW_USER_ROOT:-${quoteShell(value)}}` : `${key}=${quoteShell(value)}`).join('\n') + '\n'), mode: 0o644, owner: 'core', editable: false });
    const policy = configuration.branchStrategy === 'custom' ? readFileSync(options.branchPolicy) : Buffer.from(configuration.branchStrategy === 'trunk' ?
      `Work remains on \`${configuration.defaultBranch}\`; no feature branch is required.\n` :
      `Feature branches derive from and merge directly into \`${configuration.defaultBranch}\`; prefix new work with \`${configuration.featureBranchPrefix}\`.\n`);
    entries.push({ root: 'project', path: '.workflow/branch-policy.md', content: policy, mode: 0o644, owner: 'core', editable: false });
    for (const filename of ['CLAUDE.md', 'AGENTS.md']) entries.push({ root: 'project', path: filename, ...rootRules(projectRoot, filename, configuration.projectName), mode: 0o644, owner: 'core', editable: true });
  }
  const getContent = path => entries.find(entry => entry.root === 'project' && entry.path === path)?.content ?? readFileSync(safePath(projectRoot, path));
  for (const [path, content] of [
    ['.workflow/PROJECT_RULES.md', composeRules(modules, getContent)],
    ['.workflow/components.tsv', composeComponents(modules)],
  ]) {
    const prior = previous?.files.find(file => file.root === 'project' && file.path === path);
    entries.push({ root: 'project', path, content, mode: 0o644, owner: 'core', editable: false, ...(prior ? { expected: prior.sha256 } : {}) });
  }
  const seen = new Set();
  for (const entry of entries) {
    const key = `${entry.root}:${entry.path}`;
    if (seen.has(key)) throw new Error(`Duplicate destination: ${key}`);
    seen.add(key);
    const path = safePath(roots[entry.root], entry.path);
    if (entry.root === 'user' && existsSync(path) && readFileSync(path).equals(entry.content)) entry.expected = digest(entry.content);
    const prior = previous?.files.find(file => file.root === entry.root && file.path === entry.path);
    if (prior && entry.owner !== 'core') throw new Error(`Destination already owned: ${key}`);
  }
  const files = (previous?.files ?? []).filter(file => !seen.has(`${file.root}:${file.path}`));
  for (const entry of entries) files.push({ root: entry.root, path: entry.path, mode: entry.mode, owner: entry.owner, editable: entry.editable, sha256: digest(entry.content) });
  const state = { schemaVersion: 1, version: options.kitVersion ?? previous.version, configuration: { ...configuration, userRoot }, selected: requested, modules, files };
  // Validate declarative checks against the planned content without executing module code.
  for (const module of modules) for (const check of module.checks) {
    const content = getContent(check.path);
    if (check.maxBytes && content.length > check.maxBytes) throw new Error(`Size limit exceeded: ${check.path}`);
    if (check.type === 'json' || check.type === 'timezone') {
      const value = JSON.parse(content);
      if (check.type === 'timezone') new Intl.DateTimeFormat('en', { timeZone: value.timezone });
    }
  }
  entries.push({ root: 'project', path: '.workflow-kit.json', content: Buffer.from(JSON.stringify(state, null, 2) + '\n'), mode: 0o644,
    ...(previous ? { expected: digest(readFileSync(safePath(projectRoot, '.workflow-kit.json'))) } : {}) });
  console.log(`Requested modules: ${requested.join(', ')}`);
  console.log(`Resolved modules: ${modules.map(module => `${module.id}@${module.version}`).join(', ')}`);
  applyPlan(entries, roots, { dryRun: options.dryRun, afterWrite: options.afterWrite });
  if (!options.dryRun) console.log(`Workflow modules ${isAdding ? 'added' : 'installed'} in ${projectRoot}`);
  return state;
}
