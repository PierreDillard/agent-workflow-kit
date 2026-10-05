import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { loadState, checkState } from '../templates/project/.workflow/runtime/doctor.mjs';
import { safePath } from '../templates/project/.workflow/runtime/paths.mjs';
import { installOrAdd } from '../templates/project/.workflow/runtime/manage.mjs';
import { loadCatalog } from '../templates/project/.workflow/runtime/catalog.mjs';
import { selectCatalogSkills } from './skill-selection.mjs';
import { inspectModule } from './module-inspection.mjs';

const kitRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argumentsList = process.argv.slice(2);
const command = argumentsList.shift();
const options = { command, kitRoot, catalogs: [join(kitRoot, 'modules')], sources: [], settings: {}, dryRun: false };
try {
  if (!['install', 'add', 'list', 'select', 'inspect'].includes(command)) throw new Error('Usage: module.sh inspect --module PATH | select --skills name,name [--target PATH] | add|list --target PATH [--module PATH] [--modules id,id] [--catalog PATH] [--set module.key=value] [--dry-run]');
  while (argumentsList.length) {
    const flag = argumentsList.shift();
    if (flag === '--dry-run') { options.dryRun = true; continue; }
    const value = argumentsList.shift();
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    if (flag === '--target') options.target = value;
    else if (flag === '--user-root') options.userRoot = value;
    else if (flag === '--profile') options.profile = value;
    else if (flag === '--modules') options.modules = value.split(',');
    else if (flag === '--skills') options.skills = value.split(',');
    else if (flag === '--module') options.sources.push(value);
    else if (flag === '--catalog') options.catalogs.push(value);
    else if (flag === '--set') {
      const separator = value.indexOf('=');
      if (separator < 1) throw new Error('Setting must be module.key=value');
      options.settings[value.slice(0, separator)] = value.slice(separator + 1);
    } else throw new Error(`Unknown argument: ${flag}`);
  }
  if (options.skills && command !== 'select') throw new Error('--skills is only supported by select');
  if (command === 'inspect') {
    if (options.sources.length !== 1 || options.catalogs.length !== 1 || options.modules || options.profile ||
        options.target || options.userRoot || options.dryRun || Object.keys(options.settings).length) {
      throw new Error('inspect accepts exactly one --module');
    }
    console.log(JSON.stringify(inspectModule(options.sources[0]), null, 2));
  } else if (command === 'select') {
    if (options.catalogs.length !== 1 || options.sources.length) throw new Error('select uses the official catalog only');
    if (options.modules || options.profile || options.userRoot || options.dryRun || Object.keys(options.settings).length) {
      throw new Error('select accepts --skills and optional --target');
    }
    const { catalog } = loadCatalog(options.catalogs, []);
    let installedState = null;
    if (options.target) {
      const projectRoot = resolve(options.target);
      const gitRoot = execFileSync('git', ['-C', projectRoot, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
      if (gitRoot !== projectRoot) throw new Error('Target must be a Git repository root');
      if (existsSync(safePath(projectRoot, '.workflow-kit.json'))) {
        installedState = loadState(projectRoot);
        checkState(installedState, { project: projectRoot, user: process.env.WORKFLOW_USER_ROOT ?? installedState.configuration.userRoot });
      }
    }
    const proposal = selectCatalogSkills(catalog, options.skills, installedState);
    console.log(JSON.stringify(proposal, null, 2));
    if (!proposal.isComplete) process.exitCode = 1;
  } else if (command === 'list') {
    const { catalog } = loadCatalog(options.catalogs, options.sources);
    for (const { manifest } of catalog.values()) console.log(`${manifest.id}@${manifest.version}\t${manifest.description}`);
  } else {
    if (!options.target) throw new Error('--target is required');
    if (command === 'install') {
      const environment = process.env;
      options.configuration = {
        projectName: environment.PROJECT_NAME, tasksDirectory: environment.TASKS_DIR,
        reportTimezone: environment.REPORT_TIMEZONE, userRoot: options.userRoot ?? environment.HOME,
        installGlobalSkills: environment.INSTALL_GLOBAL_SKILLS === 'true', requirePrecommit: environment.REQUIRE_PRECOMMIT === 'true',
        defaultBranch: environment.DEFAULT_BRANCH, branchStrategy: environment.BRANCH_STRATEGY,
        featureBranchPrefix: environment.FEATURE_BRANCH_PREFIX,
      };
      options.shellValues = Object.fromEntries(['PROJECT_NAME', 'TASKS_DIR', 'DEFAULT_BRANCH', 'BRANCH_STRATEGY', 'FEATURE_BRANCH_PREFIX',
        'DEV_COMMAND', 'BUILD_COMMAND', 'TEST_COMMAND', 'LINT_COMMAND', 'TYPECHECK_COMMAND', 'REQUIRE_PRECOMMIT', 'INSTALL_GLOBAL_SKILLS'].map(key => [key, environment[key] ?? '']));
      options.branchPolicy = environment.BRANCH_POLICY_FILE;
      options.kitVersion = readFileSync(join(kitRoot, 'VERSION'), 'utf8').trim();
    }
    installOrAdd(options);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
