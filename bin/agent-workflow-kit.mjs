#!/usr/bin/env node
import { dirname, resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { updateKit } from '../templates/project/.workflow/runtime/update.mjs';
import { installOrAdd } from '../templates/project/.workflow/runtime/manage.mjs';
import { loadCatalog, officialModules } from '../templates/project/.workflow/runtime/catalog.mjs';
import { doctor } from '../templates/project/.workflow/runtime/doctor.mjs';
import { locateInstallation, validateTasksDirectory } from '../templates/project/.workflow/runtime/layout.mjs';

const kitRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const usage = `Usage: agent-workflow-kit <command> [options]

Commands:
  init      Install the kit into a Git project (alias: install)
  add       Add modules: add reporting quality, or --modules ids / --module PATH
  update    Preview the update, then apply it after confirmation
  doctor    Check the installation without modifying it
  list      List available modules

Options:
  --target PATH          Project root (default: Git root of the current directory)
  --dry-run              Show the plan without writing anything
  -y, --yes              Use defaults without questions; apply an update without asking
  --config FILE          Project configuration (see examples/project.env)
  --tasks-dir PATH       Single kit directory (default: tasks)
  --local                Keep the tasks directory out of Git (.git/info/exclude)
  --profile NAME         minimal | continuity | complete
  --modules IDS          Comma-separated module IDs
  --module PATH          External module directory (repeatable)
  --catalog PATH         Additional module catalog (repeatable)
  --set MODULE.KEY=VALUE Module setting on first activation
  --user-root PATH       Destination of user-level skill exports (default: $HOME)
  --expect-plan HASH     Apply exactly the update plan printed by --dry-run
  --revision SHA         Require this exact checkout revision for update`;

const configurationKeys = ['PROJECT_NAME', 'DEFAULT_BRANCH', 'BRANCH_STRATEGY', 'FEATURE_BRANCH_PREFIX', 'BRANCH_POLICY_FILE',
  'TASKS_DIR', 'DEV_COMMAND', 'BUILD_COMMAND', 'TEST_COMMAND', 'LINT_COMMAND', 'TYPECHECK_COMMAND', 'REQUIRE_PRECOMMIT',
  'INSTALL_GLOBAL_SKILLS', 'REPORT_TIMEZONE', 'TRACK_TASKS_DIR'];
const shellKeys = ['PROJECT_NAME', 'TASKS_DIR', 'DEFAULT_BRANCH', 'BRANCH_STRATEGY', 'FEATURE_BRANCH_PREFIX',
  'DEV_COMMAND', 'BUILD_COMMAND', 'TEST_COMMAND', 'LINT_COMMAND', 'TYPECHECK_COMMAND', 'REQUIRE_PRECOMMIT', 'INSTALL_GLOBAL_SKILLS'];

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

function parseArguments(argumentsList) {
  const options = { catalogs: [join(kitRoot, 'modules')], sources: [], settings: {}, positional: [], dryRun: false, yes: false };
  const valueFlags = { '--target': 'target', '--config': 'config', '--tasks-dir': 'tasksDirectory', '--user-root': 'userRoot',
    '--profile': 'profile', '--expect-plan': 'expectPlan', '--revision': 'revision' };
  while (argumentsList.length) {
    const flag = argumentsList.shift();
    if (flag === '--dry-run') { options.dryRun = true; continue; }
    if (flag === '--yes' || flag === '-y' || flag === '--non-interactive') { options.yes = true; continue; }
    if (flag === '--local') { options.local = true; continue; }
    if (flag === '--help' || flag === '-h') { options.help = true; continue; }
    if (!flag.startsWith('-')) { options.positional.push(flag); continue; }
    const value = argumentsList.shift();
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    if (Object.hasOwn(valueFlags, flag)) options[valueFlags[flag]] = value;
    else if (flag === '--modules') options.modules = value.split(',');
    else if (flag === '--module') options.sources.push(value);
    else if (flag === '--catalog') options.catalogs.push(value);
    else if (flag === '--set') {
      const separator = value.indexOf('=');
      if (separator < 1) throw new Error('Setting must be module.key=value');
      options.settings[value.slice(0, separator)] = value.slice(separator + 1);
    } else throw new Error(`Unknown argument: ${flag}`);
  }
  return options;
}

function resolveTarget(target) {
  if (target === undefined) {
    const root = git(['rev-parse', '--show-toplevel']);
    if (!root) throw new Error('Run inside a Git repository or pass --target PATH');
    return root;
  }
  if (!existsSync(target) || !statSync(target).isDirectory()) throw new Error(`Target directory does not exist: ${target}`);
  const projectRoot = resolve(target);
  if (git(['-C', projectRoot, 'rev-parse', '--show-toplevel']) !== projectRoot) throw new Error(`Target must be a Git repository root: ${projectRoot}`);
  return projectRoot;
}

function loadConfiguration(path) {
  if (!existsSync(path)) throw new Error(`Config not found: ${path}`);
  const values = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    const key = separator < 0 ? line : line.slice(0, separator);
    if (!configurationKeys.includes(key)) throw new Error(`Unknown config key: ${key}`);
    values[key] = separator < 0 ? '' : line.slice(separator + 1);
  }
  return values;
}

// Lines are queued so that answers typed or pasted ahead of their question are not lost.
async function askAll(questions) {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const lines = [], waiting = [];
  let closed = false;
  prompt.on('line', line => waiting.length ? waiting.shift()(line) : lines.push(line));
  prompt.on('close', () => { closed = true; while (waiting.length) waiting.shift()(null); });
  const nextLine = () => lines.length ? Promise.resolve(lines.shift()) : closed ? Promise.resolve(null) : new Promise(resolve => waiting.push(resolve));
  try {
    const answers = {};
    for (const [key, question, fallback] of questions) {
      prompt.setPrompt(`${question} [${fallback}]: `);
      prompt.prompt();
      const line = await nextLine();
      if (line === null) throw new Error('Aborted; no files were written');
      answers[key] = line.trim() || fallback;
    }
    return answers;
  } finally { prompt.close(); }
}

function checkBoolean(values, key) {
  if (!['true', 'false'].includes(values[key])) throw new Error(`Invalid ${key}`);
  return values[key] === 'true';
}

async function install(options) {
  const projectRoot = resolveTarget(options.target);
  if (locateInstallation(projectRoot)) throw new Error('Workflow kit already installed; use add or update');
  const detectedBranch = git(['-C', projectRoot, 'symbolic-ref', '--short', 'HEAD']) ?? 'main';
  const values = { PROJECT_NAME: basename(projectRoot), DEFAULT_BRANCH: detectedBranch, BRANCH_STRATEGY: 'flat',
    FEATURE_BRANCH_PREFIX: 'dev/', BRANCH_POLICY_FILE: '', TASKS_DIR: 'tasks', DEV_COMMAND: '', BUILD_COMMAND: '',
    TEST_COMMAND: '', LINT_COMMAND: '', TYPECHECK_COMMAND: '', REQUIRE_PRECOMMIT: 'false', INSTALL_GLOBAL_SKILLS: 'true',
    REPORT_TIMEZONE: 'Europe/Paris', TRACK_TASKS_DIR: 'true', ...(options.config ? loadConfiguration(options.config) : {}) };
  if (options.tasksDirectory) values.TASKS_DIR = options.tasksDirectory;
  if (options.local) values.TRACK_TASKS_DIR = 'false';
  if (!values.PROJECT_NAME) values.PROJECT_NAME = basename(projectRoot);
  let selection = options.modules ? undefined : options.profile;
  if (!options.yes && process.stdin.isTTY) {
    const questions = [['PROJECT_NAME', 'Project name', values.PROJECT_NAME], ['TASKS_DIR', 'Kit directory (tasks and workflow)', values.TASKS_DIR],
      ['DEFAULT_BRANCH', 'Default branch', values.DEFAULT_BRANCH], ['BRANCH_STRATEGY', 'Branch strategy flat|trunk|custom', values.BRANCH_STRATEGY]];
    if (!options.modules && !options.profile && !options.sources.length) questions.push(['SELECTION', `Modules (profile minimal|continuity|complete, or ids among ${officialModules.join(',')})`, 'minimal']);
    if (!options.local) questions.push(['TRACK', 'Version the kit directory in Git? y|n', 'y']);
    const answers = await askAll(questions);
    Object.assign(values, Object.fromEntries(Object.entries(answers).filter(([key]) => configurationKeys.includes(key))));
    if (answers.TRACK) values.TRACK_TASKS_DIR = /^y(es)?$/i.test(answers.TRACK) ? 'true' : 'false';
    if (answers.SELECTION) {
      if (['minimal', 'continuity', 'complete'].includes(answers.SELECTION)) selection = answers.SELECTION;
      else options.modules = answers.SELECTION.split(',').map(value => value.trim()).filter(Boolean);
    }
  }
  if (!['flat', 'trunk', 'custom'].includes(values.BRANCH_STRATEGY)) throw new Error('Invalid BRANCH_STRATEGY');
  const requirePrecommit = checkBoolean(values, 'REQUIRE_PRECOMMIT');
  const installGlobalSkills = checkBoolean(values, 'INSTALL_GLOBAL_SKILLS');
  const trackTasksDirectory = checkBoolean(values, 'TRACK_TASKS_DIR');
  validateTasksDirectory(values.TASKS_DIR);
  if (values.BRANCH_STRATEGY === 'custom' && !(values.BRANCH_POLICY_FILE && existsSync(values.BRANCH_POLICY_FILE))) throw new Error('Custom strategy requires BRANCH_POLICY_FILE');
  const userRoot = options.userRoot ?? process.env.CODEX_WORKFLOW_USER_ROOT ?? process.env.HOME;
  installOrAdd({ command: 'install', target: projectRoot, kitRoot, catalogs: options.catalogs, sources: options.sources,
    settings: options.settings, dryRun: options.dryRun, modules: options.modules, profile: selection, userRoot,
    configuration: { projectName: values.PROJECT_NAME, tasksDirectory: values.TASKS_DIR, reportTimezone: values.REPORT_TIMEZONE,
      userRoot, installGlobalSkills, requirePrecommit, defaultBranch: values.DEFAULT_BRANCH, branchStrategy: values.BRANCH_STRATEGY,
      featureBranchPrefix: values.FEATURE_BRANCH_PREFIX },
    shellValues: Object.fromEntries(shellKeys.map(key => [key, values[key]])), branchPolicy: values.BRANCH_POLICY_FILE,
    kitVersion: readFileSync(join(kitRoot, 'VERSION'), 'utf8').trim() });
  if (!trackTasksDirectory && !options.dryRun) excludeFromGit(projectRoot, values.TASKS_DIR);
}

// A personal exclusion: unlike .gitignore, .git/info/exclude is never committed or shared.
function excludeFromGit(projectRoot, tasksDirectory) {
  const excludePath = resolve(projectRoot, git(['-C', projectRoot, 'rev-parse', '--git-path', 'info/exclude']));
  const pattern = `/${tasksDirectory}/`;
  const current = existsSync(excludePath) ? readFileSync(excludePath, 'utf8') : '';
  if (current.split('\n').includes(pattern)) return;
  mkdirSync(dirname(excludePath), { recursive: true });
  appendFileSync(excludePath, `${current && !current.endsWith('\n') ? '\n' : ''}${pattern}\n`);
  console.log(`EXCLUDE ${pattern} in ${excludePath}`);
}

async function update(options) {
  if (options.positional.length) throw new Error('update preserves selection and settings; use add for new modules');
  const updateOptions = { ...options, target: resolveTarget(options.target), kitRoot };
  if (options.dryRun || options.expectPlan) return updateKit(updateOptions);
  const { plan } = updateKit({ ...updateOptions, dryRun: true, showDiff: false });
  if (!options.yes) {
    if (!process.stdin.isTTY) throw new Error('Plan approval missing or stale; run update --dry-run and pass its exact --expect-plan fingerprint, or use --yes');
    const { answer } = await askAll([['answer', 'Apply this update? y|n', 'n']]);
    if (!/^y(es)?$/i.test(answer)) { console.log('Update cancelled; no files were written.'); return; }
  }
  updateKit({ ...updateOptions, expectPlan: plan, quiet: true });
  console.log('Workflow kit updated.');
}

async function main() {
  if (Number(process.versions.node.split('.')[0]) < 18) throw new Error('Node.js 18 or newer required');
  if (!git(['--version'])) throw new Error('Missing prerequisite: git');
  const [command = 'help', ...rest] = process.argv.slice(2);
  const options = parseArguments(rest);
  if (options.help || command === 'help' || command === '--help' || command === '-h') { console.log(usage); return; }
  if (['install', 'init'].includes(command) || command === 'add') {
    if (options.expectPlan || options.revision) throw new Error('--expect-plan and --revision are update-only options');
  }
  if (command === 'install' || command === 'init') {
    if (options.positional.length) throw new Error(`Unexpected argument: ${options.positional[0]}`);
    return install(options);
  }
  if (command === 'add') {
    const modules = [...(options.modules ?? []), ...options.positional];
    return installOrAdd({ ...options, command: 'add', target: resolveTarget(options.target), kitRoot, modules: modules.length ? modules : undefined });
  }
  if (command === 'update') return update(options);
  if (command === 'doctor') return doctor(resolveTarget(options.target), options.userRoot);
  if (command === 'list') {
    const { catalog } = loadCatalog(options.catalogs, options.sources);
    for (const { manifest } of catalog.values()) console.log(`${manifest.id}@${manifest.version}\t${manifest.description}`);
    return;
  }
  throw new Error(`Unknown command: ${command}\n\n${usage}`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
