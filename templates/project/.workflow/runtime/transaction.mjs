import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, chmodSync, renameSync, unlinkSync, rmdirSync, rmSync, lstatSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { safePath, digest } from './paths.mjs';

// Materialize the complete plan before writing any destination. Roll back only our own writes.
export function applyPlan(entries, roots, options = {}) {
  const lockPath = safePath(roots.project, '.workflow-install.lock');
  if (existsSync(lockPath)) throw new Error('Another workflow installation is active; inspect .workflow-install.lock');
  if (options.dryRun) return applyUnlockedPlan(entries, roots, options);
  mkdirSync(lockPath);
  try { return applyUnlockedPlan(entries, roots, options); }
  finally { rmdirSync(lockPath); }
}

function applyUnlockedPlan(entries, roots, { dryRun = false, afterWrite = () => {} } = {}) {
  const targets = new Set();
  const changes = [];
  for (const entry of entries) {
    const destination = safePath(roots[entry.root], entry.path);
    if (targets.has(destination)) throw new Error(`Duplicate destination: ${destination}`);
    targets.add(destination);
    const exists = existsSync(destination);
    const original = exists ? readFileSync(destination) : null;
    const originalMode = exists ? lstatSync(destination).mode & 0o777 : null;
    if (exists && entry.expected === undefined) throw new Error(`Collision: ${destination}`);
    if (entry.expected !== undefined && (!exists || digest(original) !== entry.expected)) throw new Error(`Managed file changed: ${destination}`);
    if (exists && original.equals(entry.content) && originalMode === entry.mode) continue;
    changes.push({ ...entry, destination, original, originalMode });
  }
  for (const target of targets) {
    let parent = dirname(target);
    while (parent !== dirname(parent)) {
      if (targets.has(parent)) throw new Error(`File/directory destination conflict: ${parent}`);
      parent = dirname(parent);
    }
  }
  for (const change of changes) console.log(`${change.original === null ? 'CREATE' : 'UPDATE'} ${change.root}:${change.path}`);
  if (dryRun) { console.log('DRY RUN: no target files were written'); return; }
  const stagingRoot = mkdtempSync(join(tmpdir(), 'workflow-modules-'));
  const directories = [];
  const written = [];
  const temporaryFiles = [];
  function ensureDirectory(directory) {
    if (existsSync(directory)) return;
    ensureDirectory(dirname(directory));
    mkdirSync(directory);
    directories.push(directory);
  }
  try {
    changes.forEach((change, index) => writeFileSync(join(stagingRoot, String(index)), change.content));
    for (const [index, change] of changes.entries()) {
      // Recheck just before mutation, including destination parents, to detect concurrent changes.
      safePath(roots[change.root], change.path);
      const exists = existsSync(change.destination);
      if ((change.original === null && exists) || (change.original !== null && (!exists ||
          !readFileSync(change.destination).equals(change.original)))) throw new Error(`Concurrent change: ${change.destination}`);
      ensureDirectory(dirname(change.destination));
      const temporaryPath = `${change.destination}.workflow-${process.pid}-${index}`;
      writeFileSync(temporaryPath, readFileSync(join(stagingRoot, String(index))), { flag: 'wx', mode: change.mode });
      temporaryFiles.push(temporaryPath);
      chmodSync(temporaryPath, change.mode);
      renameSync(temporaryPath, change.destination);
      written.push(change);
      afterWrite(written.length);
    }
  } catch (error) {
    for (const change of written.reverse()) {
      if (change.original === null) unlinkSync(change.destination);
      else { writeFileSync(change.destination, change.original); chmodSync(change.destination, change.originalMode); }
    }
    for (const path of temporaryFiles) if (existsSync(path)) unlinkSync(path);
    for (const directory of directories.reverse()) rmdirSync(directory);
    throw error;
  } finally { rmSync(stagingRoot, { recursive: true, force: true }); }
}
