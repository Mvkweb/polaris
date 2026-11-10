#!/usr/bin/env python3
"""
High-Precision Subpixel PNG to SVG Vectorizer
Uses Marching Squares with subpixel linear interpolation and
Philip J. Schneider's cubic Bézier curve fitting algorithm (Graphics Gems I).
"""

import sys
import os
import argparse
import numpy as np
from PIL import Image
import cairo

def normalize(v):
    norm = np.linalg.norm(v)
    if norm < 1e-9:
        return v
    return v / norm

def chord_length_parameterize(points):
    u = [0.0]
    for i in range(1, len(points)):
        u.append(u[i-1] + np.linalg.norm(points[i] - points[i-1]))
    total = u[-1]
    if total < 1e-9:
        return np.linspace(0, 1, len(points))
    return np.array(u) / total

def bezier_point(p0, p1, p2, p3, u):
    u = np.asarray(u)
    b0 = (1.0 - u)**3
    b1 = 3.0 * u * (1.0 - u)**2
    b2 = 3.0 * u**2 * (1.0 - u)
    b3 = u**3
    return np.outer(b0, p0) + np.outer(b1, p1) + np.outer(b2, p2) + np.outer(b3, p3)

def bezier_prime(p0, p1, p2, p3, u):
    u = np.asarray(u)
    b0 = -3.0 * (1.0 - u)**2
    b1 = 3.0 * (1.0 - u)**2 - 6.0 * u * (1.0 - u)
    b2 = 6.0 * u * (1.0 - u) - 3.0 * u**2
    b3 = 3.0 * u**2
    return np.outer(b0, p0) + np.outer(b1, p1) + np.outer(b2, p2) + np.outer(b3, p3)

def bezier_prime_prime(p0, p1, p2, p3, u):
    u = np.asarray(u)
    b0 = 6.0 * (1.0 - u)
    b1 = -12.0 * (1.0 - u) + 6.0 * u
    b2 = 6.0 * (1.0 - u) - 12.0 * u
    b3 = 6.0 * u
    return np.outer(b0, p0) + np.outer(b1, p1) + np.outer(b2, p2) + np.outer(b3, p3)

def generate_bezier(points, u, t_hat1, t_hat2):
    p0 = points[0]
    p3 = points[-1]
    
    b1 = 3.0 * u * (1.0 - u)**2
    b2 = 3.0 * u**2 * (1.0 - u)
    
    A = np.zeros((len(points), 2, 2))
    A[:, 0, :] = np.outer(b1, t_hat1)
    A[:, 1, :] = np.outer(b2, t_hat2)
    
    b0 = (1.0 - u)**3
    b3 = u**3
    
    part_fixed = np.outer(b0 + b1, p0) + np.outer(b2 + b3, p3)
    V = points - part_fixed
    
    A0 = A[:, 0, :]
    A1 = A[:, 1, :]
    
    c00 = np.sum(np.sum(A0 * A0, axis=1))
    c01 = np.sum(np.sum(A0 * A1, axis=1))
    c11 = np.sum(np.sum(A1 * A1, axis=1))
    
    x0 = np.sum(np.sum(A0 * V, axis=1))
    x1 = np.sum(np.sum(A1 * V, axis=1))
    
    det = c00 * c11 - c01 * c01
    seg_len = np.linalg.norm(p3 - p0)
    if abs(det) < 1e-12:
        dist = seg_len / 3.0
        return p0, p0 + t_hat1 * dist, p3 + t_hat2 * dist, p3
    
    alpha1 = (x0 * c11 - x1 * c01) / det
    alpha2 = (c00 * x1 - c01 * x0) / det
    
    if alpha1 <= 1e-6 or alpha2 <= 1e-6 or alpha1 > seg_len * 4.0 or alpha2 > seg_len * 4.0:
        dist = seg_len / 3.0
        return p0, p0 + t_hat1 * dist, p3 + t_hat2 * dist, p3
    
    p1 = p0 + t_hat1 * alpha1
    p2 = p3 + t_hat2 * alpha2
    return p0, p1, p2, p3

def reparameterize(p0, p1, p2, p3, points, u):
    new_u = []
    for i, pt in enumerate(points):
        ui = u[i]
        q = bezier_point(p0, p1, p2, p3, [ui])[0]
        qp = bezier_prime(p0, p1, p2, p3, [ui])[0]
        qpp = bezier_prime_prime(p0, p1, p2, p3, [ui])[0]
        diff = q - pt
        num = np.dot(diff, qp)
        den = np.dot(qp, qp) + np.dot(diff, qpp)
        if abs(den) > 1e-9:
            ui = ui - num / den
        new_u.append(np.clip(ui, 0.0, 1.0))
    return np.array(new_u)

def compute_max_error(points, p0, p1, p2, p3, u):
    pts_curve = bezier_point(p0, p1, p2, p3, u)
    dists = np.linalg.norm(points - pts_curve, axis=1)
    max_idx = np.argmax(dists)
    return dists[max_idx], max_idx

def fit_cubic(points, t_hat1, t_hat2, error_tol, depth=0, max_depth=16):
    if len(points) == 2:
        dist = np.linalg.norm(points[1] - points[0]) / 3.0
        return [(points[0], points[0] + t_hat1 * dist, points[1] + t_hat2 * dist, points[1])]
    
    u = chord_length_parameterize(points)
    p0, p1, p2, p3 = generate_bezier(points, u, t_hat1, t_hat2)
    max_err, split_idx = compute_max_error(points, p0, p1, p2, p3, u)
    
    if max_err < error_tol:
        return [(p0, p1, p2, p3)]
    
    if max_err < error_tol * 4.0 and depth < max_depth:
        for _ in range(4):
            u = reparameterize(p0, p1, p2, p3, points, u)
            p0, p1, p2, p3 = generate_bezier(points, u, t_hat1, t_hat2)
            max_err, split_idx = compute_max_error(points, p0, p1, p2, p3, u)
            if max_err < error_tol:
                return [(p0, p1, p2, p3)]
    
    if depth >= max_depth or split_idx <= 0 or split_idx >= len(points) - 1:
        split_idx = len(points) // 2
    
    k = min(5, split_idx, len(points) - 1 - split_idx)
    t_center = normalize(points[split_idx + k] - points[split_idx - k])
    
    left = fit_cubic(points[:split_idx+1], t_hat1, -t_center, error_tol, depth+1, max_depth)
    right = fit_cubic(points[split_idx:], t_center, t_hat2, error_tol, depth+1, max_depth)
    return left + right

def fit_closed_loop(loop_pts, error_tol):
    pts = np.array(loop_pts)
    pts = np.vstack([pts, pts[0:1]])
    t_start = normalize(pts[5] - pts[-6])
    curves = fit_cubic(pts, t_start, -t_start, error_tol)
    return curves

def extract_subpixel_contours(img_gray, threshold=None):
    arr = np.array(img_gray, dtype=float)
    H, W = arr.shape
    
    if threshold is None:
        bg = np.median(arr[arr < 50])
        fg = np.median(arr[arr > 200])
        threshold = (bg + fg) / 2.0
    
    def get_pt(edge_id):
        kind, r, c = edge_id
        if kind == 'H':
            v1, v2 = arr[r, c], arr[r, c+1]
            t = (threshold - v1) / (v2 - v1) if abs(v2 - v1) > 1e-6 else 0.5
            return (float(c + t), float(r))
        else:
            v1, v2 = arr[r, c], arr[r+1, c]
            t = (threshold - v1) / (v2 - v1) if abs(v2 - v1) > 1e-6 else 0.5
            return (float(c), float(r + t))
    
    lut = {
        1:  [('B', 'L')], 2:  [('R', 'B')], 3:  [('R', 'L')], 4:  [('T', 'R')],
        6:  [('T', 'B')], 7:  [('T', 'L')], 8:  [('L', 'T')], 9:  [('B', 'T')],
        11: [('R', 'T')], 12: [('L', 'R')], 13: [('B', 'R')], 14: [('L', 'B')]
    }
    
    edge_next = {}
    for r in range(H-1):
        for c in range(W-1):
            tl = arr[r, c] > threshold
            tr = arr[r, c+1] > threshold
            br = arr[r+1, c+1] > threshold
            bl = arr[r+1, c] > threshold
            code = (int(tl) << 3) | (int(tr) << 2) | (int(br) << 1) | int(bl)
            if code in lut:
                e_map = {'T': ('H', r, c), 'R': ('V', r, c+1), 'B': ('H', r+1, c), 'L': ('V', r, c)}
                for s_k, e_k in lut[code]:
                    s_edge, e_edge = e_map[s_k], e_map[e_k]
                    edge_next[s_edge] = e_edge
    
    visited = set()
    loops = []
    for start_edge in edge_next:
        if start_edge in visited:
            continue
        curr = start_edge
        loop = []
        while curr not in visited:
            visited.add(curr)
            loop.append(get_pt(curr))
            curr = edge_next.get(curr)
            if curr == start_edge:
                if len(loop) > 10: # filter noise
                    loops.append(loop)
                break
    
    # Sort loops from left to right by centroid x
    loops.sort(key=lambda l: np.mean([p[0] for p in l]))
    return loops, threshold

def curves_to_svg_path_data(curves, precision=2):
    d_parts = []
    start_pt = curves[0][0]
    d_parts.append(f"M {start_pt[0]:.{precision}f} {start_pt[1]:.{precision}f}")
    for p0, p1, p2, p3 in curves:
        d_parts.append(
            f"C {p1[0]:.{precision}f} {p1[1]:.{precision}f}, "
            f"{p2[0]:.{precision}f} {p2[1]:.{precision}f}, "
            f"{p3[0]:.{precision}f} {p3[1]:.{precision}f}"
        )
    d_parts.append("Z")
    return " ".join(d_parts)

def build_svg(paths_data, width, height, background=None, fill="white"):
    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">'
    ]
    if background:
        lines.append(f'  <rect width="100%" height="100%" fill="{background}"/>')
    
    for i, d in enumerate(paths_data):
        lines.append(f'  <path id="glyph-{i}" fill="{fill}" fill-rule="evenodd" d="{d}"/>')
    
    lines.append('</svg>')
    return "\n".join(lines)

def render_curves_cairo(all_curves, width, height):
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
    ctx = cairo.Context(surface)
    ctx.set_source_rgb(0, 0, 0)
    ctx.paint()
    ctx.set_source_rgb(1, 1, 1)
    
    for curves in all_curves:
        ctx.move_to(curves[0][0][0], curves[0][0][1])
        for p0, p1, p2, p3 in curves:
            ctx.curve_to(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1])
        ctx.close_path()
    ctx.fill()
    
    buf = surface.get_data()
    return np.ndarray(shape=(height, width, 4), dtype=np.uint8, buffer=buf)[:, :, 0]

def main():
    parser = argparse.ArgumentParser(description="Convert PNG to exact 1:1 SVG")
    parser.add_argument("input", help="Input PNG image path")
    parser.add_argument("-o", "--output", help="Output SVG path", default=None)
    parser.add_argument("-t", "--tolerance", type=float, default=0.35, help="Fitting tolerance in pixels (default: 0.35)")
    args = parser.parse_args()

    input_path = args.input
    img = Image.open(input_path).convert("L")
    W, H = img.size
    print(f"Loaded {input_path} ({W}x{H})")

    loops, thresh = extract_subpixel_contours(img)
    print(f"Extracted {len(loops)} closed subpixel loops (threshold={thresh:.1f})")

    all_curves = []
    paths_data = []
    total_segments = 0
    for i, loop in enumerate(loops):
        curves = fit_closed_loop(loop, args.tolerance)
        all_curves.append(curves)
        total_segments += len(curves)
        d = curves_to_svg_path_data(curves)
        paths_data.append(d)
        print(f"  Loop {i}: {len(loop)} sample points -> {len(curves)} smooth cubic Bézier segments")

    print(f"Total Bézier segments: {total_segments}")

    # Evaluate exact 1:1 fidelity against raster
    rendered_gray = render_curves_cairo(all_curves, W, H)
    arr = np.array(img, dtype=float)
    orig_bin = (arr > thresh).astype(np.uint8)
    rend_bin = (rendered_gray > 128).astype(np.uint8)

    intersection = np.sum((orig_bin == 1) & (rend_bin == 1))
    union = np.sum((orig_bin == 1) | (rend_bin == 1))
    iou = intersection / union * 100.0

    bg = np.median(arr[arr < 50])
    fg = np.median(arr[arr > 200])
    normalized_orig = np.clip((arr - bg) / (fg - bg) * 255.0, 0, 255)
    rmse = np.sqrt(np.mean((normalized_orig - rendered_gray) ** 2))
    diff_pixels = np.sum(orig_bin != rend_bin)

    print("\n--- 1:1 Verification Metrics ---")
    print(f"Overlap IoU (Intersection over Union): {iou:.4f}%")
    print(f"Grayscale Root Mean Square Error (RMSE): {rmse:.2f} / 255")
    print(f"Mismatched pixels: {diff_pixels} / {W*H} ({diff_pixels / (W*H) * 100:.4f}%)")

    # Generate SVGs:
    # 1. Clean transparent SVG
    svg_transparent = build_svg(paths_data, W, H, background=None, fill="currentColor")
    # 2. Dark background SVG matching source
    svg_dark = build_svg(paths_data, W, H, background="#050505", fill="#ffffff")

    out_base = args.output if args.output else os.path.splitext(input_path)[0] + ".svg"
    out_dir = os.path.dirname(out_base) or "."
    base_name = os.path.splitext(os.path.basename(out_base))[0]

    trans_path = os.path.join(out_dir, f"{base_name}.svg")
    dark_path = os.path.join(out_dir, f"{base_name}-dark.svg")

    with open(trans_path, "w", encoding="utf-8") as f:
        f.write(svg_transparent)
    print(f"\nSaved transparent SVG to: {trans_path}")

    with open(dark_path, "w", encoding="utf-8") as f:
        f.write(svg_dark)
    print(f"Saved dark-background SVG to: {dark_path}")

if __name__ == "__main__":
    main()
