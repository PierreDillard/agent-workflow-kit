import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { proposeSkill, presentSkill, approveSkill, refuseSkill, activateSkill } from '../templates/project/.workflow/runtime/skill-proposals.mjs';

const kitRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argumentsList = process.argv.slice(2);
const command = argumentsList.shift();
const options = { kitRoot };
try {
  const allowed = {
    propose: ['target', 'id', 'source', 'need', 'actions', 'prerequisites'],
    'propose-external': ['target', 'id', 'source', 'need', 'actions', 'prerequisites'],
    present: ['target', 'id'], refuse: ['target', 'id', 'fingerprint', 'statement'], approve: ['target', 'id', 'fingerprint', 'statement'],
    activate: ['target', 'id', 'dry-run'],
  };
  if (!Object.hasOwn(allowed, command)) throw new Error('Expected propose, propose-external, present, approve, refuse or activate');
  while (argumentsList.length) {
    const flag = argumentsList.shift();
    const key = flag.startsWith('--') ? flag.slice(2) : '';
    if (!allowed[command].includes(key)) throw new Error(`Unknown argument: ${flag}`);
    const property = key === 'dry-run' ? 'dryRun' : key;
    if (Object.hasOwn(options, property)) throw new Error(`Repeated argument: ${flag}`);
    if (key === 'dry-run') { options.dryRun = true; continue; }
    const value = argumentsList.shift();
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    options[property] = value;
  }
  for (const required of allowed[command].filter(key => key !== 'dry-run')) {
    if (!options[required]) throw new Error(`Missing --${required}`);
  }
  if (command === 'propose-external') options.kind = 'external';
  const result = ['propose', 'propose-external'].includes(command) ? proposeSkill(options) :
    command === 'present' ? presentSkill(options.target, options.id) :
    command === 'approve' ? approveSkill(options) :
    command === 'refuse' ? refuseSkill(options) : activateSkill(options);
  console.log(JSON.stringify(result, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
