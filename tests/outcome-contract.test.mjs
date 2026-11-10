import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const validateTask = readFileSync(new URL('../modules/quality/skills/validate-task/SKILL.md', import.meta.url), 'utf8');
const taskTemplate = readFileSync(new URL('../modules/tasks/skills/write-task/references/templates.md', import.meta.url), 'utf8');

test('validation checkpoint captures outcome, audience, action and an explicit reference state', () => {
  for (const field of ['Outcome', 'Audience / context', 'User action / value', 'Reference / quality bar']) {
    assert.match(validateTask, new RegExp(`\\*\\*${field}\\*\\*`));
  }
  assert.match(validateTask, /none supplied/);
  assert.match(validateTask, /ask the smallest set of concrete questions/i);
  assert.match(validateTask, /generic goal such as "polished" or "converts"/);
});

test('task template preserves the result contract for implementation', () => {
  assert.match(taskTemplate, /## Result contract/);
  for (const field of ['Outcome', 'Audience \/ context', 'User action \/ value', 'Reference \/ quality bar']) {
    assert.match(taskTemplate, new RegExp(`- ${field}:`));
  }
});