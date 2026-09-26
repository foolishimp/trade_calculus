// @ts-check
import { linearOilSensitivities } from '../src/linear_sensitivities.js';
/** @typedef {import('../src/replay.ts').ReplayRow} ReplayRow */
/** @typedef {import('../src/replay.ts').ReplayConfig} ReplayConfig */
/** @typedef {{label: string, value: string}} Fact */
/** @typedef {{target: string, label: string}} Link */
/** @typedef {{id: string, index: number, date: string, kind: string, phase: string, title: string, summary: string, ruleId: string, rule: string, explanation: string, facts: Fact[], links: Link[]}} ReplayEvent */
/** @type {Record<string, string>} */
const ruleIds = {evidence:'TC-EVIDENCE-01', proposal:'TC-MODEL-01', composition:'TC-GAIN-01', selection:'TC-RISK-01', market:'TC-PNL-01', execution:'TC-ACTION-01', outcome:'TC-PNL-01'};
const number = (/** @type {number} */ n) => new Intl.NumberFormat('en-US', {maximumFractionDigits: 2}).format(n);
const usd = (/** @type {number} */ n) => new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 2}).format(n);
const book = (/** @type {number} */ b, /** @type {number} */ w) => `${number(b)} Brent / ${number(w)} WTI bbl`;
const fact = (/** @type {string} */ label, /** @type {string} */ value) => ({label, value});
const link = (/** @type {string} */ target, /** @type {string} */ label) => ({target, label});

/** A read model. Each explanation uses its row and the preceding prefix only.
 * @param {readonly ReplayRow[]} rows @param {number} index @param {ReplayConfig} config
 * @returns {ReplayEvent[]}
 */
export function explainObservation(rows, index, config) {
  if (!Number.isInteger(index) || index < 0 || index >= rows.length) throw new Error('Observation index is outside the replay');
  const row = rows[index];
  if (!row) throw new Error('Missing observation');
  const previous = rows[index - 1], prior = rows[index - 2];
  const heldB = previous?.brentPosition ?? 0, heldW = previous?.wtiPosition ?? 0;
  const decision = row.riskDecision, model = row.strategyModel, plan = model.plan;
  const cutoff = decision.evidenceThrough ?? 'No preceding observation';
  /** @type {ReplayEvent[]} */ const events = [];
  /** @param {string} kind @param {string} phase @param {string} title @param {string} summary @param {string} rule @param {string} explanation @param {Fact[]} facts @param {Link[]} links */
  const add = (kind, phase, title, summary, rule, explanation, facts, links) => {
    events.push({id: `${row.date}:${kind}:${events.length}`, index, date: row.date, kind, phase, title, summary, ruleId: ruleIds[kind] ?? 'TC-MODEL-01', rule, explanation, facts, links});
  };
  const before = 'Before market reveal', after = 'After market reveal';
  add('evidence', before, 'Establish what is known', `Evidence through ${cutoff}. ${index} preceding observations.`,
    'K(t) = observations strictly preceding this execution',
    'The decision can use earlier prices, confirmed holdings, prior NAV and completed risk outcomes. The current execution mark has not been revealed to it.',
    [fact('Evidence cutoff', cutoff), fact('Known book', book(heldB, heldW)), fact('Prior NAV', usd(decision.priorNavUsd)),
      fact('Last known Brent / WTI', previous ? `${usd(previous.brent)} / ${usd(previous.wti)} per bbl` : 'Unavailable'),
      fact('Last known basis', previous ? `${usd(previous.basis)} per bbl` : 'Unavailable'),
      fact('Last observed basis change', previous && prior ? `${usd(previous.basis - prior.basis)} per bbl` : 'Unavailable')],
    [link('law-evidence', 'Evidence and causality'), link('market-landscape', 'Historical market')]);
  add('proposal', before, 'Apply the supplied strategy', row.signal.reason,
    'primary exposure = supplied strategy(prior observations, parameters)',
    'This illustrative strategy produces an exposure proposal. Its admission is a separate process. A proposal is neither a simulated fill nor the final selected book.',
    [fact('Strategy', config.strategy), fact('Lookback', `${config.lookback} observations`), fact('Primary proposal', book(row.signal.brentBarrels, row.signal.wtiBarrels)), fact('Signal cutoff', row.signal.evidenceThrough ?? 'Unavailable')],
    [link('strategies', 'Strategy examples'), link('law-models', 'Deal models and composition')]);
  if (plan) {
    let deviation = plan.initialState.deviation;
    for (const [depth, step] of plan.steps.entries()) {
      const chosen = step.gainVector.find(a => a.id === step.selectedId);
      const facts = [fact('Reference deviation before', number(deviation)),
        fact('Candidates compared', String(step.gainVector.length)), fact('Evidence cutoff', cutoff)];
      if (chosen) {
        deviation -= chosen.gain.deviationReduction;
        facts.push(fact('Expected net gain', usd(chosen.gain.expectedNetGainUsd)), fact('Tail-risk reduction', usd(chosen.gain.tailRiskReductionUsd)),
          fact('Deviation reduction', chosen.gain.deviationReduction.toFixed(4)), fact('Preference gain', usd(chosen.gain.decisionGainUsd)),
          fact('Gain substitution', `${usd(chosen.gain.expectedNetGainUsd)} + ${plan.reference.riskAversion} × ${usd(chosen.gain.tailRiskReductionUsd)} ≈ ${usd(chosen.gain.decisionGainUsd)}`),
          fact('Reference deviation after', deviation.toFixed(4)), fact('Combined expected net', usd(chosen.forecast.expectedNetPnlUsd)));
        if (chosen.hedgeCalculation) facts.push(fact('Hedge increment: −Cov(X,Y) / Var(Y)', `−(${number(chosen.hedgeCalculation.covariance)}) / ${number(chosen.hedgeCalculation.unitVariance)} ≈ ${number(chosen.hedgeCalculation.unconstrainedIncrement)} bbl (display values rounded)`));
      }
      add('composition', before, `Composition ${depth + 1}: ${chosen ? chosen.label : 'keep the composed book'}`,
        chosen ? chosen.reason : 'No candidate at this step improves the supplied reference.',
        'Prefer lower reference deviation; then ΔE[net P&L] + λ × tail-risk reduction',
        'Each candidate changes the combined book. Costs are already included in expected net gain. A hedge can reduce expected return and still improve the reference comparison. Gains are recalculated after each accepted adjustment.',
        facts, [link('homeostatic-model', 'All candidate gains'), link('law-gain', 'Internal good and gain'), link('sensitivities', 'Exposure sensitivities')]);
    }
    if (!plan.steps.length) add('composition', before, 'No composition steps requested', 'The supplied depth is zero; the primary proposal passes to final sizing.',
      'composed book = primary book when no adjustments are requested', 'The evaluator respects the supplied recursion bound.',
      [fact('Composed proposal', book(model.composedExposure.brentBarrels, model.composedExposure.wtiBarrels))], [link('homeostatic-model', 'Composition details')]);
  } else add('composition', before, model.status === 'off' ? 'Composition is switched off' : 'Composition awaits evidence',
    model.status === 'off' ? 'The original proposal passes to the sizing policy.' : 'Required historical payoff samples are unavailable.',
    'missing estimate ≠ zero risk', 'No historical expectation or covariance hedge is invented. The final sizing policy records its own evidence assessment.',
    [fact('Status', model.status), fact('Required risk window', `${config.riskLookback ?? 60} prior joint changes`)], [link('law-gain', 'The composition boundary')]);
  add('selection', before, `Select exposure: ${decision.outcome.replaceAll('-', ' ')}`, decision.reasons.join('. '),
    'selected book = size(composed book, loss bounds, resources, prior evidence)',
    'The supplied policy assesses joint tail loss, independent stress, costs and notional. Its selected quantities are fixed before the execution mark is revealed. A scheduled close is an explicit horizon instruction.',
    [fact('Composed proposal', book(decision.proposedExposure.brentBarrels, decision.proposedExposure.wtiBarrels)),
      fact('Selected book', book(decision.selectedExposure.brentBarrels, decision.selectedExposure.wtiBarrels)), fact('Selected fraction', `${number(decision.scale * 100)}%`),
      fact('Selected tail loss + costs', decision.selectedRisk ? usd(decision.selectedRisk.tailLossWithCostsUsd) : 'Unavailable'),
      fact('Selected stress + costs', decision.selectedRisk ? usd(decision.selectedRisk.stressLossWithCostsUsd) : 'Unavailable'),
      fact('Past-breach allowance', `×${number(decision.calibration.multiplier)} from ${decision.calibration.assessedMoves} prior assessments`)],
    [link('risk-selection', 'Tolerances and size'), link('law-risk', 'Risk selection rule')]);
  const brentMove = previous ? row.brent - previous.brent : 0, wtiMove = previous ? row.wti - previous.wti : 0;
  add('market', after, 'Reveal the next market observation', `Brent ${usd(row.brent)}; WTI ${usd(row.wti)} per bbl.`,
    'gross P&L = old Brent quantity × ΔBrent + old WTI quantity × ΔWTI',
    'These newly revealed prices value the holdings carried from the previous observation. The newly selected trade cannot earn the price move that occurred before its simulated fill.',
    [fact('Brent change', `${usd(brentMove)} per bbl`), fact('WTI change', `${usd(wtiMove)} per bbl`), fact('Basis change', `${usd(brentMove - wtiMove)} per bbl`),
      fact('Brent holding contribution', usd(heldB * brentMove)), fact('WTI holding contribution', usd(heldW * wtiMove)), fact('Gross holding P&L', usd(row.grossPnlUsd))],
    [link('market-landscape', 'Changing market'), link('law-pnl', 'P&L attribution')]);
  const changeB = row.brentPosition - heldB, changeW = row.wtiPosition - heldW;
  add('execution', after, row.tradedBarrels ? 'Simulate the rebalance' : 'Keep the existing holdings',
    row.tradedBarrels ? `${number(row.tradedBarrels)} bbl turnover; ${usd(row.executionCostUsd)} execution cost.` : 'No quantity changes, so no simulated order or execution cost.',
    'Δq = selected − held; execution cost = (|ΔqBrent| + |ΔqWTI|) × cost per bbl',
    'The replay assumes complete fills at the revealed spot-reference marks. Positive quantity changes buy exposure; negative changes sell it. These are simulated actions, not broker orders.',
    [fact('Brent quantity change', `${number(changeB)} bbl at ${usd(row.brent)}`), fact('WTI quantity change', `${number(changeW)} bbl at ${usd(row.wti)}`),
      fact('Cost per barrel', usd(config.costPerBarrelUsd)), fact('Execution cost', usd(row.executionCostUsd)), fact('Resulting book', book(row.brentPosition, row.wtiPosition))],
    [link('simulated-executions', 'Execution history'), link('sensitivities', 'Before and after sensitivities'), link('law-action', 'Simulated action semantics')]);
  add('outcome', after, row.varBreach ? 'Record the outcome and a VaR breach' : 'Record the outcome and next evidence',
    `Net ${usd(row.netPnlUsd)} this observation; cumulative ${usd(row.cumulativePnlUsd)}.`,
    'net P&L = gross holding P&L − execution costs − funding costs',
    'Outcome feeds the next decision. The prior VaR is compared with gross holding loss, not net P&L. The selected book’s expected return concerns its future holding interval and is not a forecast of the move that just occurred.',
    [fact('Gross P&L', usd(row.grossPnlUsd)), fact('Execution cost', usd(row.executionCostUsd)), fact('Funding cost', usd(row.fundingCostUsd)),
      fact('Net P&L', usd(row.netPnlUsd)), fact('Realized + unrealized', `${usd(row.realizedPnlUsd)} + ${usd(row.unrealizedPnlUsd)} = ${usd(row.cumulativePnlUsd)}`),
      fact('Previous VaR', row.varBreach !== null && previous?.priceRisk ? usd(previous.priceRisk.varUsd) : 'Not assessed'),
      fact('Gross loss for comparison', usd(-row.grossPnlUsd)), fact('VaR result', row.varBreach === null ? 'Not assessed' : row.varBreach ? 'Breached; available to the next decision' : 'Not breached'),
      fact('Next risk forecast cutoff', row.priceRisk?.evidenceThrough ?? 'Unavailable')],
    [link('pnl-outcome', 'P&L through this observation'), link('risk', 'Next risk forecast'), link('law-pnl', 'Outcome and feedback')]);
  return events;
}

/** @param {readonly ReplayRow[]} rows @param {number} through @param {ReplayConfig} config */
export function projectEventLog(rows, through, config) {
  if (!Number.isInteger(through) || through < -1 || through >= rows.length) throw new Error('Invalid replay cursor');
  return rows.slice(0, through + 1).flatMap((_, i) => explainObservation(rows, i, config));
}

/** @param {ReplayEvent[]} events @param {string} kind @param {string} query */
export function filterEvents(events, kind, query) {
  const term = query.trim().toLowerCase();
  return events.filter(e => (kind === 'all' || e.kind === kind || kind === 'decisions' && ['proposal', 'composition', 'selection'].includes(e.kind)) &&
    (!term || `${e.date} ${e.ruleId} ${e.title} ${e.summary} ${e.explanation} ${e.facts.map(f => `${f.label} ${f.value}`).join(' ')}`.toLowerCase().includes(term)));
}

/** @param {readonly ReplayRow[]} rows @param {number} index */
export function sensitivityStages(rows, index) {
  const row = rows[index];
  if (!row) throw new Error('Missing sensitivity observation');
  const previous = rows[index - 1], cutoff = row.riskDecision.evidenceThrough;
  return [
    {label: 'Held before', exposure: {brentBarrels: previous?.brentPosition ?? 0, wtiBarrels: previous?.wtiPosition ?? 0}},
    {label: 'Primary', exposure: row.signal},
    {label: 'Composed', exposure: row.strategyModel.composedExposure},
    {label: 'Selected', exposure: row.riskDecision.selectedExposure},
  ].map(s => ({label: s.label, ...linearOilSensitivities(s.exposure, cutoff)}));
}
