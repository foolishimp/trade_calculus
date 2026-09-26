import { distribution, finite, identifier, instant, nonnegative, unique, whole } from "./validation.ts";

export interface Order {
  readonly id: string;
  readonly quantity: number;
  readonly unit: string;
  readonly reportSource: string;
  readonly submittedAt: string;
}

export interface OrderReport {
  readonly id: string;
  readonly orderId: string;
  readonly source: string;
  readonly sequence: number;
  readonly eventTime: string;
  readonly receivedTime: string;
  readonly cumulativeFilled: number;
  readonly final: boolean;
}

export interface OrderKnowledge {
  readonly orderId: string;
  readonly unit: string;
  readonly status: "open" | "final" | "conflicted";
  readonly minimumFilled: number;
  readonly maximumFilled: number;
  readonly evidenceIds: readonly string[];
  readonly conflicts: readonly string[];
  readonly valuationAt: string;
  readonly knowledgeCutoff: string;
}

function payload(report: OrderReport): string {
  // Receipt time can differ for redelivery; semantic evidence identity cannot.
  return JSON.stringify([report.orderId, report.source, report.sequence,
    report.eventTime, report.cumulativeFilled, report.final]);
}

/** REQ-03: one authoritative cumulative stream; no implicit amendment semantics. */
export function projectOrder(
  order: Order,
  reports: readonly OrderReport[],
  valuationAt: string,
  knowledgeCutoff: string,
): OrderKnowledge {
  identifier(order.id, "order id");
  identifier(order.unit, "order unit");
  identifier(order.reportSource, "report source");
  nonnegative(order.quantity, "order quantity");
  const submitted = instant(order.submittedAt);
  const valuation = instant(valuationAt);
  const cutoff = instant(knowledgeCutoff);
  if (submitted > valuation || submitted > cutoff) throw new Error("Order not yet submitted at this analysis cut");
  const visible = reports.filter(report => instant(report.receivedTime) <= cutoff && instant(report.eventTime) <= valuation);
  const byId = new Map<string, OrderReport>();
  const bySequence = new Map<number, OrderReport>();
  const conflicts: string[] = [];
  for (const report of visible) {
    identifier(report.id, "report id");
    whole(report.sequence, "report sequence");
    nonnegative(report.cumulativeFilled, "cumulative filled");
    if (report.orderId !== order.id || report.source !== order.reportSource) {
      conflicts.push(`Unbound order or source in ${report.id}`);
    }
    if (report.cumulativeFilled > order.quantity || instant(report.eventTime) < submitted ||
        instant(report.receivedTime) < instant(report.eventTime)) {
      conflicts.push(`Impossible quantity or time in ${report.id}`);
    }
    const previous = byId.get(report.id);
    if (previous && payload(previous) !== payload(report)) conflicts.push(`Conflicting identity ${report.id}`);
    const sameSequence = bySequence.get(report.sequence);
    if (sameSequence && payload(sameSequence) !== payload(report)) conflicts.push(`Conflicting sequence ${report.sequence}`);
    byId.set(report.id, report);
    bySequence.set(report.sequence, report);
  }
  let minimumFilled = 0;
  let final = false;
  let lastEventTime = submitted;
  for (const report of [...bySequence.values()].sort((a, b) => a.sequence - b.sequence)) {
    if (report.cumulativeFilled < minimumFilled || instant(report.eventTime) < lastEventTime ||
        (final && (!report.final || report.cumulativeFilled !== minimumFilled))) {
      conflicts.push(`Non-monotone or contradictory final report ${report.id}`);
    }
    minimumFilled = report.cumulativeFilled;
    final = report.final;
    lastEventTime = instant(report.eventTime);
  }
  return {
    orderId: order.id, unit: order.unit,
    status: conflicts.length ? "conflicted" : final ? "final" : "open",
    minimumFilled: conflicts.length ? 0 : minimumFilled,
    maximumFilled: conflicts.length || !final ? order.quantity : minimumFilled,
    evidenceIds: [...byId.keys()].sort(), conflicts, valuationAt, knowledgeCutoff,
  };
}

export interface Hypothesis {
  readonly id: string;
  readonly probability: number;
}
export interface LikelihoodEvidence {
  readonly id: string;
  readonly modelId: string;
  /** Each value is P(e | h, already-applied evidence), in hypothesis order. */
  readonly likelihoods: readonly number[];
}
export interface Belief {
  readonly modelId: string;
  readonly hypotheses: readonly Hypothesis[];
  readonly appliedEvidence: readonly LikelihoodEvidence[];
}

function validateBelief(belief: Belief): void {
  identifier(belief.modelId, "belief model");
  unique(belief.hypotheses.map(h => h.id), "hypothesis ids");
  distribution(belief.hypotheses.map(h => h.probability));
  unique(belief.appliedEvidence.map(e => e.id), "applied evidence ids");
}

/** REQ-04: conditioning only; the caller owns prediction and likelihood semantics. */
export function conditionBelief(belief: Belief, evidence: LikelihoodEvidence): Belief {
  validateBelief(belief);
  identifier(evidence.id, "evidence id");
  if (evidence.modelId !== belief.modelId) throw new Error("Evidence model does not match belief model");
  if (evidence.likelihoods.length !== belief.hypotheses.length) throw new Error("Likelihood dimensions do not match");
  for (const likelihood of evidence.likelihoods) {
    if (nonnegative(likelihood, "likelihood") > 1) throw new Error("Discrete observation likelihood exceeds one");
  }
  const previous = belief.appliedEvidence.find(e => e.id === evidence.id);
  if (previous) {
    if (previous.modelId !== evidence.modelId || JSON.stringify(previous.likelihoods) !== JSON.stringify(evidence.likelihoods)) {
      throw new Error("Conflicting replay of Bayesian evidence");
    }
    return belief;
  }
  const weights = belief.hypotheses.map((h, i) => h.probability * evidence.likelihoods[i]!);
  const mass = weights.reduce((sum, weight) => sum + weight, 0);
  if (mass <= 0) throw new Error("Evidence has zero support under the represented model");
  return {
    modelId: belief.modelId,
    hypotheses: belief.hypotheses.map((h, i) => ({ id: h.id, probability: weights[i]! / mass })),
    appliedEvidence: [...belief.appliedEvidence, { ...evidence, likelihoods: [...evidence.likelihoods] }],
  };
}

/** REQ-10: multiclass Brier score; lower is better for this declared outcome space. */
export function brierScore(forecast: readonly Hypothesis[], observedId: string): number {
  unique(forecast.map(h => h.id), "forecast outcomes");
  distribution(forecast.map(h => h.probability));
  if (!forecast.some(h => h.id === observedId)) throw new Error("Observed outcome is outside the represented model");
  return finite(forecast.reduce((sum, h) => sum + (h.probability - Number(h.id === observedId)) ** 2, 0), "Brier score");
}
