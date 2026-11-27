import { execFileSync } from 'node:child_process';
import { loadState } from './doctor.mjs';
import { pointerPattern } from './layout.mjs';
import { digest, safePath } from './paths.mjs';
import { validateRefinementRecord } from './refinement-record.mjs';

function git(projectRoot, args, options = {}) {
  try {
    return execFileSync('git', ['--no-replace-objects', '-C', projectRoot, ...args], { encoding: 'utf8', ...options });
  } catch (error) {
    throw new Error('git ' + args[0] + ' failed' + (error.stderr?.trim() ? ': ' + error.stderr.trim() : ''), { cause: error });
  }
}

function parent(projectRoot, commit) {
  const [identity, ...parents] = git(projectRoot, ['rev-list', '--parents', '-n', '1', commit]).trim().split(' ');
  if (identity !== commit || parents.length !== 1) throw new Error('Expected a single-parent commit: ' + commit);
  return parents[0];
}

function changes(projectRoot, before, after) {
  const fields = git(projectRoot, ['diff-tree', '-r', '--name-status', '--no-renames', '-z', before, after]).split('\0');
  const changed = [];
  for (let index = 0; index + 1 < fields.length; index += 2) {
    changed.push({ status: fields[index], path: fields[index + 1] });
  }
  return changed;
}

function readMarkdown(projectRoot, commit, path) {
  const entry = git(projectRoot, ['ls-tree', commit, '--', path]);
  if (!entry.startsWith('100644 blob ')) throw new Error('Expected a regular non-executable file: ' + path);
  const content = git(projectRoot, ['show', commit + ':' + path]);
  if (content.includes('\0')) throw new Error('Expected a text file: ' + path);
  return content;
}

function checkCandidate(projectRoot, state, baseline, candidate) {
  const files = changes(projectRoot, baseline, candidate);
  const rulePath = /^(?:AGENTS\.md|CLAUDE\.md)$/;
  const skillPath = /^\.(?:claude|codex)\/skills\/[a-z0-9-]+\/SKILL\.md$/;
  if (!files.length || files.length > 2 || files.some(({ status, path }) =>
    status !== 'M' || (!rulePath.test(path) && !skillPath.test(path)) ||
    state.files.some(file => file.root === 'project' && file.path === path && !file.editable))) {
    throw new Error('A candidate may only modify one project-owned rule or skill and its client counterpart');
  }
  if (files.length === 2) {
    const paths = files.map(file => file.path);
    if (!(paths.every(path => rulePath.test(path)) ||
          (paths.every(path => skillPath.test(path)) && paths[0].split('/')[2] === paths[1].split('/')[2]))) {
      throw new Error('Both changes must address the same rule or skill across clients');
    }
  }
  for (const { path } of files) {
    safePath(projectRoot, path);
    const before = readMarkdown(projectRoot, baseline, path);
    const after = readMarkdown(projectRoot, candidate, path);
    if (rulePath.test(path) && (before.match(pointerPattern)?.[0] !== after.match(pointerPattern)?.[0] ||
      [...after.matchAll(/<!-- workflow-kit:(?:start|end) -->/g)].length !==
      [...before.matchAll(/<!-- workflow-kit:(?:start|end) -->/g)].length)) {
      throw new Error('The kit pointer must stay intact: ' + path);
    }
  }
  return files.map(file => file.path);
}

export function refine(projectRoot, { action, record, tip, approvePlan }) {
  const { state, layout } = loadState(projectRoot);
  if (layout.legacy || !state.modules.some(module => module.id === 'quality')) {
    throw new Error('Refinement requires a current installation with the quality module');
  }
  if (!['plan', 'promote'].includes(action) || (action === 'plan' && approvePlan !== undefined)) {
    throw new Error('Expected refine plan or refine promote');
  }
  const directory = state.configuration.tasksDirectory + '/refinements/';
  if (typeof record !== 'string' || !record.startsWith(directory) ||
      !/^[a-z0-9-]+\.json$/.test(record.slice(directory.length))) {
    throw new Error('Use --record ' + directory + '<name>.json');
  }
  safePath(projectRoot, record);
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(tip ?? '')) throw new Error('Use --tip with the full evidence commit SHA');

  const candidate = parent(projectRoot, tip);
  const baseline = parent(projectRoot, candidate);
  const evidenceChanges = changes(projectRoot, candidate, tip);
  if (evidenceChanges.length !== 1 || evidenceChanges[0].status !== 'M' || evidenceChanges[0].path !== record) {
    throw new Error('The evidence commit must modify only the registered record');
  }
  const paths = checkCandidate(projectRoot, state, baseline, candidate);
  validateRefinementRecord(JSON.parse(readMarkdown(projectRoot, baseline, record)),
    JSON.parse(readMarkdown(projectRoot, tip, record)), baseline, candidate);

  const head = git(projectRoot, ['rev-parse', 'HEAD']).trim();
  if (head !== baseline) throw new Error('The integration branch has moved; rerun the comparison on its current baseline');
  const branch = git(projectRoot, ['branch', '--show-current']).trim();
  if (!branch || branch === state.configuration.defaultBranch) {
    throw new Error('Use a named integration branch other than the configured default branch');
  }
  const plan = digest(JSON.stringify({ schemaVersion: 1, branch, baseline, tip, record }));
  if (action === 'plan') {
    console.log(JSON.stringify({ schemaVersion: 1, branch, baseline, candidate, tip, record, paths, plan }, null, 2));
    return;
  }

  if (approvePlan !== plan) throw new Error('Human approval required for the exact plan; use --approve-plan');
  if (git(projectRoot, ['status', '--porcelain=v1', '--untracked-files=all', '--ignore-submodules=none']).trim()) {
    throw new Error('Promotion requires a clean integration worktree');
  }
  git(projectRoot, ['merge', '--ff-only', '--no-autostash', '--no-overwrite-ignore', tip], { stdio: 'inherit' });
  console.log('Promoted ' + candidate + '; revert that commit to roll back the rule change.');
}
