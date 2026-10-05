import { readFileSync } from 'node:fs';
import { resolveModules } from '../templates/project/.workflow/runtime/catalog.mjs';
import { materializeModule } from '../templates/project/.workflow/runtime/compose.mjs';
import { safePath } from '../templates/project/.workflow/runtime/paths.mjs';

// Produce a proposal only. Installation remains owned by installOrAdd.
export function selectCatalogSkills(catalog, requestedSkills, installedState = null) {
  if (!requestedSkills?.length || requestedSkills.some(skillName => !skillName)) {
    throw new Error('select requires --skills name,name');
  }
  const selectedSkills = [...new Set(requestedSkills)].sort();
  const owners = new Map();
  for (const { manifest } of catalog.values()) {
    for (const skill of manifest.skills ?? []) {
      if (owners.has(skill.name)) throw new Error(`Ambiguous skill owner: ${skill.name}`);
      owners.set(skill.name, manifest.id);
    }
  }
  const unresolvedSkills = selectedSkills.filter(skillName => !owners.has(skillName));
  const requestedModules = [...new Set(selectedSkills.filter(skillName => owners.has(skillName))
    .map(skillName => owners.get(skillName)))].sort();
  const installedModules = new Map((installedState?.modules ?? []).map(module => [module.id, module]));
  const modules = resolveModules(catalog, requestedModules).map(manifest => {
    const source = catalog.get(manifest.id);
    const installedModule = installedModules.get(manifest.id);
    if (installedModule) {
      const settings = Object.fromEntries(Object.entries(installedModule.settings)
        .map(([key, value]) => [`${manifest.id}.${key}`, value]));
      const candidate = materializeModule(source, installedState.configuration, settings);
      if (candidate.module.fingerprint !== installedModule.fingerprint) {
        throw new Error(`Module already installed with different content or configuration: ${manifest.id}; upgrades are not supported`);
      }
    }
    return {
      id: manifest.id,
      version: manifest.version,
      isInstalled: Boolean(installedModule),
      isDependency: !requestedModules.includes(manifest.id),
      requires: manifest.requires ?? {},
      skills: (manifest.skills ?? []).map(skill => skill.name),
      rules: (manifest.rules ?? []).map(rule => ({
        id: rule.id,
        point: rule.point,
        when: rule.when ?? [],
        source: rule.source,
        content: readFileSync(safePath(source.directory, rule.source), 'utf8'),
      })),
      hooks: manifest.hooks ?? [],
    };
  });
  const beforeModuleIds = new Set(installedModules.keys());
  const afterModuleIds = new Set([...beforeModuleIds, ...modules.map(module => module.id)]);
  const activatedExistingRules = [];
  const activatedExistingHooks = [];
  for (const module of installedModules.values()) {
    for (const [contributions, activated] of [[module.rules, activatedExistingRules], [module.hooks, activatedExistingHooks]]) {
      for (const contribution of contributions) {
        const conditions = contribution.when ?? [];
        if (!conditions.every(moduleId => beforeModuleIds.has(moduleId)) &&
            conditions.every(moduleId => afterModuleIds.has(moduleId))) {
          activated.push({ module: module.id, ...contribution });
        }
      }
    }
  }
  const installedSkills = [...new Set((installedState?.files ?? [])
    .filter(file => file.root === 'project' && /^\.claude\/skills\/[^/]+\/SKILL\.md$/.test(file.path))
    .map(file => file.path.split('/')[2]))].sort();
  const includedSkills = [...new Set(modules.flatMap(module => module.skills))].sort();
  const newModules = modules.filter(module => !module.isInstalled);
  return {
    requestedSkills: selectedSkills,
    unresolvedSkills,
    isComplete: unresolvedSkills.length === 0,
    requestedModules,
    modules,
    installedSkills,
    includedSkills,
    proposedSkills: includedSkills.filter(skillName => !installedSkills.includes(skillName)),
    additionalSkills: includedSkills.filter(skillName => !selectedSkills.includes(skillName)),
    activatedExistingRules,
    activatedExistingHooks,
    requiresRuleApproval: !installedState || newModules.some(module => module.rules.length || module.hooks.length) ||
      activatedExistingRules.length > 0 || activatedExistingHooks.length > 0,
    isInstallation: false,
  };
}
