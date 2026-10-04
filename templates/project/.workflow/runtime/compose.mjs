import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { digest, readTree, safePath } from './paths.mjs';

const reservedTargets = ['.workflow', '.git', '.workflow-kit.env', '.workflow-kit.json', 'CLAUDE.md', 'AGENTS.md', '.claude/settings.json', '.codex/hooks.json'];

function render(content, variables, path) {
  function replace(text) {
    return text.replace(/\{\{([^{}]+)\}\}/g, (_, name) => {
      if (!Object.hasOwn(variables, name)) throw new Error(`Unknown placeholder: ${name}`);
      return variables[name];
    });
  }
  if (path.endsWith('.json')) {
    function walk(value) {
      if (typeof value === 'string') return replace(value);
      if (Array.isArray(value)) return value.map(walk);
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [replace(key), walk(child)]));
      return value;
    }
    return Buffer.from(JSON.stringify(walk(JSON.parse(content)), null, 2) + '\n');
  }
  if (!content.includes('{{')) return content;
  return Buffer.from(replace(new TextDecoder('utf-8', { fatal: true }).decode(content)));
}

export function materializeModule(source, configuration, settings) {
  const manifest = source.manifest;
  const entries = [];
  const variables = { TASKS_DIR: configuration.tasksDirectory, REPORT_TIMEZONE: configuration.reportTimezone };
  const moduleSettings = { ...(manifest.config ?? {}) };
  for (const [key, value] of Object.entries(settings)) {
    if (!key.startsWith(`${manifest.id}.`)) continue;
    const setting = key.slice(manifest.id.length + 1);
    if (!(setting in moduleSettings)) throw new Error(`Unknown module setting: ${key}`);
    moduleSettings[setting] = value;
  }
  for (const [key, value] of Object.entries(moduleSettings)) variables[`${manifest.id}.${key}`] = value;
  const expandPath = path => render(Buffer.from(path), variables, '').toString();
  function addFile(file, target, editable = false, root = 'project') {
    safePath('/', target);
    entries.push({ root, path: target, content: render(file.content, variables, target), mode: file.mode,
      owner: manifest.id, editable });
  }
  const components = [];
  for (const skill of manifest.skills ?? []) {
    const files = readTree(source.directory, skill.source);
    if (!files.some(file => file.path === `${skill.source}/SKILL.md`)) throw new Error(`Missing SKILL.md: ${skill.name}`);
    const frontmatter = files.find(file => file.path === `${skill.source}/SKILL.md`).content.toString();
    if (!frontmatter.startsWith('---\n') || !new RegExp(`^name: ${skill.name}$`, 'm').test(frontmatter) || !/^description: .+/m.test(frontmatter)) throw new Error(`Invalid skill frontmatter: ${skill.name}`);
    for (const file of files) {
      const relativePath = file.path.slice(skill.source.length + 1);
      for (const client of ['.claude', '.codex']) {
        addFile(file, `${client}/skills/${skill.name}/${relativePath}`);
        if (skill.global && configuration.installGlobalSkills) addFile(file, `${client}/skills/${skill.name}/${relativePath}`, false, 'user');
      }
    }
    components.push({ name: skill.name, class: 'project-template' });
  }
  for (const mapping of manifest.files ?? []) {
    const files = readTree(source.directory, mapping.source);
    const isSingleFile = files.length === 1 && files[0].path === mapping.source;
    const target = expandPath(mapping.target);
    if (reservedTargets.some(reserved => target === reserved || target.startsWith(`${reserved}/`)) ||
        target.startsWith('.claude/skills/') || target.startsWith('.codex/skills/')) throw new Error(`Reserved target: ${target}`);
    if (!(target.startsWith(`${configuration.tasksDirectory}/`) || target.startsWith('.claude/scripts/') ||
          target.startsWith('.claude/agents/'))) throw new Error(`Target outside managed destinations: ${target}`);
    for (const file of files) {
      const destination = isSingleFile ? target : posix.join(target, file.path.slice(mapping.source.length + 1));
      addFile(file, destination, mapping.editable ?? false);
      if (destination.startsWith('.claude/agents/') && destination.endsWith('.md')) components.push({ name: posix.basename(destination, '.md'), class: 'project-agent' });
    }
  }
  const rules = (manifest.rules ?? []).map(rule => {
    const path = `.workflow/modules/${manifest.id}/rules/${rule.id}.md`;
    addFile({ content: readFileSync(safePath(source.directory, rule.source)), mode: 0o644 }, path);
    return { id: rule.id, path, point: rule.point, when: rule.when ?? [] };
  });
  const hooks = (manifest.hooks ?? []).map(hook => ({ ...hook, path: expandPath(hook.path), args: (hook.args ?? []).map(expandPath) }));
  for (const hook of hooks) if (!entries.some(entry => entry.root === 'project' && entry.path === hook.path && !entry.editable)) throw new Error(`Hook must reference a module-owned managed file: ${hook.path}`);
  const checks = (manifest.checks ?? []).map(check => ({ ...check, path: expandPath(check.path) }));
  for (const check of checks) if (!entries.some(entry => entry.root === 'project' && entry.path === check.path)) throw new Error(`Check must reference an owned file: ${check.path}`);
  const fingerprint = digest(JSON.stringify(manifest) + entries.map(entry => `${entry.root}:${entry.path}:${entry.mode}:${digest(entry.content)}`).join('\n'));
  return { entries, module: { id: manifest.id, version: manifest.version, requires: manifest.requires ?? {}, rules, hooks, checks,
    components, settings: moduleSettings, fingerprint } };
}

export function composeRules(modules, getContent) {
  const activeIds = new Set(modules.map(module => module.id));
  const base = getContent('.workflow/base-rules.md').toString();
  const sections = [base, `\n## Installed modules\n\n${modules.map(module => `${module.id}@${module.version}`).join(', ')}\n`];
  for (const point of ['session-start', 'task-validation', 'before-handoff']) {
    const rules = modules.flatMap(module => module.rules.filter(rule => rule.point === point &&
      (rule.when ?? []).every(moduleId => activeIds.has(moduleId))).map(rule => ({ ...rule, moduleId: module.id })));
    if (!rules.length) continue;
    sections.push(`\n## ${point}\n`);
    for (const rule of rules) sections.push(`\n<!-- module:${rule.moduleId}/${rule.id} -->\n${getContent(rule.path).toString()}\n`);
  }
  return Buffer.from(sections.join(''));
}

export function composeComponents(modules) {
  const components = new Map(['branch-router', 'project-workflow', 'workflow-doctor'].map(name => [name, 'project-template']));
  for (const module of modules) for (const component of module.components) {
    if (components.has(component.name)) throw new Error(`Duplicate skill: ${component.name}`);
    components.set(component.name, component.class);
  }
  return Buffer.from('component\tclass\tdependencies\tpurpose\n' + [...components].map(([name, classification]) => `${name}\t${classification}\t-\tModule-managed component`).join('\n') + '\n');
}
