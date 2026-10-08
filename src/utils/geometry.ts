import { Landmark2D, JointAngles, PoseLandmarks } from '../types/ergonomics';

/**
 * Calculates 2D Euclidean distance between two points
 */
export function distance2D(a: Landmark2D, b: Landmark2D): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

/**
 * Calculates angle ABC (in degrees) with point B as the vertex
 * Vector BA and Vector BC
 */
export function calculateAngle(a: Landmark2D, b: Landmark2D, c: Landmark2D): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;

  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

/**
 * Calculates inclination angle of segment A->B relative to the vertical gravity vector [0, 1]
 * (0 degrees = perfectly upright/vertical, 90 degrees = horizontal)
 */
export function calculateVerticalAngle(top: Landmark2D, bottom: Landmark2D): number {
  const dx = top.x - bottom.x;
  const dy = top.y - bottom.y; // In screen space, down is +y
  // Vertical upright line going upwards from bottom has vector [0, -1]
  const vUpX = 0;
  const vUpY = -1;

  const dot = dx * vUpX + dy * vUpY;
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / mag));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

/**
 * MediaPipe Pose 33 Landmark Indices:
 * 0: nose
 * 11: left_shoulder, 12: right_shoulder
 * 13: left_elbow, 14: right_elbow
 * 15: left_wrist, 16: right_wrist
 * 23: left_hip, 24: right_hip
 * 25: left_knee, 26: right_knee
 * 27: left_ankle, 28: right_ankle
 */
export function extractJointAngles(landmarks: PoseLandmarks): JointAngles {
  if (!landmarks || landmarks.length < 29) {
    return {
      trunkFlexion: 12,
      neckAngle: 15,
      upperArmRight: 25,
      upperArmLeft: 20,
      lowerArmRight: 85,
      lowerArmLeft: 90,
      wristRight: 10,
      wristLeft: 10,
      kneeRight: 10,
      kneeLeft: 10,
      trunkLateralTwist: 0,
    };
  }

  const nose = landmarks[0];
  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];
  const lElbow = landmarks[13];
  const rElbow = landmarks[14];
  const lWrist = landmarks[15];
  const rWrist = landmarks[16];
  const lHip = landmarks[23];
  const rHip = landmarks[24];
  const lKnee = landmarks[25];
  const rKnee = landmarks[26];
  const lAnkle = landmarks[27];
  const rAnkle = landmarks[28];

  // Midpoints
  const midShoulder: Landmark2D = {
    x: (lShoulder.x + rShoulder.x) / 2,
    y: (lShoulder.y + rShoulder.y) / 2,
  };
  const midHip: Landmark2D = {
    x: (lHip.x + rHip.x) / 2,
    y: (lHip.y + rHip.y) / 2,
  };

  // Trunk flexion: angle between spine (midHip -> midShoulder) and vertical
  const trunkFlexion = Math.round(calculateVerticalAngle(midShoulder, midHip));

  // Neck angle: angle between neck (midShoulder -> nose) and spine vector
  // Normal neutral neck aligns with spine (180 deg or 0 deg deflection)
  const rawNeck = calculateAngle(nose, midShoulder, midHip);
  const neckAngle = Math.round(Math.abs(180 - rawNeck));

  // Upper arm elevation (Shoulder angle relative to trunk)
  const upperArmRight = Math.round(calculateAngle(rElbow, rShoulder, midHip));
  const upperArmLeft = Math.round(calculateAngle(lElbow, lShoulder, midHip));

  // Lower arm (Elbow angle: Shoulder - Elbow - Wrist)
  const lowerArmRight = Math.round(calculateAngle(rShoulder, rElbow, rWrist));
  const lowerArmLeft = Math.round(calculateAngle(lShoulder, lElbow, lWrist));

  // Knee flexion (Hip - Knee - Ankle)
  const rawKneeR = calculateAngle(rHip, rKnee, rAnkle);
  const rawKneeL = calculateAngle(lHip, lKnee, lAnkle);
  const kneeRight = Math.round(Math.abs(180 - rawKneeR));
  const kneeLeft = Math.round(Math.abs(180 - rawKneeL));

  // Wrist angle estimation (approximation based on alignment)
  const wristRight = Math.min(45, Math.max(5, Math.round(Math.abs(upperArmRight - lowerArmRight) * 0.2)));
  const wristLeft = Math.min(45, Math.max(5, Math.round(Math.abs(upperArmLeft - lowerArmLeft) * 0.2)));

  // Trunk lateral twist: difference in shoulder y vs hip y tilt
  const shoulderTilt = Math.abs(lShoulder.y - rShoulder.y);
  const trunkLateralTwist = Math.round(shoulderTilt * 100);

  return {
    trunkFlexion,
    neckAngle,
    upperArmRight,
    upperArmLeft,
    lowerArmRight,
    lowerArmLeft,
    wristRight,
    wristLeft,
    kneeRight,
    kneeLeft,
    trunkLateralTwist,
  };
}

/**
 * Standard Ray-Casting algorithm for 2D Point-in-Polygon check
 */
export function isPointInPolygon(
  pt: { x: number; y: number },
  poly: { x: number; y: number }[]
): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;

    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Checks if any critical body landmarks breach a polygon safety exclusion zone
 */
export function checkSafetyZoneBreach(
  landmarks: PoseLandmarks,
  zonePolygon: { x: number; y: number }[]
): { isBreached: boolean; breachedPoints: Landmark2D[] } {
  if (!landmarks || landmarks.length === 0 || zonePolygon.length < 3) {
    return { isBreached: false, breachedPoints: [] };
  }

  // Key inspection landmarks: wrists, ankles, hips, shoulders
  const criticalIndices = [15, 16, 27, 28, 23, 24, 11, 12];
  const breached: Landmark2D[] = [];

  for (const idx of criticalIndices) {
    const pt = landmarks[idx];
    if (pt && isPointInPolygon(pt, zonePolygon)) {
      breached.push(pt);
    }
  }

  return {
    isBreached: breached.length > 0,
    breachedPoints: breached,
  };
}

/**
 * Exponential Moving Average Filter for smoothing pose jitter across video frames
 */
export function smoothLandmarks(
  current: PoseLandmarks,
  previous: PoseLandmarks | null,
  alpha = 0.65
): PoseLandmarks {
  if (!previous || previous.length !== current.length) {
    return current;
  }

  return current.map((curr, i) => {
    const prev = previous[i];
    return {
      x: alpha * curr.x + (1 - alpha) * prev.x,
      y: alpha * curr.y + (1 - alpha) * prev.y,
      z: curr.z !== undefined && prev.z !== undefined ? alpha * curr.z + (1 - alpha) * prev.z : curr.z,
      visibility: curr.visibility,
      name: curr.name,
    };
  });
}
