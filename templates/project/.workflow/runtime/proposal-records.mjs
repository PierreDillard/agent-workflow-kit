import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { inspectModule } from './module-inspection.mjs';
import { digest, safePath } from './paths.mjs';
import { applyPlan } from './transaction.mjs';
import { checkState } from './doctor.mjs';

export function proposalPath(proposalId) {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(proposalId)) throw new Error('Invalid proposal id');
  return `.workflow/skill-proposals/${proposalId}`;
}

export function hasExactApproval(record, projectRoot) {
  return record.status === 'approved' && typeof record.decision?.statement === 'string' &&
    Boolean(record.decision.statement.trim()) && record.decision.target === projectRoot &&
    record.decision.proposalId === record.id && record.decision.packageFingerprint === record.packageFingerprint;
}

export function readProposal(projectRoot, proposalId) {
  const relativePath = proposalPath(proposalId);
  const recordPath = safePath(projectRoot, `${relativePath}/proposal.json`);
  const original = readFileSync(recordPath);
  const record = JSON.parse(original);
  if (record.schemaVersion !== 1 || record.id !== proposalId ||
      !['proposed', 'approved', 'refused', 'obsolete'].includes(record.status)) {
    throw new Error('Invalid proposal identity or state');
  }
  const obsoleteReasons = [...(record.obsoleteReasons ?? [])];
  if (record.target !== projectRoot) obsoleteReasons.push('target_changed');
  const inventoryContent = readFileSync(safePath(projectRoot, '.workflow-kit.json'));
  const state = JSON.parse(inventoryContent);
  const installed = state.modules.find(module => module.id === record.plannedModule?.id);
  const hasInstalledMatch = Boolean(installed) && hasExactApproval(record, projectRoot) &&
    installed.version === record.plannedModule.version && installed.fingerprint === record.plannedModule.fingerprint;
  if (hasInstalledMatch) {
    try { checkState(state, { project: projectRoot, user: state.configuration.userRoot }); }
    catch { obsoleteReasons.push('installed_files_changed'); }
  } else if (record.inventoryFingerprint !== digest(inventoryContent)) obsoleteReasons.push('inventory_changed');
  let inspection = null;
  try {
    inspection = inspectModule(safePath(projectRoot, `${relativePath}/package`));
    if (record.packageFingerprint !== inspection.packageFingerprint) obsoleteReasons.push('package_changed');
  } catch { obsoleteReasons.push('package_unreadable'); }
  const effectiveRecord = obsoleteReasons.length ? { ...record, status: 'obsolete',
    obsoleteReasons: [...new Set(obsoleteReasons)] } : record;
  const installation = hasInstalledMatch && !obsoleteReasons.length ? { id: installed.id,
    version: installed.version, fingerprint: installed.fingerprint, inventoryFingerprint: digest(inventoryContent) } : null;
  return { record: effectiveRecord, inspection, installation, relativePath, recordFingerprint: digest(original) };
}

export function saveDecision(projectRoot, proposal, record) {
  applyPlan([{ root: 'project', path: `${proposal.relativePath}/proposal.json`, mode: 0o644,
    expected: proposal.recordFingerprint, content: Buffer.from(JSON.stringify(record, null, 2) + '\n') }],
  { project: projectRoot });
}

export function requireCurrentProposal(projectRoot, proposal) {
  if (proposal.record.status !== 'obsolete') return;
  saveDecision(projectRoot, proposal, proposal.record);
  throw new Error(`Proposal is obsolete (${proposal.record.obsoleteReasons.join(', ')}); present a new proposal and obtain renewed approval`);
}

// Guard retained drafts even when callers use module.sh add directly.
export function assertSkillProposalApproval(directory, projectRoot, { dryRun, installGlobalSkills }) {
  const sourceRoot = resolve(directory);
  const marker = '/.workflow/skill-proposals/';
  const markerIndex = sourceRoot.indexOf(marker);
  if (markerIndex < 0) {
    if (!dryRun && existsSync(safePath(sourceRoot, 'provenance.json'))) {
      throw new Error('External package requires a retained approved proposal before activation');
    }
    return;
  }
  const ownerRoot = sourceRoot.slice(0, markerIndex);
  const [proposalId, packageName, ...extra] = sourceRoot.slice(markerIndex + marker.length).split('/');
  if (ownerRoot !== projectRoot || packageName !== 'package' || extra.length || installGlobalSkills) {
    throw new Error('Skill proposal target or activation location changed');
  }
  const { record } = readProposal(projectRoot, proposalId);
  if (record.status === 'obsolete') throw new Error('Skill proposal is obsolete; renewed approval required');
  if (dryRun && record.status === 'proposed') return record.plannedModule;
  if (!hasExactApproval(record, projectRoot)) {
    throw new Error('Skill proposal requires explicit approval before activation');
  }
  return record.plannedModule;
}

export function assertSkillProposalPlan(plannedModule, candidateModule) {
  if (plannedModule && (plannedModule.id !== candidateModule.id || plannedModule.version !== candidateModule.version ||
      plannedModule.fingerprint !== candidateModule.fingerprint)) throw new Error('Skill proposal activation plan changed; renewed approval required');
}

