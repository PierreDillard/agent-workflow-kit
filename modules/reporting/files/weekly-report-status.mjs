import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function localDay(now, timezone = 'Europe/Paris') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = (type) => parts.find((part) => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function isoWeek(day) {
  const thursday = new Date(`${day}T00:00:00Z`);
  const weekday = thursday.getUTCDay() || 7;
  thursday.setUTCDate(thursday.getUTCDate() + 4 - weekday);
  const year = thursday.getUTCFullYear();
  const week = Math.ceil(((thursday - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function parseDocument(text, week, kind) {
  if (text === null) return null;
  const match = text.match(/^<!-- weekly-report\r?\n([\s\S]*?)\r?\n-->/);
  if (!match) throw new Error(`métadonnées absentes : ${week} ${kind}`);
  const metadata = JSON.parse(match[1]);
  if (metadata.week !== week) throw new Error(`semaine incohérente : ${week} ${kind}`);
  if (kind === 'report') {
    if (!['draft', 'finalized'].includes(metadata.status)) throw new Error('statut rapport invalide');
  } else {
    if (!['proposed', 'approved'].includes(metadata.goals_status)
      || typeof metadata.absence !== 'boolean' || typeof metadata.skip_report !== 'boolean'
      || !(metadata.snoozed_until === null || /^\d{4}-\d{2}-\d{2}$/.test(metadata.snoozed_until))) {
      throw new Error('état carnet invalide');
    }
  }
  return { ...metadata, pending: (text.match(/^Validation: pending\s*$/gm) || []).length };
}

export function reminders(day, records) {
  const week = isoWeek(day);
  const current = records.find((record) => record.week === week);
  if (current?.notebook?.snoozed_until > day) return [];
  const messages = [];
  if (!current?.notebook?.absence && !current?.notebook?.skip_report) {
    if (current?.notebook?.goals_status !== 'approved') messages.push('objectifs à préparer/valider');
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay() || 7;
    if (weekday >= 5 && current?.report?.status !== 'finalized') messages.push('bilan à préparer/finaliser');
  }
  const pending = records.filter((record) => !record.notebook?.absence
    && !record.notebook?.skip_report && !(record.notebook?.snoozed_until > day)
    && record.notebook?.pending > 0);
  if (pending.length) messages.push(`notes à valider : ${pending.map((record) =>
    `${record.week} (${record.notebook.pending})`).join(', ')}`);
  const forgotten = records.filter((record) => record.week < week && record.notebook
    && !record.notebook.absence && !record.notebook.skip_report
    && !(record.notebook.snoozed_until > day) && record.report?.status !== 'finalized');
  if (forgotten.length) messages.push(`rattrapage facultatif : ${forgotten.map((record) => record.week).join(', ')}`);
  return messages;
}

function readOptional(path) {
  try {
    if (statSync(path).size > 131072) throw new Error(`document trop volumineux : ${path}`);
    return readFileSync(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export function getStatus(root, now = new Date(), tasksDirectory = 'tasks') {
  const directory = resolve(root, tasksDirectory, 'reports');
  const configuration = JSON.parse(readFileSync(resolve(directory, 'config.json'), 'utf8'));
  const day = localDay(now, configuration.timezone);
  const records = [];
  for (let offset = 0; offset <= 8; offset += 1) {
    const priorDay = new Date(`${day}T12:00:00Z`);
    priorDay.setUTCDate(priorDay.getUTCDate() - offset * 7);
    const week = isoWeek(priorDay.toISOString().slice(0, 10));
    records.push({
      week,
      notebook: parseDocument(readOptional(resolve(directory, `${week}.carnet.md`)), week, 'notebook'),
      report: parseDocument(readOptional(resolve(directory, `${week}.md`)), week, 'report'),
    });
  }
  return { day, week: isoWeek(day), messages: reminders(day, records) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = fileURLToPath(new URL('../..', import.meta.url));
    const tasksDirectory = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'tasks';
    const status = getStatus(root, new Date(), tasksDirectory);
    if (process.argv.includes('--hook')) {
      if (status.messages.length) console.log(`Reporting ${status.week} : ${status.messages.join(' ; ')}. `
        + 'Présenter ce rappel une seule fois ; utiliser weekly-report sur demande (plus tard = demain).');
    } else console.log(JSON.stringify(status, null, 2));
  } catch (error) {
    console.log('Reporting : contrôle indisponible, vérifier le dossier reports configuré avec weekly-report.');
    if (!process.argv.includes('--hook')) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
