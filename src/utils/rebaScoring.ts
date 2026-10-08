import { JointAngles, RebaBreakdown } from '../types/ergonomics';

// Standard REBA Table A: [Trunk 1-5][Neck 1-3][Legs 1-4]
function lookupRebaTableA(trunk: number, neck: number, legs: number): number {
  const tr = Math.min(5, Math.max(1, trunk));
  const n = Math.min(3, Math.max(1, neck));
  const lg = Math.min(4, Math.max(1, legs));

  const tableA: number[][][] = [
    // Trunk 1
    [[1, 2, 3, 4], [2, 3, 4, 5], [2, 4, 5, 6]],
    // Trunk 2
    [[2, 3, 4, 5], [3, 4, 5, 6], [4, 5, 6, 7]],
    // Trunk 3
    [[2, 4, 5, 6], [4, 5, 6, 7], [5, 6, 7, 8]],
    // Trunk 4
    [[3, 5, 6, 7], [5, 6, 7, 8], [6, 7, 8, 9]],
    // Trunk 5
    [[4, 6, 7, 8], [6, 7, 8, 9], [7, 8, 9, 9]],
  ];

  return tableA[tr - 1][n - 1][lg - 1];
}

// Standard REBA Table B: [UpperArm 1-6][LowerArm 1-2][Wrist 1-3]
function lookupRebaTableB(upper: number, lower: number, wrist: number): number {
  const u = Math.min(6, Math.max(1, upper));
  const l = Math.min(2, Math.max(1, lower));
  const w = Math.min(3, Math.max(1, wrist));

  const tableB: number[][][] = [
    // UpperArm 1
    [[1, 2, 2], [1, 2, 3]],
    // UpperArm 2
    [[1, 2, 3], [2, 3, 4]],
    // UpperArm 3
    [[3, 4, 5], [4, 5, 5]],
    // UpperArm 4
    [[4, 5, 5], [5, 6, 7]],
    // UpperArm 5
    [[6, 7, 8], [7, 8, 8]],
    // UpperArm 6
    [[7, 8, 8], [8, 9, 9]],
  ];

  return tableB[u - 1][l - 1][w - 1];
}

// Standard REBA Table C: [Score A 1-12][Score B 1-12]
function lookupRebaTableC(scoreA: number, scoreB: number): number {
  const a = Math.min(12, Math.max(1, scoreA));
  const b = Math.min(12, Math.max(1, scoreB));

  const tableC: number[][] = [
    [1, 1, 1, 2, 3, 3, 4, 5, 6, 7, 7, 7],
    [1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 7, 8],
    [2, 3, 3, 3, 4, 5, 6, 7, 7, 8, 8, 8],
    [3, 4, 4, 4, 5, 6, 7, 8, 8, 9, 9, 9],
    [4, 4, 4, 5, 6, 7, 8, 8, 9, 9, 9, 9],
    [6, 6, 6, 7, 8, 8, 9, 9, 10, 10, 10, 10],
    [7, 7, 7, 8, 9, 9, 9, 10, 10, 11, 11, 11],
    [8, 8, 8, 9, 10, 10, 10, 10, 10, 11, 11, 11],
    [9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 12],
    [10, 10, 10, 11, 11, 11, 11, 12, 12, 12, 12, 12],
    [11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12],
    [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12],
  ];

  return tableC[a - 1][b - 1];
}

/**
 * Calculates Rapid Entire Body Assessment (REBA) score
 */
export function calculateReba(
  angles: JointAngles,
  options: {
    loadKg?: number;
    couplingGood?: boolean;
    isRepetitive?: boolean;
    isStaticHold?: boolean;
  } = {}
): RebaBreakdown {
  const { loadKg = 5, couplingGood = true, isRepetitive = false, isStaticHold = false } = options;

  // 1. Trunk Score
  let trunkScore = 1;
  if (angles.trunkFlexion > 60) trunkScore = 4;
  else if (angles.trunkFlexion > 20) trunkScore = 3;
  else if (angles.trunkFlexion > 0) trunkScore = 2;
  if (angles.trunkLateralTwist > 15) trunkScore += 1;

  // 2. Neck Score
  let neckScore = 1;
  if (angles.neckAngle > 20) neckScore = 2;
  if (angles.neckAngle > 35) neckScore += 1;

  // 3. Leg Score
  let legScore = 1;
  const maxKneeFlex = Math.max(angles.kneeRight, angles.kneeLeft);
  if (maxKneeFlex > 60) legScore += 2;
  else if (maxKneeFlex > 30) legScore += 1;

  // Table A Score
  const rawTableA = lookupRebaTableA(trunkScore, neckScore, legScore);
  let loadScore = 0;
  if (loadKg > 10) loadScore = 2;
  else if (loadKg >= 5) loadScore = 1;
  const scoreA = Math.min(12, rawTableA + loadScore);

  // 4. Upper Arm Score
  const maxUpperArm = Math.max(angles.upperArmRight, angles.upperArmLeft);
  let upperArmScore = 1;
  if (maxUpperArm > 90) upperArmScore = 4;
  else if (maxUpperArm > 45) upperArmScore = 3;
  else if (maxUpperArm > 20) upperArmScore = 2;
  if (maxUpperArm > 65) upperArmScore += 1; // Shoulder elevated

  // 5. Lower Arm Score
  const maxLowerArm = Math.max(angles.lowerArmRight, angles.lowerArmLeft);
  const lowerArmScore = maxLowerArm < 60 || maxLowerArm > 100 ? 2 : 1;

  // 6. Wrist Score
  const maxWrist = Math.max(angles.wristRight, angles.wristLeft);
  let wristScore = maxWrist > 15 ? 2 : 1;
  if (maxWrist > 25) wristScore += 1;

  // Table B Score
  const rawTableB = lookupRebaTableB(upperArmScore, lowerArmScore, wristScore);
  const couplingScore = couplingGood ? 0 : 1;
  const scoreB = Math.min(12, rawTableB + couplingScore);

  // Table C Score
  const scoreC = lookupRebaTableC(scoreA, scoreB);

  // Activity Score (+1 repetitive, +1 static, +1 rapid posture change)
  let activityScore = 0;
  if (isRepetitive) activityScore += 1;
  if (isStaticHold) activityScore += 1;

  // Grand Score (1 to 15)
  const grandScore = Math.min(15, scoreC + activityScore);

  let riskLevel: 'Negligible' | 'Low' | 'Medium' | 'High' | 'Very High' = 'Low';
  let actionLevel = 'No action required.';

  if (grandScore >= 11) {
    riskLevel = 'Very High';
    actionLevel = 'Implement ergonomics change immediately.';
  } else if (grandScore >= 8) {
    riskLevel = 'High';
    actionLevel = 'Investigate and implement change soon.';
  } else if (grandScore >= 4) {
    riskLevel = 'Medium';
    actionLevel = 'Further investigation, change soon.';
  } else if (grandScore >= 2) {
    riskLevel = 'Low';
    actionLevel = 'Change may be needed.';
  } else {
    riskLevel = 'Negligible';
    actionLevel = 'Acceptable posture.';
  }

  return {
    trunkScore,
    neckScore,
    legScore,
    scoreA,
    upperArmScore,
    lowerArmScore,
    wristScore,
    scoreB,
    scoreC,
    activityScore,
    grandScore,
    riskLevel,
    actionLevel,
  };
}
