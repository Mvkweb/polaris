import {
  createMemo,
  Match,
  Show,
  splitProps,
  Switch,
  type JSX,
} from "solid-js";

import type { DitherMatrix } from "@/lib/dither/matrices";
import { DitherPattern } from "@/lib/dither/pattern";
import {
  bloomFilter,
  bloomLayerStyle,
  ditherRamp,
  fillTile,
} from "@/lib/dither/style";
import type { Bloom, FillEdge, FillVariant } from "@/lib/dither/style";
import { cssColor } from "@/lib/dither/tokens";
import type { DitherColor } from "@/lib/dither/tokens";

/**
 * SVG and DOM pieces of the style kit: a pattern for every fill variant
 * and two ways to draw bloom. Server-safe.
 */

/** Where a gradient fill's dense edge sits, in SVG user units. */
export interface FillRamp {
  /** The dense side. */
  edge: FillEdge;
  /** Coordinate of that side: y for `top`/`bottom`, x for `left`/`right`. */
  at: number;
  /** How far the fade runs from the edge. */
  length: number;
  /** How far the fill reaches past the edge in total. Default `length`. Past the fade it holds `floor`. */
  extent?: number;
}

export interface FillPatternProps {
  /** The id to reference, as in `fill="url(#id)"`. */
  id: string;
  /** The texture. */
  fill: FillVariant;
  /** Colour: a palette name or any CSS colour. Default `ink`. */
  color?: DitherColor;
  /** Cell size in SVG user units. Default 3. */
  cell?: number;
  /** Gradient only: coverage at the dense edge, 0 to 1. Default 1. */
  level?: number;
  /** Gradient only: coverage at the far end of the fade. Default 0.0625. */
  floor?: number;
  /** Gradient only: threshold matrix. Default `bayer4`. */
  matrix?: DitherMatrix;
  /** Gradient only: where the dense edge sits. Without it, a gradient fills one even `level`. */
  ramp?: FillRamp;
}

/**
 * An SVG `<pattern>` for any fill variant. Place it inside `<defs>` and
 * fill shapes with `url(#id)`. To reuse one ramp at several positions (one
 * per bar), reference it with `<pattern id="b2" href="#id" y={top} />`.
 */
export const FillPattern = (props: FillPatternProps) => {
  const color = () => props.color ?? "ink";
  const cell = () => props.cell ?? 3;
  const level = () => props.level ?? 1;
  const floor = () => props.floor ?? 0.0625;
  const matrix = () => props.matrix ?? "bayer4";
  const ink = () => ({ fill: cssColor(color()) });

  const tile = createMemo(() => {
    if (props.fill === "dotted" || props.fill === "hatched") {
      return fillTile(props.fill);
    }
    return undefined;
  });

  const ramp = createMemo(() => {
    const r = props.ramp;
    if (!r) {
      return undefined;
    }
    const t = ditherRamp({
      edge: r.edge,
      extent: (r.extent ?? r.length) / cell(),
      from: level(),
      length: r.length / cell(),
      matrix: matrix(),
      to: floor(),
    });
    const width = t.width * cell();
    const height = t.height * cell();
    const origin = {
      bottom: { x: 0, y: r.at - height },
      left: { x: r.at, y: 0 },
      right: { x: r.at - width, y: 0 },
      top: { x: 0, y: r.at },
    }[r.edge];
    return { path: t.path, width, height, origin };
  });

  return (
    <Switch>
      <Match when={props.fill === "solid"}>
        <pattern
          id={props.id}
          width={cell()}
          height={cell()}
          patternUnits="userSpaceOnUse"
        >
          <rect width={cell()} height={cell()} style={ink()} />
        </pattern>
      </Match>
      <Match when={tile()}>
        {(t) => (
          <pattern
            id={props.id}
            width={t().size * cell()}
            height={t().size * cell()}
            patternUnits="userSpaceOnUse"
            shape-rendering="crispEdges"
          >
            <path d={t().path} transform={`scale(${cell()})`} style={ink()} />
          </pattern>
        )}
      </Match>
      <Match when={ramp()}>
        {(r) => (
          <pattern
            id={props.id}
            x={r().origin.x}
            y={r().origin.y}
            width={r().width}
            height={r().height}
            patternUnits="userSpaceOnUse"
            shape-rendering="crispEdges"
          >
            <path d={r().path} transform={`scale(${cell()})`} style={ink()} />
          </pattern>
        )}
      </Match>
      <Match when={true}>
        <DitherPattern
          id={props.id}
          level={level()}
          matrix={matrix()}
          cell={cell()}
          color={color()}
        />
      </Match>
    </Switch>
  );
};

export type BloomGroupProps = Omit<JSX.IntrinsicElements["g"], "style"> & {
  bloom: Bloom;
  style?: JSX.CSSProperties;
};

/**
 * An SVG group drawn as a glow: put solid copies of your shapes inside
 * and render it before (under) the real fills. Renders nothing when off.
 */
export const BloomGroup = (props: BloomGroupProps) => {
  const [local, rest] = splitProps(props, ["bloom", "style", "children"]);
  const layer = createMemo(() => bloomLayerStyle(local.bloom));
  return (
    <Show when={layer()}>
      {(l) => (
        <g
          aria-hidden="true"
          {...rest}
          style={
            typeof local.style === "object"
              ? { ...l(), ...local.style }
              : local.style
                ? `${local.style}; filter: ${l().filter}; opacity: ${l().opacity}`
                : l()
          }
        >
          {local.children}
        </g>
      )}
    </Show>
  );
};

export type BloomBoxProps = Omit<JSX.IntrinsicElements["div"], "style"> & {
  /** Glow colour: a palette name or any CSS colour. Default `ink`. */
  color?: DitherColor;
  bloom: Bloom;
  style?: JSX.CSSProperties;
};

/**
 * A wrapper that glows around whatever it holds, in `color`. A CSS
 * drop-shadow, so it follows dithered cells and transparent gaps.
 */
export const BloomBox = (props: BloomBoxProps) => {
  const [local, rest] = splitProps(props, ["color", "bloom", "style"]);
  return (
    <div
      {...rest}
      style={{
        filter: bloomFilter(local.color ?? "ink", local.bloom),
        ...local.style,
      }}
    />
  );
};
