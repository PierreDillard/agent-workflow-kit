import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { doctor, sessionStart } from './doctor.mjs';
const projectRoot = process.env.WORKFLOW_PROJECT_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), '../..');
try {
  if (process.argv[2] === 'doctor') doctor(projectRoot, process.env.WORKFLOW_USER_ROOT);
  else if (process.argv[2] === 'session-start') sessionStart(projectRoot);
  else throw new Error('Expected doctor or session-start');
} catch (error) { console.error(error.message); process.exitCode = 1; }
