import { JointAngles, RulaBreakdown } from '../types/ergonomics';

// Standard RULA Table A [UpperArm 1-6][LowerArm 1-3][Wrist 1-4][WristTwist 1-2]
// Flattened into helper lookup
function lookupTableA(upper: number, lower: number, wrist: number, twist: number): number {
  // Bounded inputs
  const u = Math.min(6, Math.max(1, upper));
  const l = Math.min(3, Math.max(1, lower));
  const w = Math.min(4, Math.max(1, wrist));
  const t = Math.min(2, Math.max(1, twist));

  // Table A Matrix lookup
  const tableA: number[][][][] = [
    // Upper arm = 1
    [
      [[1, 2], [2, 2], [2, 3], [3, 3]], // lower = 1
      [[2, 2], [2, 2], [3, 3], [3, 3]], // lower = 2
      [[2, 3], [3, 3], [3, 3], [4, 4]], // lower = 3
    ],
    // Upper arm = 2
    [
      [[2, 3], [3, 3], [3, 4], [4, 4]],
      [[3, 3], [3, 3], [3, 4], [4, 4]],
      [[3, 4], [4, 4], [4, 4], [5, 5]],
    ],
    // Upper arm = 3
    [
      [[3, 3], [4, 4], [4, 4], [5, 5]],
      [[3, 4], [4, 4], [4, 4], [5, 5]],
      [[4, 4], [4, 5], [5, 5], [5, 6]],
    ],
    // Upper arm = 4
    [
      [[4, 4], [4, 5], [5, 5], [5, 6]],
      [[4, 4], [4, 5], [5, 5], [6, 6]],
      [[4, 5], [5, 5], [6, 6], [7, 7]],
    ],
    // Upper arm = 5
    [
      [[5, 5], [5, 6], [6, 7], [7, 7]],
      [[5, 6], [6, 6], [7, 7], [7, 8]],
      [[6, 6], [7, 7], [7, 8], [8, 8]],
    ],
    // Upper arm = 6
    [
      [[7, 7], [7, 7], [8, 8], [8, 9]],
      [[8, 8], [8, 8], [8, 9], [9, 9]],
      [[9, 9], [9, 9], [9, 9], [9, 9]],
    ],
  ];

  return tableA[u - 1][l - 1][w - 1][t - 1];
}

// Standard RULA Table B [Neck 1-6][Trunk 1-6][Legs 1-2]
function lookupTableB(neck: number, trunk: number, legs: number): number {
  const n = Math.min(6, Math.max(1, neck));
  const tr = Math.min(6, Math.max(1, trunk));
  const lg = Math.min(2, Math.max(1, legs));

  const tableB: number[][][] = [
    // Neck 1
    [[1, 3], [2, 3], [3, 4], [5, 5], [6, 6], [7, 7]],
    // Neck 2
    [[2, 3], [3, 4], [4, 5], [5, 5], [6, 7], [7, 7]],
    // Neck 3
    [[3, 3], [3, 4], [4, 5], [6, 6], [7, 7], [8, 8]],
    // Neck 4
    [[5, 5], [5, 6], [6, 7], [7, 7], [8, 8], [8, 8]],
    // Neck 5
    [[6, 6], [6, 7], [7, 7], [8, 8], [8, 8], [9, 9]],
    // Neck 6
    [[7, 7], [7, 8], [8, 8], [9, 9], [9, 9], [9, 9]],
  ];

  return tableB[n - 1][tr - 1][lg - 1];
}

// Standard RULA Table C [Score C 1-8+][Score D 1-7+] -> Grand Score (1-7)
function lookupTableC(scoreC: number, scoreD: number): number {
  const c = Math.min(8, Math.max(1, scoreC));
  const d = Math.min(7, Math.max(1, scoreD));

  const tableC: number[][] = [
    [1, 2, 3, 3, 4, 5, 5], // C=1
    [2, 2, 3, 4, 4, 5, 5], // C=2
    [3, 3, 3, 4, 4, 5, 6], // C=3
    [3, 3, 3, 4, 5, 6, 6], // C=4
    [4, 4, 4, 5, 6, 7, 7], // C=5
    [4, 4, 5, 6, 6, 7, 7], // C=6
    [5, 5, 6, 6, 7, 7, 7], // C=7
    [5, 5, 6, 7, 7, 7, 7], // C=8+
  ];

  return tableC[c - 1][d - 1];
}

/**
 * Calculates Rapid Upper Limb Assessment (RULA) score based on joint angles
 */
export function calculateRula(
  angles: JointAngles,
  options: {
    isMuscleStatic?: boolean;
    loadKg?: number;
  } = {}
): RulaBreakdown {
  const { isMuscleStatic = false, loadKg = 3 } = options;

  // 1. Upper Arm Score (Max of right/left)
  const maxUpperArmAngle = Math.max(angles.upperArmRight, angles.upperArmLeft);
  let upperArmScore = 1;
  if (maxUpperArmAngle > 90) upperArmScore = 4;
  else if (maxUpperArmAngle > 45) upperArmScore = 3;
  else if (maxUpperArmAngle > 20) upperArmScore = 2;
  else upperArmScore = 1;
  // Adjustment if abducted / shoulder elevated
  if (maxUpperArmAngle > 75) upperArmScore += 1;

  // 2. Lower Arm Score (60-100 is neutral 1, otherwise 2)
  const maxLowerArmAngle = Math.max(angles.lowerArmRight, angles.lowerArmLeft);
  let lowerArmScore = 1;
  if (maxLowerArmAngle < 60 || maxLowerArmAngle > 100) {
    lowerArmScore = 2;
  }

  // 3. Wrist Score
  const maxWristAngle = Math.max(angles.wristRight, angles.wristLeft);
  let wristScore = 1;
  if (maxWristAngle > 15) wristScore = 3;
  else if (maxWristAngle > 5) wristScore = 2;

  // 4. Wrist Twist (1 = neutral, 2 = twisted)
  const wristTwistScore = maxWristAngle > 25 ? 2 : 1;

  // Table A Posture Score
  const wristArmScore = lookupTableA(upperArmScore, lowerArmScore, wristScore, wristTwistScore);

  // Muscle Use & Load for Group A
  const muscleUseScoreA = isMuscleStatic ? 1 : 0;
  let forceLoadScoreA = 0;
  if (loadKg > 10) forceLoadScoreA = 3;
  else if (loadKg >= 2) forceLoadScoreA = 1;
  const scoreC = Math.min(8, wristArmScore + muscleUseScoreA + forceLoadScoreA);

  // 5. Neck Score
  let neckScore = 1;
  if (angles.neckAngle > 20) neckScore = 3;
  else if (angles.neckAngle > 10) neckScore = 2;
  else neckScore = 1;

  // 6. Trunk Score
  let trunkScore = 1;
  if (angles.trunkFlexion > 60) trunkScore = 4;
  else if (angles.trunkFlexion > 20) trunkScore = 3;
  else if (angles.trunkFlexion > 10) trunkScore = 2;
  else trunkScore = 1;
  if (angles.trunkLateralTwist > 20) trunkScore += 1;

  // 7. Leg Score (1 = balanced bilateral support, 2 = awkward/unsupported)
  const maxKneeFlex = Math.max(angles.kneeRight, angles.kneeLeft);
  const legScore = maxKneeFlex > 60 || Math.abs(angles.kneeRight - angles.kneeLeft) > 30 ? 2 : 1;

  // Table B Posture Score
  const neckTrunkLegScore = lookupTableB(neckScore, trunkScore, legScore);

  // Muscle Use & Load for Group B
  const muscleUseScoreB = isMuscleStatic ? 1 : 0;
  const forceLoadScoreB = forceLoadScoreA;
  const scoreD = Math.min(7, neckTrunkLegScore + muscleUseScoreB + forceLoadScoreB);

  // Table C Grand Score (1 to 7)
  const grandScore = lookupTableC(scoreC, scoreD);

  // Risk Classification
  let riskLevel: 'Low' | 'Medium' | 'High' | 'Severe' = 'Low';
  let actionLevel = 'Posture is acceptable if not maintained or repeated for long periods.';

  if (grandScore >= 7) {
    riskLevel = 'Severe';
    actionLevel = 'Investigate and implement change immediately (High injury risk).';
  } else if (grandScore >= 5) {
    riskLevel = 'High';
    actionLevel = 'Further investigation and changes required soon.';
  } else if (grandScore >= 3) {
    riskLevel = 'Medium';
    actionLevel = 'Further investigation needed, ergonomics changes may be required.';
  } else {
    riskLevel = 'Low';
    actionLevel = 'Acceptable ergonomic posture.';
  }

  // Determine primary strained joint
  let primaryStrainedJoint = 'None (Safe)';
  if (trunkScore >= 3) primaryStrainedJoint = `Lumbar Spine (${angles.trunkFlexion}° Flexion)`;
  else if (upperArmScore >= 3) primaryStrainedJoint = `Shoulder / Upper Arm (${maxUpperArmAngle}° Elevation)`;
  else if (neckScore >= 2) primaryStrainedJoint = `Cervical Neck (${angles.neckAngle}° Tilt)`;
  else if (lowerArmScore >= 2) primaryStrainedJoint = `Elbow Forearm (${maxLowerArmAngle}°)`;

  return {
    upperArmScore,
    lowerArmScore,
    wristScore,
    wristTwistScore,
    wristArmScore,
    neckScore,
    trunkScore,
    legScore,
    neckTrunkLegScore,
    muscleUseScoreA,
    forceLoadScoreA,
    scoreC,
    muscleUseScoreB,
    forceLoadScoreB,
    scoreD,
    grandScore,
    riskLevel,
    actionLevel,
    primaryStrainedJoint,
  };
}
