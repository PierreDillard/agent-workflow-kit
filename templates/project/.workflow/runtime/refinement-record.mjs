function requireText(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Missing ' + label);
}

function requireBound(value, limit, label) {
  if (!Number.isSafeInteger(value) || value < 1 || value > limit) {
    throw new Error(label + ' must be between 1 and ' + limit);
  }
}

const comparisonCases = Object.freeze({
  reproduction: 'fail',
  validation: 'fail',
  negativeControl: 'pass',
});

export function validateRefinementRecord(baselineRecord, finalRecord, baseline, candidate) {
  const { protocol, decision, results, schemaVersion } = finalRecord ?? {};
  if (schemaVersion !== 1 || baselineRecord?.schemaVersion !== schemaVersion ||
      !protocol || Object.keys(baselineRecord).some(key => !['schemaVersion', 'protocol'].includes(key)) ||
      JSON.stringify(baselineRecord.protocol) !== JSON.stringify(protocol)) {
    throw new Error('The final record must preserve the protocol committed at baseline');
  }
  if (finalRecord.baseline !== baseline || finalRecord.candidate !== candidate) {
    throw new Error('Evidence must identify the exact baseline and candidate commits');
  }
  for (const field of ['task', 'incidentEvidence', 'hypothesis', 'setup', 'reopenWhen']) {
    requireText(protocol[field], 'protocol.' + field);
  }
  const { budget, cases } = protocol;
  requireBound(budget?.maxAttempts, Number.MAX_SAFE_INTEGER, 'maxAttempts');
  requireBound(budget?.maxSeconds, Number.MAX_SAFE_INTEGER, 'maxSeconds');
  if (budget.maxTokens !== undefined) requireBound(budget.maxTokens, Number.MAX_SAFE_INTEGER, 'maxTokens');
  requireText(decision?.reviewer, 'decision.reviewer');
  requireText(decision?.rationale, 'decision.rationale');

  for (const [name, baselineVerdict] of Object.entries(comparisonCases)) {
    requireText(cases?.[name]?.task, name + '.task');
    requireText(cases[name].expected, name + '.expected');
    if (Object.keys(comparisonCases).some(other => other !== name && cases[other]?.task?.trim() === cases[name].task.trim())) {
      throw new Error('Comparison cases must identify distinct tasks');
    }
    for (const [variant, verdict] of Object.entries({ baseline: baselineVerdict, candidate: 'pass' })) {
      const label = name + '.' + variant;
      const measurement = results?.[name]?.[variant];
      if (measurement?.verdict !== verdict) throw new Error(label + ' must record ' + verdict + ' for promotion');
      requireText(measurement.evidence, label + '.evidence');
      requireBound(measurement.attempts, budget.maxAttempts, label + '.attempts');
      requireBound(measurement.seconds, budget.maxSeconds, label + '.seconds');
      if (budget.maxTokens !== undefined) requireBound(measurement.tokens, budget.maxTokens, label + '.tokens');
    }
    if (results[name].baseline.evidence.trim() === results[name].candidate.evidence.trim()) {
      throw new Error(name + ' needs distinct evidence references for the two variants');
    }
  }
}
