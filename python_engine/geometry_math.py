"""
Biomechanical 3D Geometry and Vector Mathematics Module
Supports both NumPy and pure Python math for zero-dependency portability.
"""
import math

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

def calculate_angle_3d(a, b, c) -> float:
    """
    Computes 3D angle (in degrees) at vertex B between vectors BA and BC.
    cos(theta) = (BA . BC) / (|BA| * |BC|)
    """
    ax, ay = a[0], a[1]
    bx, by = b[0], b[1]
    cx, cy = c[0], c[1]
    az = a[2] if len(a) > 2 else 0.0
    bz = b[2] if len(b) > 2 else 0.0
    cz = c[2] if len(c) > 2 else 0.0

    bax = ax - bx
    bay = ay - by
    baz = az - bz

    bcx = cx - bx
    bcy = cy - by
    bcz = cz - bz

    dot = bax * bcx + bay * bcy + baz * bcz
    norm_ba = math.sqrt(bax * bax + bay * bay + baz * baz)
    norm_bc = math.sqrt(bcx * bcx + bcy * bcy + bcz * bcz)

    if norm_ba < 1e-6 or norm_bc < 1e-6:
        return 0.0

    cos_val = max(-1.0, min(1.0, dot / (norm_ba * norm_bc)))
    return float(math.degrees(math.acos(cos_val)))

def calculate_vertical_inclination(top, bottom) -> float:
    """
    Computes inclination angle (in degrees) of a body segment relative to vertical [0, -1].
    Upright vertical corresponds to 0 degrees.
    """
    dx = top[0] - bottom[0]
    dy = top[1] - bottom[1]

    # In screen coordinates, up is -y, so upward vector is [0, -1]
    dot = dy * -1.0
    norm = math.sqrt(dx * dx + dy * dy)

    if norm < 1e-6:
        return 0.0

    cos_val = max(-1.0, min(1.0, dot / norm))
    return float(math.degrees(math.acos(cos_val)))

def point_in_polygon(point: tuple, polygon: list) -> bool:
    """
    Ray-casting algorithm to test if (x, y) is inside a polygon [(x1, y1), (x2, y2), ...]
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

def smooth_landmarks(current, previous, alpha: float = 0.65):
    """
    Exponential moving average filter to remove tracking jitter.
    """
    if previous is None or len(previous) != len(current):
        return current

    smoothed = []
    for c, p in zip(current, previous):
        cx, cy = c[0], c[1]
        px, py = p[0], p[1]
        cz = c[2] if len(c) > 2 else 0.0
        pz = p[2] if len(p) > 2 else 0.0
        smoothed.append([
            alpha * cx + (1.0 - alpha) * px,
            alpha * cy + (1.0 - alpha) * py,
            alpha * cz + (1.0 - alpha) * pz,
        ])
    return smoothed
