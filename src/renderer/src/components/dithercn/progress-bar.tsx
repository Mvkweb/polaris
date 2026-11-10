import {
  createEffect,
  createUniqueId,
  For,
  mergeProps,
  onCleanup,
  Show,
  splitProps,
  type JSX,
} from "solid-js";

import {
  bloomFilter,
  createPrefersReducedMotion,
  cssColor,
  fillStyle,
  MOTION,
  SERIES_COLORS,
} from "@/lib/dither";
import type { Bloom, DitherColor, FillVariant } from "@/lib/dither";
import { cn } from "@/lib/utils";

export type ProgressBarSize = "sm" | "md" | "lg";

/** One part of a stacked bar, such as one file type in a storage quota. */
export interface ProgressPart {
  /** Name in the legend and for screen readers. */
  label: string;
  /** Size of the part, in the same units as `max`. */
  value: number;
  /** Colour: a palette name or any CSS colour. Default: the next palette colour. */
  color?: DitherColor;
  /** Texture of this part. Default: the bar's `fill`. */
  fill?: FillVariant;
}

interface ProgressShared {
  /** What is in progress. Shown above the bar and used as its accessible name. */
  label: string;
  /** The value that means done (or the capacity, for parts). Default 100. */
  max?: number;
  /** Text for the readout and screen readers. Default: the percentage. */
  valueText?: string;
  /** Keep the label and readout for screen readers only. Default false. */
  hideLabel?: boolean;
  /** Bar height: 2, 4 or 6 cells. Default `"md"`. */
  size?: ProgressBarSize;
  /** Texture of the fill: `gradient` (densest at the leading edge), `dotted`, `hatched` or `solid`. Default `gradient`. */
  fill?: FillVariant;
  /** Colour of the fill and track: a palette name or any CSS colour. Default `ink`. */
  color?: DitherColor;
  /** Soft glow in the fill's colour: `off`, `low` or `high`. Default `off`. */
  bloom?: Bloom;
  /** Split the bar into this many blocks with a one-cell gap, like a step meter. Default: one continuous bar. */
  segments?: number;
  /** Grow to the value on mount and ease between values. Default true; off under reduced motion. */
  animate?: boolean;
  /** Dither cell in CSS pixels. Default `--dither-cell`. */
  cell?: number;
}

/** One value from 0 to `max`, or indeterminate when `value` is left out. */
export interface SingleProgressProps extends ProgressShared {
  /** Progress from 0 to `max`. Leave it out (or pass null) for an indeterminate bar. */
  value?: number | null;
  parts?: never;
  unit?: never;
}

/** Several parts stacked left to right, with a legend under the bar. */
export interface StackedProgressProps extends ProgressShared {
  /** The parts, left to right. Their sum is the total against `max`. */
  parts: readonly ProgressPart[];
  /** Shown after each part's value in the legend, such as `" GB"`. */
  unit?: string;
  value?: never;
}

export type ProgressBarProps = Omit<JSX.IntrinsicElements["div"], "children"> &
  (SingleProgressProps | StackedProgressProps);

const ROWS = { lg: 6, md: 4, sm: 2 } as const satisfies Record<
  ProgressBarSize,
  number
>;

/** Length of the gradient's fade, in cells, behind the leading edge. */
const FADE_CELLS = 36;
const SWEEP_MS = 1700;
/** Width of the indeterminate comet, as a share of the track. */
const COMET = 0.34;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const cellLength = (cell: number | undefined) =>
  cell === undefined ? "var(--dither-cell)" : `${cell}px`;

const times = (cell: string, count: number) => `calc(${cell} * ${count})`;

/** A tiled mask that cuts the bar into `segments` blocks one cell apart. */
const segmentMask = (
  segments: number | undefined,
  cell: string
): JSX.CSSProperties => {
  if (segments === undefined || segments < 2) {
    return {};
  }
  const image = `linear-gradient(90deg, #000 calc(100% - ${cell}), transparent 0)`;
  const size = `calc((100% + ${cell}) / ${Math.round(segments)}) 100%`;
  return {
    "-webkit-mask-image": image,
    "-webkit-mask-repeat": "repeat-x",
    "-webkit-mask-size": size,
    "mask-image": image,
    "mask-repeat": "repeat-x",
    "mask-size": size,
  };
};

/**
 * A filled run of the bar: the texture, plus a one-cell solid cap on the
 * leading edge so the value reads exactly even in sparse textures.
 */
const FillRun = (props: {
  fill: FillVariant;
  color: DitherColor;
  cell: string;
  cap: boolean;
}) => (
  <>
    <div
      class="absolute inset-0"
      style={fillStyle(props.fill, {
        cell: props.cell,
        color: props.color,
        edge: "right",
        from: 1,
        length: FADE_CELLS,
        to: 5 / 16,
      })}
    />
    <Show when={props.cap && props.fill !== "solid"}>
      <div
        class="absolute inset-y-0 right-0"
        style={{
          "background-color": cssColor(props.color),
          width: props.cell,
        }}
      />
    </Show>
  </>
);

const growClass = (animate: boolean) =>
  animate
    ? "transition-[width] motion-reduce:transition-none starting:w-0"
    : "";

const growStyle = (animate: boolean): JSX.CSSProperties =>
  animate
    ? {
        "transition-duration": `${MOTION.slow}ms`,
        "transition-timing-function": MOTION.ease,
      }
    : {};

/** The indeterminate comet: a dense head with a dithered tail, swept by transform. */
const Comet = (props: {
  fill: FillVariant;
  color: DitherColor;
  cell: string;
}) => {
  let ref: HTMLDivElement | undefined;
  const reduced = createPrefersReducedMotion();

  createEffect(() => {
    const el = ref;
    if (!el || reduced()) {
      return;
    }
    // Travel from fully left of the track to fully right of it: the
    // transform is in the comet's own widths.
    const end = `${((1 / COMET) * 100).toFixed(1)}%`;
    const animation = el.animate(
      [
        { transform: "translateX(-100%)" },
        { transform: `translateX(${end})` },
      ],
      {
        duration: SWEEP_MS,
        easing: "cubic-bezier(0.65, 0, 0.35, 1)",
        iterations: Number.POSITIVE_INFINITY,
      }
    );
    onCleanup(() => animation.cancel());
  });

  return (
    <div
      ref={ref}
      class="absolute inset-y-0 left-0 will-change-transform"
      style={{
        // Still frame under reduced motion: the comet rests mid-track.
        transform: `translateX(${(((1 - COMET) / 2 / COMET) * 100).toFixed(1)}%)`,
        width: `${COMET * 100}%`,
      }}
    >
      <FillRun fill={props.fill} color={props.color} cell={props.cell} cap />
    </div>
  );
};

interface StackedPart extends ProgressPart {
  color: DitherColor;
  share: number;
}

/** Parts with their colours and shares of `max`, clipped to the track. */
const stackParts = ({
  parts,
  max,
}: {
  parts: readonly ProgressPart[];
  max: number;
}) => {
  let room = 1;
  return parts.map((part, index): StackedPart => {
    const share = Math.min(room, clamp01(Math.max(0, part.value) / max));
    room -= share;
    return {
      ...part,
      color: part.color ?? SERIES_COLORS[index % SERIES_COLORS.length] ?? "ink",
      share,
    };
  });
};

/** The stacked parts, left to right, a cell apart. */
const Parts = (props: {
  parts: readonly StackedPart[];
  fill: FillVariant;
  cell: string;
  bloom: Bloom;
  animate: boolean;
}) => (
  <div class="absolute inset-0 flex">
    <For each={props.parts}>
      {(part) => (
        <Show when={part.share > 0}>
          <div
            class={cn("relative h-full shrink-0", growClass(props.animate))}
            style={{
              width: `${part.share * 100}%`,
              ...growStyle(props.animate),
            }}
          >
            <div
              class="absolute inset-y-0 left-0"
              style={{
                filter: bloomFilter(part.color, props.bloom),
                right: props.cell,
              }}
            >
              <FillRun
                fill={part.fill ?? props.fill}
                color={part.color}
                cell={props.cell}
                cap
              />
            </div>
          </div>
        </Show>
      )}
    </For>
  </div>
);

/** Swatch, label and value for each part, under a stacked bar. */
const PartsLegend = (props: {
  parts: readonly StackedPart[];
  formatValue: (value: number) => string;
}) => (
  <ul class="flex flex-wrap gap-x-4 gap-y-1">
    <For each={props.parts}>
      {(part) => (
        <li class="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span
            aria-hidden="true"
            class="size-2 shrink-0 rounded-[2px]"
            style={{ background: cssColor(part.color) }}
          />
          <span class="text-foreground">{part.label}</span>
          <span class="font-mono tabular-nums">
            {props.formatValue(part.value)}
          </span>
        </li>
      )}
    </For>
  </ul>
);

const number = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });

/** Aria value props for a determinate or indeterminate bar. */
const ariaValues = ({
  determinate,
  current,
  max,
  readout,
  valueText,
}: {
  determinate: boolean;
  current: number;
  max: number;
  readout: string;
  valueText: string | undefined;
}) =>
  determinate
    ? {
        "aria-valuemax": max,
        "aria-valuemin": 0,
        "aria-valuenow": current,
        "aria-valuetext": readout,
      }
    : { "aria-valuetext": valueText };

/** The bar itself: track, then the fill, parts or comet, cut into segments. */
const Track = (props: {
  ratio: number | null;
  parts: readonly StackedPart[] | null;
  fill: FillVariant;
  color: DitherColor;
  bloom: Bloom;
  segments: number | undefined;
  animate: boolean;
  size: ProgressBarSize;
  cell: string;
}) => (
  <div aria-hidden="true" class="relative">
    <div
      class="relative w-full overflow-hidden rounded-full"
      style={{
        height: times(props.cell, ROWS[props.size]),
        ...segmentMask(props.segments, props.cell),
      }}
    >
      <div
        class="absolute inset-0"
        style={{
          "background-color": `color-mix(in oklab, ${cssColor(props.parts === null ? props.color : "grey")} 16%, transparent)`,
        }}
      />
      <Show
        when={props.parts !== null}
        fallback={
          <Show
            when={props.ratio !== null}
            fallback={
              <Comet
                fill={props.fill}
                color={props.color}
                cell={props.cell}
              />
            }
          >
            <div
              class={cn(
                "absolute inset-y-0 left-0",
                growClass(props.animate)
              )}
              style={{
                filter: bloomFilter(props.color, props.bloom),
                width: `${props.ratio! * 100}%`,
                ...growStyle(props.animate),
              }}
            >
              <FillRun
                fill={props.fill}
                color={props.color}
                cell={props.cell}
                cap={props.ratio! > 0}
              />
            </div>
          </Show>
        }
      >
        <Parts
          parts={props.parts!}
          fill={props.fill}
          cell={props.cell}
          bloom={props.bloom}
          animate={props.animate}
        />
      </Show>
    </div>
  </div>
);

/**
 * A progress bar built from dither cells. With a `value` the fill grows to
 * it, densest at its leading edge and capped with a solid cell; without
 * one a dithered comet sweeps the track. `parts` stacks several values,
 * each in its own colour, with a legend. `segments` cuts the bar into
 * blocks for step meters.
 */
export const ProgressBar = (props: ProgressBarProps) => {
  const merged = mergeProps(
    {
      unit: "",
      max: 100,
      hideLabel: false,
      size: "md" as ProgressBarSize,
      fill: "gradient" as FillVariant,
      color: "ink" as DitherColor,
      bloom: "off" as Bloom,
      animate: true,
    },
    props
  );

  const [local, others] = splitProps(merged, [
    "label",
    "value",
    "parts",
    "unit",
    "max",
    "valueText",
    "hideLabel",
    "size",
    "fill",
    "color",
    "bloom",
    "segments",
    "animate",
    "cell",
    "class",
  ]);

  const labelId = createUniqueId();
  const limit = () => Math.max(local.max, 1e-9);
  const stacked = () =>
    local.parts === undefined
      ? null
      : stackParts({ max: limit(), parts: local.parts });

  const total = () =>
    local.parts === undefined
      ? (local.value ?? 0)
      : local.parts.reduce(
          (sum: number, part: ProgressPart) => sum + Math.max(0, part.value),
          0
        );

  const determinate = () =>
    stacked() !== null || typeof local.value === "number";
  const ratio = () => (determinate() ? clamp01(total() / limit()) : null);
  const readout = () =>
    local.valueText ?? `${Math.round((ratio() ?? 0) * 100)}%`;
  const length = () => cellLength(local.cell);

  return (
    <div
      role="progressbar"
      aria-labelledby={labelId}
      {...ariaValues({
        current: Math.min(local.max, Math.max(0, total())),
        determinate: determinate(),
        max: local.max,
        readout: readout(),
        valueText: local.valueText,
      })}
      class={cn("flex w-full flex-col gap-2", local.class)}
      {...others}
    >
      <div
        class={cn(
          "flex items-baseline justify-between gap-4 text-sm",
          local.hideLabel && "sr-only"
        )}
      >
        <span id={labelId} class="text-foreground min-w-0 truncate">
          {local.label}
        </span>
        <Show when={determinate() || local.valueText}>
          <span
            aria-hidden="true"
            class="text-muted-foreground shrink-0 font-mono text-xs tabular-nums"
          >
            {readout()}
          </span>
        </Show>
      </div>
      <Track
        ratio={ratio()}
        parts={stacked()}
        fill={local.fill}
        color={local.color}
        bloom={local.bloom}
        segments={local.segments}
        animate={local.animate}
        size={local.size}
        cell={length()}
      />
      <Show when={stacked() !== null}>
        <PartsLegend
          parts={stacked()!}
          formatValue={(part) => `${number.format(part)}${local.unit}`}
        />
      </Show>
    </div>
  );
};
