import { existsSync, readFileSync } from 'node:fs';
import { safePath } from './paths.mjs';

export const pointerPattern = /<!-- workflow-kit:start -->[\s\S]*?<!-- workflow-kit:end -->/;

// Everything the kit owns lives in the task directory; only agent discovery points stay outside.
export function layoutFor(tasksDirectory) {
  const kit = `${tasksDirectory}/.workflow`;
  return { legacy: false, kit, inventory: `${kit}/kit.json`, environment: `${kit}/kit.env`,
    rules: `${kit}/PROJECT_RULES.md`, components: `${kit}/components.tsv`, baseRules: `${kit}/base-rules.md`,
    branchPolicy: `${kit}/branch-policy.md`, runtime: `${kit}/runtime`, scripts: `${kit}/scripts`, hooks: `${kit}/hooks` };
}

// Root-level layout of 0.1 installations, kept only to locate and migrate them.
export const legacyLayout = { legacy: true, kit: '.workflow', inventory: '.workflow-kit.json', environment: '.workflow-kit.env',
  rules: '.workflow/PROJECT_RULES.md', components: '.workflow/components.tsv', baseRules: '.workflow/base-rules.md',
  branchPolicy: '.workflow/branch-policy.md', runtime: '.workflow/runtime', scripts: '.claude/scripts', hooks: '.claude/hooks' };

export function pointerBlock(layout) {
  return `<!-- workflow-kit:start -->\nWorkflow authority: [${layout.rules}](<${layout.rules}>).\n` +
    `Read \`${layout.environment}\` and the installed module rules; load only relevant context.\n<!-- workflow-kit:end -->`;
}

export function validateTasksDirectory(tasksDirectory) {
  if (typeof tasksDirectory !== 'string' || !tasksDirectory || tasksDirectory.startsWith('/') ||
      tasksDirectory.split('/').some(part => !part || part === '.' || part === '..') ||
      /["$`\\()<>[\]\x00-\x1f]/.test(tasksDirectory)) throw new Error('TASKS_DIR must be a safe relative path');
  const first = tasksDirectory.split('/')[0];
  if (['.git', '.claude', '.codex', '.workflow'].includes(first)) throw new Error('TASKS_DIR cannot overlap workflow or repository metadata');
  return tasksDirectory;
}

// The CLAUDE.md/AGENTS.md pointer names the kit directory, so a custom TASKS_DIR needs no extra flag.
export function locateInstallation(projectRoot) {
  if (existsSync(safePath(projectRoot, legacyLayout.inventory))) return legacyLayout;
  const candidates = [];
  for (const filename of ['CLAUDE.md', 'AGENTS.md']) {
    const path = safePath(projectRoot, filename);
    const block = existsSync(path) ? readFileSync(path, 'utf8').match(pointerPattern)?.[0] : undefined;
    const match = block?.match(/\]\(<?([^()<>]+?)\/PROJECT_RULES\.md>?\)/);
    if (match) candidates.push(match[1]);
  }
  candidates.push('tasks/.workflow');
  for (const kit of candidates) {
    if (!kit.endsWith('/.workflow')) continue;
    const tasksDirectory = kit.slice(0, -'/.workflow'.length);
    try { validateTasksDirectory(tasksDirectory); } catch { continue; }
    if (existsSync(safePath(projectRoot, `${kit}/kit.json`))) return layoutFor(tasksDirectory);
  }
  return null;
}
