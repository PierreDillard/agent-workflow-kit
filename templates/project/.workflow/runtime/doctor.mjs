import { readFileSync, existsSync, lstatSync, accessSync, constants } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { digest, safePath, readJson } from './paths.mjs';
import { resolveModules } from './catalog.mjs';

export function loadState(projectRoot) {
  const state = readJson(safePath(projectRoot, '.workflow-kit.json'));
  if (state.schemaVersion !== 1 || !Array.isArray(state.modules) || !Array.isArray(state.files)) throw new Error('Installation has no compatible module inventory; explicit migration required');
  return state;
}

export function checkPrecommit(projectRoot) {
  const hook = execFileSync('git', ['-C', projectRoot, 'rev-parse', '--git-path', 'hooks/pre-commit'], { encoding: 'utf8' }).trim();
  try { accessSync(resolve(projectRoot, hook), constants.X_OK); }
  catch { throw new Error('Required executable pre-commit hook missing'); }
}

export function checkState(state, roots) {
  resolveModules(new Map(), [], state.modules);
  for (const file of state.files) {
    const path = safePath(roots[file.root], file.path);
    const content = readFileSync(path);
    if (!file.editable && (digest(content) !== file.sha256 || (lstatSync(path).mode & 0o777) !== file.mode)) throw new Error(`Managed file changed: ${file.root}:${file.path}`);
  }
  for (const module of state.modules) for (const check of module.checks) {
    const content = readFileSync(safePath(roots.project, check.path));
    if (check.maxBytes && content.length > check.maxBytes) throw new Error(`Size limit exceeded: ${check.path}`);
    if (check.type === 'json' || check.type === 'timezone') {
      const value = JSON.parse(content);
      if (check.type === 'timezone') new Intl.DateTimeFormat('en', { timeZone: value.timezone });
    }
  }
  for (const filename of ['CLAUDE.md', 'AGENTS.md']) if (!readFileSync(safePath(roots.project, filename), 'utf8').includes('<!-- workflow-kit:start -->')) throw new Error(`Workflow pointer missing: ${filename}`);
  if (state.configuration.requirePrecommit) checkPrecommit(roots.project);
}

export function doctor(projectRoot, userRoot) {
  try {
    const state = loadState(projectRoot);
    checkState(state, { project: projectRoot, user: userRoot ?? state.configuration.userRoot });
    console.log(`ok    ${state.modules.length} modules; managed files, mirrors, dependencies and declarative checks`);
    console.log('workflow-doctor: 0 failure(s), 0 warning(s)');
  } catch (error) { console.error(`FAIL  ${error.message}\nworkflow-doctor: 1 failure(s)`); process.exitCode = 1; }
}

export function sessionStart(projectRoot) {
  const state = loadState(projectRoot);
  const moduleIds = new Set(state.modules.map(module => module.id));
  let branch = '';
  try { branch = execFileSync('git', ['-C', projectRoot, 'branch', '--show-current'], { encoding: 'utf8' }).trim(); } catch { /* Detached/non-Git staging has no branch pointers. */ }
  const tasksDirectory = state.configuration.tasksDirectory;
  if (branch) {
    console.log(`Workflow context for branch ${branch}`);
    const safeBranch = branch.replaceAll('/', '-');
    const pointers = [
      ['tasks', `${tasksDirectory}/todo/${safeBranch}/README.md`],
      ['memory', `${tasksDirectory}/PROJECT_MEMORY.md`],
      ['memory', `${tasksDirectory}/memory/${safeBranch}.md`],
      ['continuity', `${tasksDirectory}/handoff/${safeBranch}.md`],
    ];
    for (const [moduleId, path] of pointers) if (moduleIds.has(moduleId) && existsSync(safePath(projectRoot, path))) {
      if (moduleId !== 'continuity' || Date.now() - lstatSync(safePath(projectRoot, path)).mtimeMs < 14 * 86400000) console.log(path);
    }
  }
  for (const module of state.modules) for (const hook of module.hooks) {
    if (!(hook.when ?? []).every(moduleId => moduleIds.has(moduleId))) continue;
    const record = state.files.find(file => file.root === 'project' && file.owner === module.id && file.path === hook.path && !file.editable);
    const script = safePath(projectRoot, hook.path);
    if (!record || digest(readFileSync(script)) !== record.sha256) throw new Error(`Hook changed: ${hook.path}`);
    execFileSync(hook.runner, [script, ...hook.args], { cwd: projectRoot, stdio: 'inherit', timeout: 10000 });
  }
}
