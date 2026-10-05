import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { inspectModule } from './module-inspection.mjs';
import { reviewExternalPackage } from './external-skill-package.mjs';
import { digest, safePath } from './paths.mjs';
import { loadState, checkState } from './doctor.mjs';
import { installOrAdd } from './manage.mjs';
import { applyPlan } from './transaction.mjs';
import { proposalPath, readProposal, saveDecision, requireCurrentProposal, hasExactApproval } from './proposal-records.mjs';

function currentInventory(projectRoot) {
  const state = loadState(projectRoot);
  if (state.configuration.installGlobalSkills) throw new Error('Skill proposals require global exports disabled');
  checkState(state, { project: projectRoot, user: state.configuration.userRoot });
  return digest(readFileSync(safePath(projectRoot, '.workflow-kit.json')));
}

function inspectSkillPackage(directory, kind, state) {
  const inspection = inspectModule(directory);
  const manifest = inspection.module;
  if (manifest.skills?.length !== 1 || manifest.skills[0].global ||
      ['files', 'rules', 'hooks', 'checks'].some(field => manifest[field]?.length) ||
      (kind === 'created' && Object.keys(manifest.requires ?? {}).length) || Object.keys(manifest.config ?? {}).length) {
    throw new Error('Skill proposals accept one local skill only, without other contributions; created skills cannot add dependencies');
  }
  if (inspection.files.some(file => (kind === 'created' && file.text === null) || file.text?.includes('{{'))) {
    throw new Error('Created skills require UTF-8 files; all skill proposals exclude template substitutions');
  }
  return kind === 'external' ? { ...inspection, provenance: reviewExternalPackage(inspection, directory, state) } : inspection;
}

export function proposeSkill({ target, id, source, need, actions, prerequisites, kitRoot, kind = 'created' }) {
  if (!['created', 'external'].includes(kind)) throw new Error('Expected created or external skill proposal');
  if (![need, actions, prerequisites].every(value => typeof value === 'string' && value.trim())) {
    throw new Error('Present the unmet need, possible actions and prerequisites');
  }
  const projectRoot = resolve(target);
  const relativePath = proposalPath(id);
  if (/(?:^|\/)(?:\.claude|\.codex|\.agents)\/skills(?:\/|$)/.test(resolve(source))) {
    throw new Error('Draft must remain outside agent discovery paths');
  }
  const inventoryFingerprint = currentInventory(projectRoot);
  const inspection = inspectSkillPackage(source, kind, loadState(projectRoot));
  // Preflight through the existing engine before retaining the draft. No module code executes.
  const plannedState = installOrAdd({ command: 'add', target: projectRoot, kitRoot, catalogs: [join(kitRoot, 'modules')],
    sources: [resolve(source)], settings: {}, dryRun: true });
  const plannedModule = plannedState.modules.find(module => module.id === inspection.module.id);
  const record = { schemaVersion: 1, kind, id, target: projectRoot, need, actions, prerequisites,
    packageFingerprint: inspection.packageFingerprint, inventoryFingerprint, status: 'proposed',
    createdAt: new Date().toISOString(), decision: null,
    ...(inspection.provenance ? { provenance: inspection.provenance } : {}),
    plannedModule: { id: plannedModule.id, version: plannedModule.version, fingerprint: plannedModule.fingerprint },
    destinations: ['.claude', '.codex'].map(client => `${client}/skills/${inspection.module.skills[0].name}`) };
  // Preserve the complete reviewed package, including unreferenced supporting files.
  const packageFiles = inspection.files.map(file => ({ root: 'project', path: `${relativePath}/package/${file.path}`,
    content: readFileSync(safePath(resolve(source), file.path)), mode: file.mode }));
  if (packageFiles.some((entry, index) => digest(entry.content) !== inspection.files[index].sha256)) {
    throw new Error('Source changed during proposal preparation');
  }
  applyPlan([...packageFiles, { root: 'project', path: `${relativePath}/proposal.json`, mode: 0o644,
    content: Buffer.from(JSON.stringify(record, null, 2) + '\n') }], { project: projectRoot });
  return presentSkill(projectRoot, id);
}

export function presentSkill(target, id) {
  const projectRoot = resolve(target);
  const { record, inspection, installation } = readProposal(projectRoot, id);
  return { ...record, package: inspection, installation, isActivation: false };
}

export function approveSkill({ target, id, fingerprint, statement }) {
  const projectRoot = resolve(target);
  const proposal = readProposal(projectRoot, id);
  requireCurrentProposal(projectRoot, proposal);
  if (proposal.record.status !== 'proposed' || fingerprint !== proposal.record.packageFingerprint ||
      typeof statement !== 'string' || !statement.trim()) throw new Error('Explicit approval of the presented fingerprint is required');
  if (currentInventory(projectRoot) !== proposal.record.inventoryFingerprint) throw new Error('Target installation changed; present a new proposal');
  const record = { ...proposal.record, status: 'approved', decision: {
    statement, proposalId: id, packageFingerprint: fingerprint, target: projectRoot, recordedAt: new Date().toISOString(),
    evidence: 'Caller records an explicit user decision; human identity is not authenticated' } };
  saveDecision(projectRoot, proposal, record);
  return record;
}

export function refuseSkill({ target, id, fingerprint, statement }) {
  const projectRoot = resolve(target);
  const proposal = readProposal(projectRoot, id);
  requireCurrentProposal(projectRoot, proposal);
  if (proposal.record.status !== 'proposed' || fingerprint !== proposal.record.packageFingerprint ||
      typeof statement !== 'string' || !statement.trim()) throw new Error('Explicit refusal of the presented proposal is required');
  const record = { ...proposal.record, status: 'refused', decision: { statement, proposalId: id,
    packageFingerprint: fingerprint, target: projectRoot, recordedAt: new Date().toISOString() } };
  saveDecision(projectRoot, proposal, record);
  return record;
}

export function activateSkill({ target, id, kitRoot, dryRun = false }) {
  const projectRoot = resolve(target);
  const proposal = readProposal(projectRoot, id);
  requireCurrentProposal(projectRoot, proposal);
  const { record } = proposal;
  if (!hasExactApproval(record, projectRoot)) {
    throw new Error('Proposal requires explicit approval before activation');
  }
  const inventoryFingerprint = currentInventory(projectRoot);
  if (!proposal.installation && inventoryFingerprint !== record.inventoryFingerprint) throw new Error('Target installation changed; present a new proposal');
  return installOrAdd({ command: 'add', target: projectRoot, kitRoot, catalogs: [join(kitRoot, 'modules')],
    sources: [safePath(projectRoot, `${proposal.relativePath}/package`)], settings: {}, dryRun });
}
