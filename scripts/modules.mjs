import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { updateKit } from '../templates/project/.workflow/runtime/update.mjs';
import { installOrAdd } from '../templates/project/.workflow/runtime/manage.mjs';
import { loadCatalog } from '../templates/project/.workflow/runtime/catalog.mjs';

const kitRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argumentsList = process.argv.slice(2);
const command = argumentsList.shift();
const options = { command, kitRoot, catalogs: [join(kitRoot, 'modules')], sources: [], settings: {}, dryRun: false };
try {
  if (!['install', 'add', 'list', 'update'].includes(command)) throw new Error('Usage: module.sh add|list|update --target PATH [--module PATH] [--modules id,id] [--catalog PATH] [--set module.key=value] [--dry-run]');
  while (argumentsList.length) {
    const flag = argumentsList.shift();
    if (flag === '--dry-run') { options.dryRun = true; continue; }
    const value = argumentsList.shift();
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    if (flag === '--target') options.target = value;
    else if (flag === '--expect-plan') options.expectPlan = value;
    else if (flag === '--revision') options.revision = value;
    else if (flag === '--user-root') options.userRoot = value;
    else if (flag === '--profile') options.profile = value;
    else if (flag === '--modules') options.modules = value.split(',');
    else if (flag === '--module') options.sources.push(value);
    else if (flag === '--catalog') options.catalogs.push(value);
    else if (flag === '--set') {
      const separator = value.indexOf('=');
      if (separator < 1) throw new Error('Setting must be module.key=value');
      options.settings[value.slice(0, separator)] = value.slice(separator + 1);
    } else throw new Error(`Unknown argument: ${flag}`);
  }
  if (command === 'list') {
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
    if (command === 'update') updateKit(options);
    else {
      if (options.expectPlan || options.revision) throw new Error('--expect-plan and --revision are update-only options');
      installOrAdd(options);
    }
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
