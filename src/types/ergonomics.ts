export interface Landmark2D {
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  z?: number; // Relative depth
  visibility?: number;
  name?: string;
}

export type PoseLandmarks = Landmark2D[];

export interface JointAngles {
  trunkFlexion: number; // degrees (0 = vertical upright, >20 flexion)
  neckAngle: number; // degrees (flexion/extension relative to trunk)
  upperArmRight: number; // degrees (elevation relative to torso)
  upperArmLeft: number;
  lowerArmRight: number; // degrees (elbow angle)
  lowerArmLeft: number;
  wristRight: number; // degrees
  wristLeft: number;
  kneeRight: number; // degrees (knee flexion)
  kneeLeft: number;
  trunkLateralTwist: number; // degrees
}

export interface RulaBreakdown {
  upperArmScore: number; // 1-6
  lowerArmScore: number; // 1-3
  wristScore: number; // 1-4
  wristTwistScore: number; // 1-2
  wristArmScore: number; // Posture Score A
  neckScore: number; // 1-6
  trunkScore: number; // 1-6
  legScore: number; // 1-2
  neckTrunkLegScore: number; // Posture Score B
  muscleUseScoreA: number; // 0 or 1
  forceLoadScoreA: number; // 0 to 3
  scoreC: number;
  muscleUseScoreB: number; // 0 or 1
  forceLoadScoreB: number; // 0 to 3
  scoreD: number;
  grandScore: number; // 1 to 7
  riskLevel: 'Low' | 'Medium' | 'High' | 'Severe';
  actionLevel: string;
  primaryStrainedJoint: string;
}

export interface RebaBreakdown {
  trunkScore: number; // 1-5
  neckScore: number; // 1-3
  legScore: number; // 1-4
  scoreA: number; // Table A + load
  upperArmScore: number; // 1-6
  lowerArmScore: number; // 1-2
  wristScore: number; // 1-3
  scoreB: number; // Table B + coupling
  scoreC: number; // Table C
  activityScore: number; // 0 to 3
  grandScore: number; // 1 to 15
  riskLevel: 'Negligible' | 'Low' | 'Medium' | 'High' | 'Very High';
  actionLevel: string;
}

export interface SafetyZone {
  id: string;
  name: string;
  color: string;
  vertices: { x: number; y: number }[]; // Normalized 0-1 coordinates
  active: boolean;
  isBreached: boolean;
}

export interface TelemetryPoint {
  timestamp: number;
  rula: number;
  reba: number;
  fatigueIndex: number;
  trunkAngle: number;
  isBreached: boolean;
  isAwkwardHold: boolean;
}

export interface ShiftAuditReport {
  summary: string;
  riskLevel: string;
  biomechanicalAnalysis: string[];
  oshaCompliance: {
    standard: string;
    rating: string;
    recommendation: string;
  };
  actionPlan: string[];
  breakSchedule: {
    recommendedBreakMinutes: number;
    microBreakFrequency: string;
    targetedStretches: string[];
  };
}
