import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { checkState, loadState } from './doctor.mjs';
import { loadVerificationCommands, verificationCommands } from './verification-config.mjs';

function elapsed(started) {
  return Math.round(performance.now() - started);
}

function runCommand(projectRoot, command, timeoutMs) {
  return new Promise(resolve => {
    const started = performance.now();
    const child = spawn('bash', ['-c', command], {
      cwd: projectRoot,
      detached: true,
      stdio: ['ignore', process.stderr, process.stderr],
      env: { ...process.env, BASH_ENV: '' },
    });
    function stopProcessGroup() {
      if (!child.pid) return;
      try { process.kill(-child.pid, 'SIGKILL'); }
      catch (error) { if (error.code !== 'ESRCH') throw error; }
    }
    let timeout = false;
    let interrupted = null;
    function interrupt(signal) {
      interrupted = signal;
      stopProcessGroup();
    }
    process.on('SIGINT', interrupt);
    process.on('SIGTERM', interrupt);
    const timer = setTimeout(() => { timeout = true; stopProcessGroup(); }, timeoutMs);
    function finish(result) {
      clearTimeout(timer);
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', interrupt);
      stopProcessGroup();
      resolve({ ...result, durationMs: elapsed(started) });
    }
    child.once('error', error => finish({ status: 'error', message: error.message }));
    child.once('exit', (code, signal) => {
      if (interrupted) return finish({ status: 'interrupted', signal: interrupted });
      if (timeout) return finish({ status: 'timeout' });
      finish({ status: code === 0 ? 'pass' : 'fail', code, signal });
    });
  });
}

function checkInstallation(projectRoot, userRoot) {
  const started = performance.now();
  try {
    const { state } = loadState(projectRoot);
    const warnings = checkState(state, { project: projectRoot, user: userRoot ?? state.configuration.userRoot });
    return { status: 'pass', warnings, durationMs: elapsed(started) };
  } catch (error) {
    return { status: 'fail', message: error.message, durationMs: elapsed(started) };
  }
}

export async function verify(projectRoot, { config, integrity, json, timeout = '300', userRoot } = {}) {
  const budgetSeconds = Number(timeout);
  if (!/^\d+$/.test(timeout) || !Number.isSafeInteger(budgetSeconds) || budgetSeconds < 1 || budgetSeconds > 86400) {
    throw new Error('--timeout must be a number of seconds between 1 and 86400');
  }

  const started = performance.now();
  const results = [];
  if (integrity) results.push({ name: 'integrity', ...checkInstallation(projectRoot, userRoot) });
  const values = results[0]?.status === 'fail' ? {} : loadVerificationCommands(projectRoot, config);
  const checks = Object.entries(verificationCommands)
    .filter(([key]) => values[key]?.trim())
    .map(([key, name]) => ({ name, command: values[key] }));
  let interrupted = false;
  for (const { name, command } of checks) {
    const remaining = budgetSeconds * 1000 - elapsed(started);
    const result = interrupted || remaining <= 0
      ? { status: 'skipped', message: interrupted ? 'Verification interrupted' : 'Time budget exhausted' }
      : await runCommand(projectRoot, command, remaining);
    results.push({ name, ...result });
    interrupted ||= result.status === 'interrupted';
  }

  const passed = results.length > 0 && results.every(result => result.status === 'pass');
  if (json) console.log(JSON.stringify({ schemaVersion: 1, passed, results }, null, 2));
  else {
    for (const { name, status, durationMs, code, signal, message, warnings = [] } of results) {
      const details = [durationMs === undefined ? null : durationMs + ' ms',
        code ? 'exit ' + code : signal, message].filter(Boolean);
      console.log(status.toUpperCase().padEnd(11) + name + (details.length ? ' (' + details.join(', ') + ')' : ''));
      for (const warning of warnings) console.log('WARN       ' + warning);
    }
    if (!results.length) console.log('No checks configured. Use --config FILE or --integrity.');
    else console.log(results.filter(result => result.status === 'pass').length + '/' + results.length + ' checks passed');
  }
  process.exitCode = passed ? 0 : 1;
}
