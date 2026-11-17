"""
Industrial Ergonomic Framework Scoring Engine
Implements:
1. McAtamney & Corlett (1993) Rapid Upper Limb Assessment (RULA)
2. Hignett & McAtamney (2000) Rapid Entire Body Assessment (REBA)
"""
from typing import Dict, Any

# Standard RULA Table A [UpperArm 1-6][LowerArm 1-3][Wrist 1-4][WristTwist 1-2]
TABLE_A = [
    # Upper arm = 1
    [[[1, 2], [2, 2], [2, 3], [3, 3]], [[2, 2], [2, 2], [3, 3], [3, 3]], [[2, 3], [3, 3], [3, 3], [4, 4]]],
    # Upper arm = 2
    [[[2, 3], [3, 3], [3, 4], [4, 4]], [[3, 3], [3, 3], [3, 4], [4, 4]], [[3, 4], [4, 4], [4, 4], [5, 5]]],
    # Upper arm = 3
    [[[3, 3], [4, 4], [4, 4], [5, 5]], [[3, 4], [4, 4], [4, 4], [5, 5]], [[4, 4], [4, 5], [5, 5], [5, 6]]],
    # Upper arm = 4
    [[[4, 4], [4, 5], [5, 5], [5, 6]], [[4, 4], [4, 5], [5, 5], [6, 6]], [[4, 5], [5, 5], [6, 6], [7, 7]]],
    # Upper arm = 5
    [[[5, 5], [5, 6], [6, 7], [7, 7]], [[5, 6], [6, 6], [7, 7], [7, 8]], [[6, 6], [7, 7], [7, 8], [8, 8]]],
    # Upper arm = 6
    [[[7, 7], [7, 7], [8, 8], [8, 9]], [[8, 8], [8, 8], [8, 9], [9, 9]], [[9, 9], [9, 9], [9, 9], [9, 9]]],
]

# Standard RULA Table B [Neck 1-6][Trunk 1-6][Legs 1-2]
TABLE_B = [
    [[1, 3], [2, 3], [3, 4], [5, 5], [6, 6], [7, 7]],
    [[2, 3], [3, 4], [4, 5], [5, 5], [6, 7], [7, 7]],
    [[3, 3], [3, 4], [4, 5], [6, 6], [7, 7], [8, 8]],
    [[5, 5], [5, 6], [6, 7], [7, 7], [8, 8], [8, 8]],
    [[6, 6], [6, 7], [7, 7], [8, 8], [8, 8], [9, 9]],
    [[7, 7], [7, 8], [8, 8], [9, 9], [9, 9], [9, 9]],
]

# Standard RULA Table C [Score C 1-8+][Score D 1-7+] -> Grand Score 1-7
TABLE_C = [
    [1, 2, 3, 3, 4, 5, 5],
    [2, 2, 3, 4, 4, 5, 5],
    [3, 3, 3, 4, 4, 5, 6],
    [3, 3, 3, 4, 5, 6, 6],
    [4, 4, 4, 5, 6, 7, 7],
    [4, 4, 5, 6, 6, 7, 7],
    [5, 5, 6, 6, 7, 7, 7],
    [5, 5, 6, 7, 7, 7, 7],
]

# Standard REBA Tables
REBA_TABLE_A = [
    [[1, 2, 3, 4], [2, 3, 4, 5], [2, 4, 5, 6]],
    [[2, 3, 4, 5], [3, 4, 5, 6], [4, 5, 6, 7]],
    [[2, 4, 5, 6], [4, 5, 6, 7], [5, 6, 7, 8]],
    [[3, 5, 6, 7], [5, 6, 7, 8], [6, 7, 8, 9]],
    [[4, 6, 7, 8], [6, 7, 8, 9], [7, 8, 9, 9]],
]

REBA_TABLE_B = [
    [[1, 2, 2], [1, 2, 3]],
    [[1, 2, 3], [2, 3, 4]],
    [[3, 4, 5], [4, 5, 5]],
    [[4, 5, 5], [5, 6, 7]],
    [[6, 7, 8], [7, 8, 8]],
    [[7, 8, 8], [8, 9, 9]],
]

REBA_TABLE_C = [
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
]


def calculate_rula(angles: Dict[str, float], is_static: bool = False, load_kg: float = 3.0) -> Dict[str, Any]:
    """
    Computes exact RULA Grand Score and sub-component breakdown.
    """
    # 1. Upper Arm (1-6)
    max_upper_arm = max(angles.get("upperArmRight", 0.0), angles.get("upperArmLeft", 0.0))
    if max_upper_arm > 90.0:
        upper_arm_score = 4
    elif max_upper_arm > 45.0:
        upper_arm_score = 3
    elif max_upper_arm > 20.0:
        upper_arm_score = 2
    else:
        upper_arm_score = 1

    # Shoulder raised or abducted modifier
    if max_upper_arm > 75.0:
        upper_arm_score += 1
    upper_arm_score = min(6, max(1, upper_arm_score))

    # 2. Lower Arm (1-3)
    max_lower_arm = max(angles.get("lowerArmRight", 90.0), angles.get("lowerArmLeft", 90.0))
    lower_arm_score = 1 if (60.0 <= max_lower_arm <= 100.0) else 2

    # 3. Wrist & Twist (1-4, 1-2)
    max_wrist = max(angles.get("wristRight", 10.0), angles.get("wristLeft", 10.0))
    wrist_score = 3 if max_wrist > 15.0 else (2 if max_wrist > 5.0 else 1)
    wrist_twist = 2 if max_wrist > 25.0 else 1

    # Table A lookup
    score_a = TABLE_A[upper_arm_score - 1][lower_arm_score - 1][wrist_score - 1][wrist_twist - 1]
    muscle_a = 1 if is_static else 0
    force_a = 3 if load_kg > 10.0 else (1 if load_kg >= 2.0 else 0)
    score_c = min(8, score_a + muscle_a + force_a)

    # 4. Neck (1-6)
    neck_angle = angles.get("neckAngle", 10.0)
    neck_score = 3 if neck_angle > 20.0 else (2 if neck_angle > 10.0 else 1)

    # 5. Trunk (1-6)
    trunk_flexion = angles.get("trunkFlexion", 10.0)
    if trunk_flexion > 60.0:
        trunk_score = 4
    elif trunk_flexion > 20.0:
        trunk_score = 3
    elif trunk_flexion > 10.0:
        trunk_score = 2
    else:
        trunk_score = 1

    # Trunk lateral twist modifier
    if angles.get("trunkLateralTwist", 0.0) > 15.0:
        trunk_score += 1
    trunk_score = min(6, max(1, trunk_score))

    # 6. Legs (1-2)
    max_knee = max(angles.get("kneeRight", 10.0), angles.get("kneeLeft", 10.0))
    leg_score = 2 if max_knee > 60.0 else 1

    # Table B lookup
    score_b = TABLE_B[neck_score - 1][trunk_score - 1][leg_score - 1]
    score_d = min(7, score_b + muscle_a + force_a)

    # Table C Grand Score
    grand_score = TABLE_C[score_c - 1][score_d - 1]

    if grand_score >= 7:
        risk_level = "Severe"
        action = "Immediate engineering changes required."
        color = "#EF4444"
    elif grand_score >= 5:
        risk_level = "High"
        action = "Further investigation and changes required soon."
        color = "#F97316"
    elif grand_score >= 3:
        risk_level = "Medium"
        action = "Further investigation needed; changes may be required."
        color = "#F59E0B"
    else:
        risk_level = "Low"
        action = "Acceptable posture. No intervention needed."
        color = "#10B981"

    return {
        "grandScore": int(grand_score),
        "riskLevel": risk_level,
        "actionLevel": action,
        "color": color,
        "upperArmScore": upper_arm_score,
        "lowerArmScore": lower_arm_score,
        "wristScore": wrist_score,
        "neckScore": neck_score,
        "trunkScore": trunk_score,
        "legScore": leg_score,
        "scoreC": score_c,
        "scoreD": score_d,
    }


def calculate_reba(angles: Dict[str, float], is_repetitive: bool = False, load_kg: float = 3.0) -> Dict[str, Any]:
    """
    Computes exact REBA Grand Score (1-15 scale) and sub-component breakdown.
    """
    trunk_flexion = angles.get("trunkFlexion", 10.0)
    trunk_score = 4 if trunk_flexion > 60.0 else (3 if trunk_flexion > 20.0 else 2)
    
    neck_angle = angles.get("neckAngle", 10.0)
    neck_score = 2 if neck_angle > 20.0 else 1

    max_knee = max(angles.get("kneeRight", 10.0), angles.get("kneeLeft", 10.0))
    leg_score = 3 if max_knee > 60.0 else (2 if max_knee > 30.0 else 1)

    raw_table_a = REBA_TABLE_A[min(4, trunk_score - 1)][min(2, neck_score - 1)][min(2, leg_score - 1)]
    load_score = 2 if load_kg > 10.0 else (1 if load_kg >= 5.0 else 0)
    score_a = min(12, raw_table_a + load_score)

    max_upper_arm = max(angles.get("upperArmRight", 0.0), angles.get("upperArmLeft", 0.0))
    upper_arm_score = 4 if max_upper_arm > 90.0 else (3 if max_upper_arm > 45.0 else (2 if max_upper_arm > 20.0 else 1))
    
    max_lower_arm = max(angles.get("lowerArmRight", 90.0), angles.get("lowerArmLeft", 90.0))
    lower_arm_score = 1 if (60.0 <= max_lower_arm <= 100.0) else 2

    max_wrist = max(angles.get("wristRight", 10.0), angles.get("wristLeft", 10.0))
    wrist_score = 2 if max_wrist > 15.0 else 1

    raw_table_b = REBA_TABLE_B[min(5, upper_arm_score - 1)][min(1, lower_arm_score - 1)][min(1, wrist_score - 1)]
    score_b = min(12, raw_table_b)

    score_c = REBA_TABLE_C[score_a - 1][score_b - 1]
    activity_score = 1 if is_repetitive else 0
    grand_score = min(15, score_c + activity_score)

    if grand_score >= 11:
        risk = "Very High"
        action = "Implement changes immediately."
        color = "#DC2626"
    elif grand_score >= 8:
        risk = "High"
        action = "Investigate and implement change soon."
        color = "#EA580C"
    elif grand_score >= 4:
        risk = "Medium"
        action = "Further investigation and change necessary."
        color = "#D97706"
    elif grand_score >= 2:
        risk = "Low"
        action = "Change may be needed."
        color = "#65A30D"
    else:
        risk = "Negligible"
        action = "No action required."
        color = "#10B981"

    return {
        "grandScore": int(grand_score),
        "riskLevel": risk,
        "actionLevel": action,
        "color": color,
        "scoreA": score_a,
        "scoreB": score_b,
        "scoreC": score_c,
        "activityScore": activity_score,
    }
