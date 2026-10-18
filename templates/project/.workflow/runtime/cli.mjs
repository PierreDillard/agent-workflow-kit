import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpSync, readFileSync, rmSync } from 'node:fs';
import { doctor, sessionStart } from './doctor.mjs';
import { readJson, safePath } from './paths.mjs';

// The runtime lives in <project>/<TASKS_DIR>/.workflow/runtime; the inventory names TASKS_DIR.
const kitDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function projectRootOf() {
  if (process.env.WORKFLOW_PROJECT_ROOT) return process.env.WORKFLOW_PROJECT_ROOT;
  const { configuration } = readJson(join(kitDirectory, 'kit.json'));
  return resolve(kitDirectory, '..', ...configuration.tasksDirectory.split('/').map(() => '..'));
}

// Codex mirrors are exact copies of the managed Claude skills; unmanaged skills are left alone.
function syncSkills(projectRoot) {
  const rows = readFileSync(join(kitDirectory, 'components.tsv'), 'utf8').trim().split('\n').slice(1);
  for (const [name, classification] of rows.map(row => row.split('\t'))) {
    if (classification !== 'project-template') continue;
    const target = safePath(projectRoot, `.codex/skills/${name}`);
    rmSync(target, { recursive: true, force: true });
    cpSync(safePath(projectRoot, `.claude/skills/${name}`), target, { recursive: true, preserveTimestamps: true });
  }
  console.log('Managed Codex skill mirrors synchronized; unmanaged skills preserved.');
}

try {
  const projectRoot = projectRootOf();
  if (process.argv[2] === 'doctor') doctor(projectRoot, process.env.WORKFLOW_USER_ROOT);
  else if (process.argv[2] === 'session-start') sessionStart(projectRoot);
  else if (process.argv[2] === 'sync-skills') syncSkills(projectRoot);
  else throw new Error('Expected doctor, session-start or sync-skills');
} catch (error) { console.error(error.message); process.exitCode = 1; }
