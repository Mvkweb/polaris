import { Switch as SwitchPrimitive } from "@kobalte/core/switch";
import {
  createMemo,
  For,
  mergeProps,
  splitProps,
  type JSX,
} from "solid-js";

import { bloomStyle, cssColor, ditherMaskStyle, fillStyle } from "@/lib/dither";
import type { Bloom, DitherColor, FillVariant } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * Off, the track is a faint grey tint with a sparse grey texture inside a
 * hairline. On, it fills with ink as a wave: four copies of the colour,
 * each masked to a denser Bayer level, then the full lit surface (the
 * colour with a highlight dithered down from the top and a shade dithered
 * up from the bottom, as on Dither Button). Each layer is revealed from
 * the left by `clip-path`, a beat after the one below it, so the sparse
 * cells run ahead behind the thumb and the dense ones follow. Turning off
 * runs it backwards: the dense surface pulls back first and the sparse
 * levels drain after it. The clips and the thumb move on a staircase
 * curve with one step per cell, so nothing ever sits between cells.
 */

export type DitherSwitchSize = "sm" | "md" | "lg";

/** Target sizes in CSS pixels; each snaps to whole cells. */
const GEOMETRY = {
  lg: { height: 30, pad: 4, width: 54 },
  md: { height: 24, pad: 2, width: 42 },
  sm: { height: 20, pad: 2, width: 34 },
} as const satisfies Record<
  DitherSwitchSize,
  { height: number; pad: number; width: number }
>;

interface Geometry {
  width: number;
  height: number;
  pad: number;
  thumb: number;
  travel: number;
  radius: number;
  thumbRadius: number;
}

const snap = (px: number, cell: number) =>
  Math.max(cell, Math.round(px / cell) * cell);

const geometryOf = (size: DitherSwitchSize, cell: number): Geometry => {
  const target = GEOMETRY[size];
  const pad = snap(target.pad, cell);
  const height = Math.max(snap(target.height, cell), pad * 2 + cell * 2);
  const thumb = height - pad * 2;
  const width = Math.max(snap(target.width, cell), thumb + pad * 2 + cell * 2);
  const radius = Math.round(height * 0.32);
  return {
    height,
    pad,
    radius,
    thumb,
    thumbRadius: Math.max(2, radius - pad),
    travel: width - thumb - pad * 2,
    width,
  };
};

const EASE = [0.23, 1, 0.32, 1] as const;
const DURATION_MS = 180;
const STAGGER_MS = 20;

const bezier = (p1: number, p2: number, s: number) =>
  3 * p1 * s * (1 - s) ** 2 + 3 * p2 * s * s * (1 - s) + s ** 3;

const stairCache = new Map<number, string>();

const cellSteps = (steps: number): string => {
  const count = Math.max(1, Math.round(steps));
  const cached = stairCache.get(count);
  if (cached !== undefined) {
    return cached;
  }
  const SAMPLES = 720;
  const points = ["0 0%"];
  let step = 1;
  for (let index = 1; index <= SAMPLES && step <= count; index += 1) {
    const s = index / SAMPLES;
    const time = bezier(EASE[0], EASE[2], s);
    const progress = bezier(EASE[1], EASE[3], s);
    while (step <= count && progress >= (step - 0.5) / count) {
      const at = `${(time * 100).toFixed(2)}%`;
      points.push(
        `${((step - 1) / count).toFixed(4)} ${at}`,
        `${(step / count).toFixed(4)} ${at}`
      );
      step += 1;
    }
  }
  points.push("1 100%");
  const easing = `linear(${points.join(", ")})`;
  stairCache.set(count, easing);
  return easing;
};

const WAVE = [3 / 16, 6 / 16, 9 / 16, 12 / 16] as const;
const LAST = WAVE.length;

const STYLES = [
  ".dcn-switch{--dcn-knob:oklch(0.995 0 0);--dcn-knob-edge:oklch(0 0 0/0.2)}",
  ".dark .dcn-switch{--dcn-knob:oklch(0.94 0.004 270);--dcn-knob-edge:oklch(0 0 0/0.55)}",
  `.dcn-switch-wave{clip-path:inset(0 100% 0 0);transition:clip-path ${DURATION_MS}ms steps(var(--dcn-steps),jump-end);transition-delay:calc((${LAST} - var(--dcn-i)) * ${STAGGER_MS}ms)}`,
  `.dcn-switch[data-state=checked] .dcn-switch-wave,.dcn-switch[data-checked] .dcn-switch-wave{clip-path:inset(0 0 0 0);transition-delay:calc(var(--dcn-i) * ${STAGGER_MS}ms)}`,
  `.dcn-switch-thumb{transform:translateX(0);transition:transform ${DURATION_MS}ms steps(var(--dcn-steps),jump-end)}`,
  ".dcn-switch-thumb[data-state=checked],.dcn-switch-thumb[data-checked]{transform:translateX(var(--dcn-travel))}",
  ".dcn-switch-hover,.dcn-switch-press{opacity:0;transition:opacity 220ms cubic-bezier(0.23,1,0.32,1)}",
  "@media (hover:hover){.dcn-switch:not([data-disabled]):hover .dcn-switch-hover{opacity:var(--dcn-on,1)}}",
  ".dcn-switch:focus-visible .dcn-switch-hover{opacity:var(--dcn-on,1)}",
  ".dcn-switch:not([data-disabled]):active .dcn-switch-press{opacity:1;transition-duration:80ms}",
  "@media (prefers-reduced-motion:reduce){.dcn-switch-wave,.dcn-switch-thumb,.dcn-switch-hover,.dcn-switch-press{transition:none}}",
].join("");

type LayerStyle = JSX.CSSProperties & Record<`--${string}`, string | number>;

const cells = (rows: number, share: number) =>
  Math.max(2, Math.round(rows * share));

interface Paint {
  fill: FillVariant;
  cell: number;
  rows: number;
}

const shadeLayer = (
  { fill, cell, rows }: Paint,
  color: string
): JSX.CSSProperties => {
  switch (fill) {
    case "gradient": {
      return fillStyle("gradient", {
        cell,
        color,
        edge: "bottom",
        from: 1,
        length: cells(rows, 0.55),
        to: 0,
      });
    }
    case "dotted":
    case "hatched": {
      return { ...fillStyle(fill, { cell, color }), opacity: 0.55 };
    }
    case "solid": {
      return fillStyle("gradient", {
        cell,
        color,
        edge: "bottom",
        from: 1,
        length: 3,
        to: 0,
      });
    }
    default: {
      const exhaustive: never = fill;
      return exhaustive;
    }
  }
};

const restTexture = ({ fill, cell, rows }: Paint): JSX.CSSProperties => {
  const color = "grey";
  if (fill === "dotted" || fill === "hatched") {
    return { ...fillStyle(fill, { cell, color }), opacity: 0.45 };
  }
  return {
    ...fillStyle("gradient", {
      cell,
      color,
      edge: "bottom",
      from: fill === "solid" ? 0.25 : 0.5,
      length: cells(rows, 0.7),
      to: 0,
    }),
    opacity: 0.7,
  };
};

const highlight = (
  { cell, rows }: Paint,
  color: string,
  share: number,
  from: number
) =>
  fillStyle("gradient", {
    cell,
    color,
    edge: "top",
    from,
    length: cells(rows, share),
    to: 0,
  });

const LAYER = "absolute inset-0 rounded-[inherit]";

interface TrackProps extends Paint {
  color: DitherColor;
  bloom: Bloom;
  steps: number;
}

const Track = (props: TrackProps) => {
  const base = () => cssColor(props.color);
  const light = () => `color-mix(in oklab, ${base()}, white 42%)`;
  const dark = () => `color-mix(in oklab, ${base()}, black 48%)`;
  const easing = () => cellSteps(props.steps);
  const wave = (index: number): LayerStyle => ({
    "--dcn-i": index,
    "--dcn-steps": props.steps,
    "transition-timing-function": easing(),
  });
  return (
    <>
      <span
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        <span
          class={LAYER}
          style={{
            "background-color":
              "color-mix(in oklab, var(--dither-color-grey) 16%, transparent)",
          }}
        />
        <span class={LAYER} style={restTexture(props)} />
        <span
          class={cn(LAYER, "dcn-switch-hover")}
          style={fillStyle("gradient", {
            cell: props.cell,
            color: "grey",
            edge: "bottom",
            from: 0.75,
            length: props.rows,
            to: 0.0625,
          })}
        />
        <span
          class={LAYER}
          style={{
            "box-shadow":
              "inset 0 0 0 1px color-mix(in oklab, var(--dither-color-grey) 38%, transparent)",
          }}
        />
      </span>
      <span
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={bloomStyle(props.color, props.bloom)}
      >
        <span class="absolute inset-0 overflow-hidden rounded-[inherit]">
          <For each={WAVE}>
            {(level, index) => (
              <span
                class={cn(LAYER, "dcn-switch-wave")}
                style={{
                  ...ditherMaskStyle(level, { cell: props.cell }),
                  "background-color": base(),
                  ...wave(index()),
                }}
              />
            )}
          </For>
          <span class={cn(LAYER, "dcn-switch-wave")} style={wave(LAST)}>
            <span class={LAYER} style={{ "background-color": base() }} />
            <span class={LAYER} style={shadeLayer(props, dark())} />
            <span class={LAYER} style={highlight(props, light(), 0.25, 1)} />
            <span
              class={cn(LAYER, "dcn-switch-hover")}
              style={highlight(props, light(), 0.6, 1)}
            />
            <span
              class={LAYER}
              style={{
                "box-shadow": `inset 0 0 0 1px color-mix(in oklab, ${base()}, black 30%), inset 0 1px 0 color-mix(in oklab, ${base()}, white 55%)`,
              }}
            />
          </span>
        </span>
      </span>
    </>
  );
};

const Knob = (props: { cell: number; rows: number }) => {
  const paint = () => ({ cell: props.cell, fill: "gradient" as const, rows: props.rows });
  const knob = "var(--dcn-knob)";
  const shade = "color-mix(in oklab, var(--dcn-knob), black 24%)";
  return (
    <>
      <span
        class={LAYER}
        style={{
          ...ditherMaskStyle(0.5, { cell: props.cell }),
          "background-color": "oklch(0 0 0 / 0.45)",
          transform: `translateY(${props.cell}px)`,
        }}
      />
      <span class={LAYER} style={{ "background-color": knob }} />
      <span
        class={LAYER}
        style={fillStyle("gradient", {
          cell: props.cell,
          color: shade,
          edge: "bottom",
          from: 1,
          length: cells(props.rows, 0.4),
          to: 0,
        })}
      />
      <span class={LAYER} style={highlight(paint(), "white", 0.3, 1)} />
      <span
        class={cn(LAYER, "dcn-switch-hover")}
        style={highlight(paint(), "white", 0.6, 1)}
      />
      <span
        class={cn(LAYER, "dcn-switch-press")}
        style={fillStyle("gradient", {
          cell: props.cell,
          color: shade,
          edge: "top",
          from: 0.5,
          length: cells(props.rows, 0.5),
          to: 0,
        })}
      />
      <span
        class={LAYER}
        style={{ "box-shadow": "inset 0 0 0 1px var(--dcn-knob-edge)" }}
      />
    </>
  );
};

export interface DitherSwitchProps
  extends Omit<JSX.IntrinsicElements["button"], "color" | "onChange"> {
  /** Colour of the ink when on: a palette name or any CSS colour. Default `"ink"`. */
  color?: DitherColor;
  /** Texture of the shade when on and of the track when off: a Bayer ramp, a dot lattice, diagonals, or a thin rim. Default `"gradient"`. */
  fill?: FillVariant;
  /** Track of 34×20, 42×24 or 54×30 pixels. Default `"md"`. */
  size?: DitherSwitchSize;
  /** A soft glow in the ink's colour when on. Default `"off"`. */
  bloom?: Bloom;
  /** Size of one dither cell in CSS pixels. Default 2. */
  cell?: number;
  /** Checked state (controlled). */
  checked?: boolean;
  /** Initial checked state when uncontrolled. Default `false`. */
  defaultChecked?: boolean;
  /** Callback fired when checked state changes. */
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  value?: string;
}

/**
 * A switch whose track fills with dither when it turns on: the ink
 * steps in through the Bayer levels behind the thumb, sparse first and
 * dense after, and drains out the same way when it turns off. The thumb
 * is a lit, dithered knob. Every move lands on whole cells.
 */
export const DitherSwitch = (props: DitherSwitchProps) => {
  const merged = mergeProps(
    {
      color: "ink" as DitherColor,
      fill: "gradient" as FillVariant,
      size: "md" as DitherSwitchSize,
      bloom: "off" as Bloom,
      cell: 2,
    },
    props
  );

  const [local, rest] = splitProps(merged, [
    "color",
    "fill",
    "size",
    "bloom",
    "cell",
    "class",
    "style",
    "checked",
    "defaultChecked",
    "onChange",
    "disabled",
    "name",
    "value",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
  ]);

  const step = () => Math.max(1, Math.round(local.cell));
  const box = createMemo(() => geometryOf(local.size, step()));

  const rootStyle = createMemo<JSX.CSSProperties>(() => {
    const b = box();
    const custom =
      typeof local.style === "object" && local.style !== null
        ? (local.style as JSX.CSSProperties)
        : {};
    return {
      "border-radius": `${b.radius}px`,
      height: `${b.height}px`,
      width: `${b.width}px`,
      ...custom,
    };
  });

  const thumbStyle = createMemo<LayerStyle>(() => {
    const b = box();
    const st = step();
    return {
      "--dcn-steps": b.travel / st,
      "--dcn-travel": `${b.travel}px`,
      "border-radius": `${b.thumbRadius}px`,
      height: `${b.thumb}px`,
      left: `${b.pad}px`,
      top: `${b.pad}px`,
      "transition-timing-function": cellSteps(b.travel / st),
      width: `${b.thumb}px`,
    };
  });

  return (
    <>
      <style>{STYLES}</style>
      <SwitchPrimitive
        checked={local.checked}
        defaultChecked={local.defaultChecked}
        onChange={local.onChange}
        disabled={local.disabled}
        name={local.name}
        value={local.value}
        data-slot="switch"
        data-fill={local.fill}
        class="inline-flex"
        {...rest}
      >
        <SwitchPrimitive.Input
          class="peer sr-only"
          aria-label={local["aria-label"]}
          aria-labelledby={local["aria-labelledby"]}
          aria-describedby={local["aria-describedby"]}
        />
        <SwitchPrimitive.Control
          class={cn(
            "dcn-switch group/switch relative isolate inline-flex shrink-0 cursor-pointer items-center",
            "after:absolute after:-inset-x-1 after:-inset-y-2 after:content-['']",
            "outline-hidden peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-focus-visible:outline-solid",
            "data-disabled:cursor-not-allowed data-disabled:opacity-45 disabled:cursor-not-allowed disabled:opacity-45",
            local.class
          )}
          style={rootStyle()}
        >
          <Track
            color={local.color}
            bloom={local.bloom}
            fill={local.fill}
            cell={step()}
            rows={box().height / step()}
            steps={box().width / step()}
          />
          <SwitchPrimitive.Thumb
            data-slot="switch-thumb"
            class="dcn-switch-thumb pointer-events-none absolute block"
            style={thumbStyle()}
          >
            <Knob cell={step()} rows={box().thumb / step()} />
          </SwitchPrimitive.Thumb>
        </SwitchPrimitive.Control>
      </SwitchPrimitive>
    </>
  );
};
