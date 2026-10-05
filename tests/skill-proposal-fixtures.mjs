import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync, lstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export const kitRoot = resolve(new URL('..', import.meta.url).pathname);

export function command(executable, argumentsList) {
  const result = spawnSync(executable, argumentsList, { cwd: kitRoot, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout;
}

export function snapshot(directory) {
  const files = {};
  function visit(currentPath) {
    for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const entryPath = join(currentPath, entry.name);
      const mode = lstatSync(entryPath).mode & 0o777;
      if (entry.isDirectory()) { files[entryPath] = `directory:${mode}`; visit(entryPath); }
      else files[entryPath] = `${mode}:${readFileSync(entryPath).toString('base64')}`;
    }
  }
  visit(directory);
  return files;
}

export function fixture(context) {
  const root = mkdtempSync(join(tmpdir(), 'workflow-skill-proposal-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const project = join(root, 'project with spaces');
  const user = join(root, 'user');
  const draft = join(root, 'draft');
  mkdirSync(project); mkdirSync(user); mkdirSync(join(draft, 'skills', 'fixture-guide', 'references'), { recursive: true });
  command('git', ['-C', project, 'init', '-q']);
  const config = join(root, 'config.env');
  writeFileSync(config, 'PROJECT_NAME=Skill fixture\nTASKS_DIR=planning/tasks\nINSTALL_GLOBAL_SKILLS=false\n');
  command('bash', ['install.sh', '--target', project, '--user-root', user, '--non-interactive', '--config', config]);
  const skillText = '---\nname: fixture-guide\ndescription: Creates fixture review notes. Use when testing skill proposals.\n---\n\nRead [the reference](references/example.md) before drafting a note.\n';
  writeFileSync(join(draft, 'skills/fixture-guide/SKILL.md'), skillText);
  writeFileSync(join(draft, 'skills/fixture-guide/references/example.md'), 'A fixture note must cite its input.\n');
  writeFileSync(join(draft, 'module.json'), JSON.stringify({ schemaVersion: 1, id: 'fixture-guide', version: '1.0.0',
    description: 'Fixture skill approval', skills: [{ name: 'fixture-guide', source: 'skills/fixture-guide' }] }));
  return { root, project, user, draft, skillText, kitRoot,
    proposalOptions: { target: project, id: 'fixture-guide', source: draft, kitRoot,
      need: 'Fixture note provenance is not covered', actions: 'Read input and draft notes', prerequisites: 'None' } };
}


export function runtimeCall(setup, operation, options, expectedSuccess = true) {
  const program = `const runtime = await import(process.argv[1]);
    const operation = process.argv[2];
    const options = JSON.parse(process.argv[3]);
    try {
      const result = operation === 'presentSkill' ? runtime.presentSkill(options.target, options.id) : runtime[operation](options);
      console.log('WORKFLOW_RESULT:' + JSON.stringify(result));
    } catch (error) { console.error(error.message); process.exitCode = 1; }`;
  const result = spawnSync('node', ['--input-type=module', '-e', program,
    join(setup.project, '.workflow/runtime/skill-proposals.mjs'), operation,
    JSON.stringify({ target: setup.project, id: 'fixture-guide', kitRoot, ...options })], { encoding: 'utf8' });
  if (!expectedSuccess) { assert.notEqual(result.status, 0, result.stdout); return result.stderr; }
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return JSON.parse(result.stdout.split('\n').find(line => line.startsWith('WORKFLOW_RESULT:')).slice('WORKFLOW_RESULT:'.length));
}
