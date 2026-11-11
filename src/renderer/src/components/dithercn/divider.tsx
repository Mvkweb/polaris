import {
  createUniqueId,
  For,
  mergeProps,
  Show,
  splitProps,
  type JSX,
} from "solid-js";

import { DitherPattern, FillPattern } from "@/lib/dither";
import type { DitherColor, DitherMatrix, FillVariant } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * The rule is an SVG with no viewBox, so one user unit is one CSS pixel
 * and every pattern tiles from the same origin. It is cut into steps along
 * its length: a solid run in the middle and, at each end, a ramp of steps
 * whose dither level falls towards the tip. Neighbouring steps line up
 * cell for cell, so the fade has no seams. A dotted, hatched or solid
 * rule uses one texture and fades its steps by opacity instead.
 */

const STEPS = 10;

export type DividerOrientation = "horizontal" | "vertical";

export type DividerProps = Omit<JSX.IntrinsicElements["div"], "children" | "color"> & {
  /** Default `"horizontal"`. */
  orientation?: DividerOrientation;
  /** Text in the middle of the rule, such as "or". Horizontal only. */
  label?: JSX.Element;
  /** Thickness in cells. Default 2. */
  thickness?: number;
  /** Share of each half that fades out, 0 to 1. Default 0.6. */
  fade?: number;
  /** Densest dither level, at the middle of the rule. Default 0.6. */
  strength?: number;
  /** Rule colour: a palette name or any CSS colour. Default `"ink"`. */
  color?: DitherColor;
  /** Texture of the rule. `gradient` fades through dither levels; the others fade by opacity. Default `"gradient"`. */
  fill?: FillVariant;
  /** Threshold matrix. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Size of one dither cell in CSS pixels. Default 2. */
  cell?: number;
  /** Hide the rule from assistive technology. Default `true` without a label. */
  decorative?: boolean;
};

interface Step {
  /** Start along the rule, in percent. */
  start: number;
  /** Length along the rule, in percent. */
  length: number;
  /** Index into the level list. */
  level: number;
}

/**
 * Steps for one rule from 0% to 100%. `fadeStart` and `fadeEnd` say which
 * tips fade; the ramp eases out so the rule thins quickly near the tip.
 */
const stepsFor = ({
  fade,
  fadeStart,
  fadeEnd,
}: {
  fade: number;
  fadeStart: boolean;
  fadeEnd: boolean;
}): Step[] => {
  const ramps = Number(fadeStart) + Number(fadeEnd);
  const rampLength = ramps === 0 ? 0 : Math.min(fade * 50, 100 / ramps);
  const step = rampLength / STEPS;
  const ramp = (from: number, ascending: boolean) =>
    Array.from({ length: STEPS }, (_, index) => ({
      length: step,
      level: ascending ? index : STEPS - 1 - index,
      start: from + index * step,
    }));
  const solidStart = fadeStart ? rampLength : 0;
  const solidEnd = fadeEnd ? 100 - rampLength : 100;
  return [
    ...(fadeStart ? ramp(0, true) : []),
    { length: solidEnd - solidStart, level: STEPS, start: solidStart },
    ...(fadeEnd ? ramp(solidEnd, false) : []),
  ];
};

const Rule = (props: {
  vertical: boolean;
  steps: Step[];
  thickness: number;
  strength: number;
  color: DitherColor;
  fill: FillVariant;
  matrix: DitherMatrix;
  cell: number;
  class?: string;
}) => {
  const id = createUniqueId();
  const levels = Array.from({ length: STEPS + 1 }, (_, index) => {
    const t = (index + 1) / (STEPS + 1);
    return props.strength * t ** 1.6;
  });
  const breadth = () => Math.max(1, Math.round(props.thickness)) * props.cell;

  return (
    <svg
      aria-hidden="true"
      class={cn(props.vertical ? "h-full" : "w-full", "block shrink", props.class)}
      style={props.vertical ? { width: `${breadth()}px` } : { height: `${breadth()}px` }}
      shape-rendering="crispEdges"
    >
      <defs>
        <Show when={props.fill !== "gradient"}>
          <FillPattern
            id={`${id}-texture`}
            fill={props.fill}
            color={props.color}
            cell={props.cell}
          />
        </Show>
        <For each={levels}>
          {(level, index) => (
            <DitherPattern
              id={`${id}-${index()}`}
              level={level}
              matrix={props.matrix}
              cell={props.cell}
              color={props.color}
            />
          )}
        </For>
      </defs>
      <For each={props.steps}>
        {({ start, length, level }) => (
          <rect
            x={props.vertical ? 0 : `${start}%`}
            y={props.vertical ? `${start}%` : 0}
            width={props.vertical ? "100%" : `${length + 0.05}%`}
            height={props.vertical ? `${length + 0.05}%` : "100%"}
            fill={
              props.fill === "gradient"
                ? `url(#${id}-${level})`
                : `url(#${id}-texture)`
            }
            fill-opacity={
              props.fill === "gradient"
                ? undefined
                : props.strength * ((level + 1) / (STEPS + 1)) ** 1.6
            }
          />
        )}
      </For>
    </svg>
  );
};

/**
 * A dithered rule whose ends fade out through the dither levels. With a
 * `label`, the rule splits around it and each half fades away from the
 * text. Vertical rules fill the height of their container.
 */
export const Divider = (props: DividerProps) => {
  const merged = mergeProps(
    {
      orientation: "horizontal" as DividerOrientation,
      thickness: 2,
      fade: 0.6,
      strength: 0.6,
      color: "ink" as DitherColor,
      fill: "gradient" as FillVariant,
      matrix: "bayer4" as DitherMatrix,
      cell: 2,
    },
    props
  );

  const [local, others] = splitProps(merged, [
    "orientation",
    "label",
    "thickness",
    "fade",
    "strength",
    "color",
    "fill",
    "matrix",
    "cell",
    "decorative",
    "class",
  ]);

  const vertical = () => local.orientation === "vertical";
  const amount = () => Math.min(1, Math.max(0, local.fade));
  const isDecorative = () => local.decorative ?? true;

  const ruleProps = () => ({
    cell: local.cell,
    color: local.color,
    fill: local.fill,
    matrix: local.matrix,
    strength: Math.min(1, Math.max(0, local.strength)),
    thickness: local.thickness,
    vertical: vertical(),
  });

  return (
    <Show
      when={local.label === undefined || vertical()}
      fallback={
        <div
          data-slot="divider"
          class={cn("flex w-full items-center gap-3", local.class)}
          {...others}
        >
          <Rule
            {...ruleProps()}
            steps={stepsFor({
              fade: amount() * 2,
              fadeEnd: false,
              fadeStart: true,
            })}
            class="min-w-0 flex-1"
          />
          <span class="text-muted-foreground shrink-0 text-xs leading-none font-medium tracking-wide">
            {local.label}
          </span>
          <Rule
            {...ruleProps()}
            steps={stepsFor({
              fade: amount() * 2,
              fadeEnd: true,
              fadeStart: false,
            })}
            class="min-w-0 flex-1"
          />
        </div>
      }
    >
      <div
        data-slot="divider"
        role={isDecorative() ? "none" : "separator"}
        aria-orientation={isDecorative() ? undefined : local.orientation}
        class={cn(
          "flex shrink-0",
          vertical() ? "h-full self-stretch" : "w-full",
          local.class
        )}
        {...others}
      >
        <Rule
          {...ruleProps()}
          steps={stepsFor({ fade: amount(), fadeEnd: true, fadeStart: true })}
        />
      </div>
    </Show>
  );
};
