import type { JSX } from "solid-js";

import { getThresholdMap } from "@/lib/dither/matrices";
import type { DitherMatrix } from "@/lib/dither/matrices";
import { cssColor } from "@/lib/dither/tokens";
import type { DitherColor } from "@/lib/dither/tokens";

/**
 * Static dithers without a canvas: an SVG `<pattern>` for chart fills and a
 * CSS mask for any element. Both are pure and render on the server.
 * `level` is the share of cells inked, from 0 (none) to 1 (all).
 */

const pathCache = new Map<string, string>();

/**
 * One SVG path covering the inked cells of one matrix tile, in cell units.
 * Runs of neighbouring cells in a row merge into one rectangle.
 */
export const ditherPath = (level: number, matrix: DitherMatrix = "bayer4") => {
  const key = `${matrix}:${level}`;
  const cached = pathCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const { size, thresholds } = getThresholdMap(matrix);
  let path = "";
  for (let y = 0; y < size; y += 1) {
    let start = -1;
    for (let x = 0; x <= size; x += 1) {
      const inked = x < size && level > (thresholds[y * size + x] ?? 1);
      if (inked && start === -1) {
        start = x;
      } else if (!inked && start !== -1) {
        path += `M${start} ${y}h${x - start}v1h${start - x}z`;
        start = -1;
      }
    }
  }
  pathCache.set(key, path);
  return path;
};

export interface DitherMaskOptions {
  /** Threshold matrix. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /**
   * Cell size in CSS pixels. When set, the image has that intrinsic size
   * and tiles without a `mask-size`. Leave it unset to size the tile
   * yourself, for example with `ditherMaskStyle`.
   */
  cell?: number;
}

/**
 * A CSS `mask-image` value: one matrix tile with the cells below `level`
 * filled. Paint the element with the ink colour and mask it.
 */
export const ditherMask = (
  level: number,
  { matrix = "bayer4", cell }: DitherMaskOptions = {}
) => {
  const { size } = getThresholdMap(matrix);
  const dimensions =
    cell === undefined ? "" : ` width="${size * cell}" height="${size * cell}"`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"${dimensions} shape-rendering="crispEdges"><path d="${ditherPath(level, matrix)}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

export interface DitherMaskStyleOptions {
  /** Threshold matrix. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Cell size: CSS pixels, or any CSS length. Default `var(--dither-cell)`. */
  cell?: number | string;
}

/**
 * Inline styles that mask an element to one dither level, tiled at the
 * cell size. Pair with a background colour such as `bg-dither-ink`.
 *
 * ```tsx
 * <div class="bg-dither-ink" style={ditherMaskStyle(0.5)} />
 * ```
 */
export const ditherMaskStyle = (
  level: number,
  {
    matrix = "bayer4",
    cell = "var(--dither-cell)",
  }: DitherMaskStyleOptions = {}
): JSX.CSSProperties => {
  const { size } = getThresholdMap(matrix);
  const image = ditherMask(level, { matrix });
  const tile =
    typeof cell === "number" ? `${size * cell}px` : `calc(${cell} * ${size})`;
  return {
    "-webkit-mask-image": image,
    "-webkit-mask-repeat": "repeat",
    "-webkit-mask-size": tile,
    "mask-image": image,
    "mask-repeat": "repeat",
    "mask-size": tile,
  };
};

export interface DitherPatternProps {
  /** The id to reference, as in `fill="url(#id)"`. */
  id: string;
  /** Share of cells inked, 0 to 1. */
  level: number;
  /** Threshold matrix. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Cell size in SVG user units (CSS pixels when the SVG is not scaled). Default 3. */
  cell?: number;
  /** Ink colour. Default `--dither-ink`. */
  color?: DitherColor;
  /** Colour behind the ink. Default: transparent. */
  background?: DitherColor;
}

/**
 * An SVG `<pattern>` filled with one dither level. Place it inside `<defs>`
 * and fill shapes with `url(#id)`. Colours accept CSS variables, so the
 * fill follows the theme.
 */
export const DitherPattern = (props: DitherPatternProps) => {
  const matrix = () => props.matrix ?? "bayer4";
  const cell = () => props.cell ?? 3;
  const tile = () => getThresholdMap(matrix()).size * cell();
  const color = () => props.color ?? "--dither-ink";

  return (
    <pattern
      id={props.id}
      width={tile()}
      height={tile()}
      patternUnits="userSpaceOnUse"
      shape-rendering="crispEdges"
    >
      {props.background === undefined ? null : (
        <rect
          width={tile()}
          height={tile()}
          style={{ fill: cssColor(props.background) }}
        />
      )}
      <path
        d={ditherPath(props.level, matrix())}
        transform={`scale(${cell()})`}
        style={{ fill: cssColor(color()) }}
      />
    </pattern>
  );
};
