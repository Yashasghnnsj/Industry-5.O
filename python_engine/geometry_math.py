"""
Biomechanical 3D Geometry and Vector Mathematics Module
Leverages NumPy and SciPy for robust 3D vector geometry, kinematic angles,
spatial transformations, smoothing filters, and polygon collision detection.
"""
import math
import numpy as np
from typing import Tuple, List, Optional, Union

try:
    from scipy.spatial.transform import Rotation
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False


def vector_norm(v: np.ndarray) -> float:
    """Calculates Euclidean L2 norm of a vector."""
    return float(np.linalg.norm(v))


def calculate_angle_3d(a: Union[List[float], np.ndarray], 
                       b: Union[List[float], np.ndarray], 
                       c: Union[List[float], np.ndarray]) -> float:
    """
    Computes 3D angle (in degrees) at vertex B between vectors BA and BC.
    cos(theta) = (BA . BC) / (|BA| * |BC|)
    """
    a_arr = np.asarray(a, dtype=np.float64)[:3]
    b_arr = np.asarray(b, dtype=np.float64)[:3]
    c_arr = np.asarray(c, dtype=np.float64)[:3]

    ba = a_arr - b_arr
    bc = c_arr - b_arr

    norm_ba = np.linalg.norm(ba)
    norm_bc = np.linalg.norm(bc)

    if norm_ba < 1e-7 or norm_bc < 1e-7:
        return 0.0

    dot = np.dot(ba, bc)
    cos_val = np.clip(dot / (norm_ba * norm_bc), -1.0, 1.0)
    return float(np.degrees(np.arccos(cos_val)))


def calculate_vertical_inclination(top: Union[List[float], np.ndarray], 
                                   bottom: Union[List[float], np.ndarray]) -> float:
    """
    Computes inclination angle (in degrees) of a body segment relative to vertical gravity vector [0, -1, 0].
    Upright posture corresponds to 0 degrees.
    """
    top_arr = np.asarray(top, dtype=np.float64)[:3]
    bottom_arr = np.asarray(bottom, dtype=np.float64)[:3]

    seg = top_arr - bottom_arr
    
    # In normalized camera/screen space, down is +y, up is -y.
    # Vertical upward vector is [0, -1, 0]
    up_vector = np.array([0.0, -1.0, 0.0], dtype=np.float64)
    if len(seg) == 2:
        up_vector = up_vector[:2]

    norm_seg = np.linalg.norm(seg)
    if norm_seg < 1e-7:
        return 0.0

    dot = np.dot(seg, up_vector)
    cos_val = np.clip(dot / norm_seg, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos_val)))


def calculate_sagittal_inclination(p1: np.ndarray, p2: np.ndarray) -> float:
    """
    Computes sagittal forward/backward bending angle (in Y-Z projection).
    """
    dy = p1[1] - p2[1]
    dz = (p1[2] - p2[2]) if len(p1) > 2 else 0.0
    return float(np.degrees(np.arctan2(abs(dz), abs(dy) + 1e-7)))


def point_in_polygon(point: Tuple[float, float], polygon: List[Tuple[float, float]]) -> bool:
    """
    Ray-casting algorithm to test if a 2D normalized coordinate (x, y) 
    lies within a polygon [(x1, y1), (x2, y2), ...].
    """
    x, y = point[0], point[1]
    inside = False
    n = len(polygon)
    if n < 3:
        return False

    p1x, p1y = polygon[0][0], polygon[0][1]
    for i in range(n + 1):
        p2 = polygon[i % n]
        p2x, p2y = p2[0], p2[1]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside


def smooth_landmarks(current: np.ndarray, 
                     previous: Optional[np.ndarray], 
                     alpha: float = 0.70) -> np.ndarray:
    """
    Exponential Moving Average (EMA) filter across 33 3D landmarks
    to eliminate frame-to-frame computer vision jitter while preserving rapid biomechanical transitions.
    """
    if previous is None or current.shape != previous.shape:
        return current.copy()

    # EMA: y[t] = alpha * x[t] + (1 - alpha) * y[t-1]
    return alpha * current + (1.0 - alpha) * previous
