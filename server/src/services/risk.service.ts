import { prisma } from '../lib/prisma';

export interface EvaluatedLineForRisk {
  lineName: string;
  grossPrice: number;
  discountPercent: number;
  effectiveCeiling: number;
  overagePoints: number;
}

export interface RiskEvaluationResult {
  riskScore: number;
  riskBand: 'LOW' | 'MEDIUM' | 'HIGH';
  worstLine: string;
  givenDiscount: number;
  allowedDiscount: number;
  overagePoints: number;
  weightedRisk: number;
  worstOveragePenalty: number;
  requiredApprovalChain: string[];
  explanationJson: string;
}

/**
 * Calculates blended discount risk score and risk band deterministically.
 *
 * Risk band thresholds:
 *   LOW    → score < 2.0   (small discounts within acceptable range)
 *   MEDIUM → 2.0 ≤ score ≤ 8.0  (requires Sales Manager approval)
 *   HIGH   → score > 8.0   (requires Sales Manager + Finance approval)
 */
export async function calculateBlendedRisk(lines: EvaluatedLineForRisk[]): Promise<RiskEvaluationResult> {
  if (!lines || lines.length === 0) {
    const explanationJson = JSON.stringify({
      worstLine: 'None',
      givenDiscount: 0,
      allowedDiscount: 0,
      overagePoints: 0,
      weightedRisk: 0,
      worstOveragePenalty: 0,
      riskScore: 0,
      riskBand: 'LOW',
      requiredApprovalChain: [],
    });
    return {
      riskScore: 0,
      riskBand: 'LOW',
      worstLine: 'None',
      givenDiscount: 0,
      allowedDiscount: 0,
      overagePoints: 0,
      weightedRisk: 0,
      worstOveragePenalty: 0,
      requiredApprovalChain: [],
      explanationJson,
    };
  }

  let totalGross = 0;
  let weightedOverageSum = 0;
  let worstOverage = 0;
  let worstLineObj: EvaluatedLineForRisk = lines[0];

  for (const line of lines) {
    const gross = line.grossPrice || 0;
    totalGross += gross;
    weightedOverageSum += (line.overagePoints * gross);

    if (line.overagePoints > worstOverage) {
      worstOverage = line.overagePoints;
      worstLineObj = line;
    }
  }

  const weightedRisk = totalGross > 0 ? weightedOverageSum / totalGross : 0;
  const worstPenalty = worstOverage * 0.5;
  const rawScore = weightedRisk + worstPenalty;

  const roundedScore = Math.round(rawScore * 100) / 100;
  const roundedWeightedRisk = Math.round(weightedRisk * 100) / 100;
  const roundedWorstPenalty = Math.round(worstPenalty * 100) / 100;

  // ── Determine Risk Band ───────────────────────────────────────────────────
  // LOW: score <= 0 (no overages) — automatic approval
  // MEDIUM: 0 < score ≤ 5.0 — needs Sales Manager approval
  // HIGH: score > 5.0 — needs Sales Manager + Finance Operations approval
  let riskBand: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (roundedScore > 0 && roundedScore <= 5.0) {
    riskBand = 'MEDIUM';
  } else if (roundedScore > 5.0) {
    riskBand = 'HIGH';
  }

  // Query database approval policy for this risk band
  const policy = await prisma.approvalPolicy.findUnique({
    where: { riskBand },
  });

  let requiredApprovalChain: string[] = [];
  if (policy && policy.rolesRequired) {
    try {
      requiredApprovalChain = JSON.parse(policy.rolesRequired);
    } catch {
      requiredApprovalChain = [];
    }
  } else {
    if (riskBand === 'MEDIUM') requiredApprovalChain = ['SALES_MANAGER'];
    if (riskBand === 'HIGH') requiredApprovalChain = ['SALES_MANAGER', 'FINANCE_OPERATIONS'];
  }

  const explanationObj = {
    worstLine: worstLineObj ? worstLineObj.lineName : 'N/A',
    givenDiscount: worstLineObj ? worstLineObj.discountPercent : 0,
    allowedDiscount: worstLineObj ? worstLineObj.effectiveCeiling : 0,
    overagePoints: worstOverage,
    weightedRisk: roundedWeightedRisk,
    worstOveragePenalty: roundedWorstPenalty,
    riskScore: roundedScore,
    riskBand,
    requiredApprovalChain,
  };

  return {
    riskScore: roundedScore,
    riskBand,
    worstLine: worstLineObj ? worstLineObj.lineName : 'N/A',
    givenDiscount: worstLineObj ? worstLineObj.discountPercent : 0,
    allowedDiscount: worstLineObj ? worstLineObj.effectiveCeiling : 0,
    overagePoints: worstOverage,
    weightedRisk: roundedWeightedRisk,
    worstOveragePenalty: roundedWorstPenalty,
    requiredApprovalChain,
    explanationJson: JSON.stringify(explanationObj),
  };
}
