import { readFileSync } from 'node:fs';
import { locateInstallation } from './layout.mjs';
import { safePath } from './paths.mjs';

export const verificationCommands = Object.freeze({
  TYPECHECK_COMMAND: 'typecheck',
  LINT_COMMAND: 'lint',
  TEST_COMMAND: 'test',
  BUILD_COMMAND: 'build',
  ACCEPTANCE_COMMAND: 'acceptance',
});

export function loadVerificationCommands(projectRoot, config) {
  const layout = config === undefined ? locateInstallation(projectRoot) : null;
  if (!layout && config === undefined) return {};
  const path = config ?? safePath(projectRoot, layout.environment);
  const values = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const separator = line.indexOf('=');
    const key = line.slice(0, separator < 0 ? line.length : separator);
    if (!Object.hasOwn(verificationCommands, key)) continue;
    if (separator < 0 || Object.hasOwn(values, key)) throw new Error('Invalid or repeated ' + key + ' in ' + path);
    const value = line.slice(separator + 1);
    if (config !== undefined || !value.startsWith("'")) {
      values[key] = value;
    } else {
      // Decode the literal quoting used by init. Never source the environment file.
      if (!/^'[^']*'(?:\\''[^']*')*$/.test(value)) throw new Error('Invalid ' + key + ' in ' + path);
      values[key] = value.slice(1, -1).replaceAll("'\\''", "'");
    }
  }
  return values;
}
