import type { OverlayAssessment } from "../decision.ts";
import type { OilAssessment } from "../risk.ts";
import { nonnegative } from "../validation.ts";

/** REQ-08: example external policy. This is not a rule of the economic model. */
export function assessLossTolerance(candidates: readonly OilAssessment[], toleranceUsd: number): OverlayAssessment {
  nonnegative(toleranceUsd, "loss tolerance");
  return {
    overlayId: `example-loss-tolerance:${toleranceUsd}:USD`,
    results: candidates.map(candidate => ({
      candidateId: candidate.candidateId,
      accepted: candidate.worstRepresentedLossUsd <= toleranceUsd,
      reason: `Represented loss ${candidate.worstRepresentedLossUsd} USD compared with supplied tolerance ${toleranceUsd} USD`,
    })),
  };
}
