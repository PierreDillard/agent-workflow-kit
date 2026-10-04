import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { assertKeys, readJson, safePath } from './paths.mjs';

export const officialModules = ['tasks', 'memory', 'continuity', 'quality', 'bugs', 'reporting', 'exploration', 'learning'];
const moduleIdPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const versionPattern = /^\d+\.\d+\.\d+$/;
const points = ['session-start', 'task-validation', 'before-handoff'];

export function validateManifest(manifest) {
  assertKeys(manifest, ['schemaVersion', 'id', 'version', 'description', 'requires', 'skills', 'files', 'rules', 'hooks', 'checks', 'config'], 'manifest');
  if (manifest.schemaVersion !== 1 || typeof manifest.id !== 'string' || manifest.id === 'core' || !moduleIdPattern.test(manifest.id) || (typeof manifest.version !== 'string' || !versionPattern.test(manifest.version)) ||
      typeof manifest.description !== 'string' || !manifest.description.trim()) throw new Error('Invalid module identity or schemaVersion');
  for (const field of ['skills', 'files', 'rules', 'hooks', 'checks']) {
    if (manifest[field] !== undefined && !Array.isArray(manifest[field])) throw new Error(`Invalid ${field}`);
  }
  assertKeys(manifest.requires ?? {}, Object.keys(manifest.requires ?? {}), 'requires');
  for (const [moduleId, version] of Object.entries(manifest.requires ?? {})) {
    if (!moduleIdPattern.test(moduleId) || (version !== '*' && !versionPattern.test(version))) throw new Error(`Invalid dependency: ${moduleId}`);
  }
  assertKeys(manifest.config ?? {}, Object.keys(manifest.config ?? {}), 'config');
  for (const [key, value] of Object.entries(manifest.config ?? {})) {
    if (!moduleIdPattern.test(key) || typeof value !== 'string') throw new Error(`Invalid config: ${key}`);
  }
  for (const skill of manifest.skills ?? []) {
    assertKeys(skill, ['name', 'source', 'global'], 'skill');
    if (typeof skill.name !== 'string' || !moduleIdPattern.test(skill.name) || typeof skill.source !== 'string' ||
        (skill.global !== undefined && typeof skill.global !== 'boolean')) throw new Error('Invalid skill');
  }
  for (const file of manifest.files ?? []) {
    assertKeys(file, ['source', 'target', 'editable'], 'file');
    if (typeof file.source !== 'string' || typeof file.target !== 'string' ||
        (file.editable !== undefined && typeof file.editable !== 'boolean')) throw new Error('Invalid file');
  }
  for (const rule of manifest.rules ?? []) {
    assertKeys(rule, ['id', 'source', 'point', 'when'], 'rule');
    if (typeof rule.id !== 'string' || !moduleIdPattern.test(rule.id) || typeof rule.source !== 'string' || !points.includes(rule.point)) throw new Error('Invalid rule');
  }
  for (const hook of manifest.hooks ?? []) {
    assertKeys(hook, ['id', 'path', 'runner', 'args', 'point', 'when'], 'hook');
    if (typeof hook.id !== 'string' || !moduleIdPattern.test(hook.id) || typeof hook.path !== 'string' || !['bash', 'node'].includes(hook.runner) ||
        hook.point !== 'session-start' || !Array.isArray(hook.args ?? []) ||
        (hook.args ?? []).some(argument => typeof argument !== 'string')) throw new Error('Invalid hook');
  }
  for (const group of [manifest.rules ?? [], manifest.hooks ?? []]) {
    const identifiers = new Set();
    for (const contribution of group) {
      if (identifiers.has(contribution.id)) throw new Error(`Duplicate contribution: ${contribution.id}`);
      identifiers.add(contribution.id);
      if (!Array.isArray(contribution.when ?? []) || (contribution.when ?? []).some(moduleId => typeof moduleId !== 'string' || !moduleIdPattern.test(moduleId))) throw new Error('Invalid condition');
    }
  }
  for (const check of manifest.checks ?? []) {
    assertKeys(check, ['path', 'type', 'maxBytes'], 'check');
    if (typeof check.path !== 'string' || !['file', 'json', 'timezone'].includes(check.type) ||
        (check.maxBytes !== undefined && (!Number.isInteger(check.maxBytes) || check.maxBytes < 1))) throw new Error('Invalid check');
  }
  return manifest;
}

export function loadCatalog(moduleDirectories, explicitSources) {
  const catalog = new Map();
  function addSource(source) {
    const directory = resolve(source);
    const manifest = validateManifest(readJson(safePath(directory, 'module.json')));
    if (catalog.has(manifest.id) && catalog.get(manifest.id).directory !== directory) throw new Error(`Duplicate module identity: ${manifest.id}`);
    catalog.set(manifest.id, { manifest, directory });
    return manifest.id;
  }
  for (const directory of moduleDirectories) {
    for (const name of readdirSync(directory).sort()) {
      const source = safePath(directory, name);
      if (existsSync(join(source, 'module.json'))) addSource(source);
    }
  }
  const explicit = explicitSources.map(addSource);
  return { catalog, explicit };
}

export function resolveModules(catalog, selected, installed = []) {
  const known = new Map(installed.map(module => [module.id, module]));
  const ordered = [];
  const visiting = new Set();
  const visited = new Set();
  function visit(moduleId, requiredVersion = '*') {
    const manifest = known.get(moduleId) ?? catalog.get(moduleId)?.manifest;
    if (!manifest) throw new Error(`Missing module dependency: ${moduleId}`);
    if (requiredVersion !== '*' && manifest.version !== requiredVersion) throw new Error(`Incompatible version: ${moduleId} requires ${requiredVersion}, found ${manifest.version}`);
    if (visiting.has(moduleId)) throw new Error(`Module dependency cycle: ${moduleId}`);
    if (visited.has(moduleId)) return;
    visiting.add(moduleId);
    for (const [dependency, version] of Object.entries(manifest.requires ?? {}).sort()) visit(dependency, version);
    visiting.delete(moduleId);
    visited.add(moduleId);
    ordered.push(manifest);
  }
  for (const moduleId of [...known.keys(), ...selected].sort()) visit(moduleId);
  return ordered;
}
