import {
  createMemo,
  For,
  mergeProps,
  Show,
  splitProps,
  type JSX,
  type ValidComponent,
} from "solid-js";
import { Dynamic } from "solid-js/web";

import { bloomStyle, cssColor, fillStyle } from "@/lib/dither";
import type { Bloom, DitherColor, FillVariant } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * The surface is lit like a pixel-art bevel. A filled button is the full
 * colour, with a highlight (the colour mixed towards white) dithered down
 * from the top edge and a shade (towards black) dithered up from the
 * bottom, so every button shows its Bayer steps at rest. The fill variant
 * is the texture of the shade: a ramp for gradient, a lattice for dotted,
 * diagonals for hatched, and a thin rim for solid. Hover fades in a longer,
 * denser highlight; press fades in a shade from the top, so the face looks
 * pushed in. Only opacity animates, so every cell stays on the grid.
 * Outline buttons draw the same layers in the plain colour at low
 * coverage, over a faint tint, inside a hairline edge.
 */

export type DitherButtonVariant = "filled" | "outline";
export type DitherButtonSize = "sm" | "md" | "lg" | "icon";

const HEIGHT = { icon: 36, lg: 44, md: 36, sm: 32 } as const satisfies Record<
  DitherButtonSize,
  number
>;

const SIZE = {
  icon: "size-9 rounded-[9px]",
  lg: "h-11 gap-2 rounded-[11px] px-5 text-[15px] [&_svg:not([class*='size-'])]:size-4.5",
  md: "h-9 gap-2 rounded-[9px] px-4 text-sm",
  sm: "h-8 gap-1.5 rounded-[8px] px-3 text-[13px]",
} as const satisfies Record<DitherButtonSize, string>;

interface Shades {
  base: string;
  light: string;
  dark: string;
}

const shadesOf = (color: DitherColor): Shades => {
  const base = cssColor(color);
  return {
    base,
    dark: `color-mix(in oklab, ${base}, black 48%)`,
    light: `color-mix(in oklab, ${base}, white 42%)`,
  };
};

interface LayerOptions {
  fill: FillVariant;
  cell: number;
  /** Height of the button in cells. */
  rows: number;
}

const cells = (rows: number, share: number) =>
  Math.max(2, Math.round(rows * share));

/** The shade at rest, textured by the fill variant. */
const shadeLayer = (
  { fill, cell, rows }: LayerOptions,
  color: string
): JSX.CSSProperties => {
  switch (fill) {
    case "gradient": {
      return fillStyle("gradient", {
        cell,
        color,
        edge: "bottom",
        from: 1,
        length: cells(rows, 0.5),
        to: 0,
      });
    }
    case "dotted":
    case "hatched": {
      return { ...fillStyle(fill, { cell, color }), opacity: 0.5 };
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

const highlight = (
  { cell, rows }: LayerOptions,
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

const pressLayer = ({ cell, rows }: LayerOptions, color: string) =>
  fillStyle("gradient", {
    cell,
    color,
    edge: "top",
    from: 0.5,
    length: cells(rows, 0.4),
    to: 0,
  });

/**
 * Keeps the label's band clear: dither shows only along the top and bottom
 * edges, so dots frame the text instead of crossing it.
 */
const CLEAR_LABEL =
  "linear-gradient(to bottom, #000 0 30%, transparent 34% 66%, #000 70%)";

// On a wrapper: the dither layers already use mask-image for their pattern,
// and an ancestor's mask composes with theirs.
const FRAME: JSX.CSSProperties = {
  "-webkit-mask-image": CLEAR_LABEL,
  "mask-image": CLEAR_LABEL,
};

/** A layer's inline style, with its opacity once shown (default 1). */
type LayerStyle = JSX.CSSProperties & { "--dcn-btn-on"?: string };

interface Surface {
  base: JSX.CSSProperties;
  rest: readonly JSX.CSSProperties[];
  hover: LayerStyle;
  press: LayerStyle;
}

const filledSurface = (options: LayerOptions, shades: Shades): Surface => ({
  base: { "background-color": shades.base },
  hover: highlight(options, shades.light, 0.72, 1),
  press: pressLayer(options, shades.dark),
  rest: [
    shadeLayer(options, shades.dark),
    highlight(options, shades.light, 0.2, 1),
  ],
});

// Outline: the plain colour, sparse at rest and denser as you act.
const outlineSurface = (options: LayerOptions, shades: Shades): Surface => {
  const { cell, rows, fill } = options;
  const rest =
    fill === "dotted" || fill === "hatched"
      ? { ...fillStyle(fill, { cell, color: shades.base }), opacity: 0.32 }
      : fillStyle("gradient", {
          cell,
          color: shades.base,
          edge: "bottom",
          from: fill === "solid" ? 0.25 : 0.5,
          length: cells(rows, 0.55),
          to: 0,
        });
  return {
    base: {
      "background-color": `color-mix(in oklab, ${shades.base} 9%, transparent)`,
    },
    hover: {
      ...fillStyle("gradient", {
        cell,
        color: shades.base,
        edge: "bottom",
        from: 0.75,
        length: cells(rows, 0.9),
        to: 0.0625,
      }),
      "--dcn-btn-on": "0.7",
    },
    press: {
      ...fillStyle("gradient", {
        cell,
        color: shades.base,
        edge: "bottom",
        from: 0.75,
        length: rows,
        to: 0.125,
      }),
      "--dcn-btn-on": "0.5",
    },
    rest: [rest],
  };
};

const STYLES = [
  ".dcn-btn-hover,.dcn-btn-press{opacity:0;transition:opacity 220ms cubic-bezier(0.23,1,0.32,1)}",
  "@media (hover:hover){.dcn-btn:hover .dcn-btn-hover{opacity:var(--dcn-btn-on,1)}}",
  ".dcn-btn:focus-visible .dcn-btn-hover{opacity:var(--dcn-btn-on,1)}",
  ".dcn-btn:active .dcn-btn-press{opacity:var(--dcn-btn-on,1);transition-duration:80ms}",
  ".dcn-btn:active .dcn-btn-hover{opacity:0;transition-duration:80ms}",
  "@keyframes dcn-btn-busy{from{opacity:0}to{opacity:var(--dcn-btn-on,1)}}",
  ".dcn-btn[data-loading] .dcn-btn-hover{animation:dcn-btn-busy 0.9s cubic-bezier(0.77,0,0.175,1) infinite alternate}",
  "@keyframes dcn-btn-step{0%,100%{opacity:0.25}33%{opacity:1}}",
  ".dcn-btn-dot{animation:dcn-btn-step 0.9s steps(1,end) infinite}",
  "@media (prefers-reduced-motion:reduce){.dcn-btn-hover,.dcn-btn-press{transition:none}.dcn-btn[data-loading] .dcn-btn-hover,.dcn-btn-dot{animation:none}}",
].join("");

const edgeStyle = (
  variant: DitherButtonVariant,
  color: DitherColor
): JSX.CSSProperties => {
  const ink = cssColor(color);
  if (variant === "outline") {
    return {
      "box-shadow": `inset 0 0 0 1px color-mix(in oklab, ${ink} 55%, transparent)`,
    };
  }
  // A darker hairline holds the edge on any background; the top lip catches the light.
  return {
    "box-shadow": `inset 0 0 0 1px color-mix(in oklab, ${ink}, black 30%), inset 0 1px 0 color-mix(in oklab, ${ink}, white 55%)`,
  };
};

const LAYER = "absolute inset-0 rounded-[inherit]";

interface FillProps extends LayerOptions {
  variant: DitherButtonVariant;
  color: DitherColor;
  bloom: Bloom;
}

const Fill = (props: FillProps) => {
  const shades = createMemo(() => shadesOf(props.color));
  const surface = createMemo(() => {
    const opts = { cell: props.cell, rows: props.rows, fill: props.fill };
    return props.variant === "filled"
      ? filledSurface(opts, shades())
      : outlineSurface(opts, shades());
  });
  const bloom = createMemo(() =>
    props.variant === "filled"
      ? bloomStyle(props.color, props.bloom)
      : undefined
  );
  const edge = createMemo(() => edgeStyle(props.variant, props.color));

  return (
    <span
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
      style={bloom()}
    >
      <style>{STYLES}</style>
      <span class={LAYER} style={surface().base} />
      <span class={LAYER} style={FRAME}>
        <For each={surface().rest}>
          {(style) => <span class={LAYER} style={style} />}
        </For>
        <span class={cn(LAYER, "dcn-btn-hover")} style={surface().hover} />
        <span class={cn(LAYER, "dcn-btn-press")} style={surface().press} />
      </span>
      {/* The edge goes over the fill; an inset shadow on the root would sit under it. */}
      <span class={LAYER} style={edge()} />
    </span>
  );
};

/** Three cells stepping in turn, shown before the label while loading. */
const Busy = () => (
  <span aria-hidden="true" class="inline-flex items-center gap-[3px]">
    <For each={[0, 0.3, 0.6]}>
      {(delay) => (
        <span
          class="dcn-btn-dot size-[3px] bg-current"
          style={{ "animation-delay": `${delay}s` }}
        />
      )}
    </For>
  </span>
);

interface OwnProps {
  /** `filled` is the lit colour surface; `outline` is a faint tint that fills in on hover. Default `"filled"`. */
  variant?: DitherButtonVariant;
  /** Texture of the shade: a Bayer ramp, a dot lattice, diagonals, or a thin rim. Default `"gradient"`. */
  fill?: FillVariant;
  /** A palette name or any CSS colour. Default `"ink"`. */
  color?: DitherColor;
  /** Default `"md"`. `icon` is a square for a lone icon; give it an `aria-label`. */
  size?: DitherButtonSize;
  /** A soft glow in the button's colour. Default `"off"`. */
  bloom?: Bloom;
  /** Size of one dither cell in CSS pixels. Default 2. */
  cell?: number;
  /** Show a busy state: the label stays, the button ignores clicks and reports `aria-busy`. Default `false`. */
  loading?: boolean;
  /** Render your own element (a link) with the button's look, as shadcn's `asChild`. Default `false`. */
  asChild?: boolean;
  /** Dynamic component element type (e.g. `as="a"`). */
  as?: ValidComponent;
  children?: JSX.Element;
}

export type DitherButtonProps = OwnProps &
  Omit<JSX.IntrinsicElements["button"], "children" | "color"> & {
    href?: string;
    target?: string;
    rel?: string;
    [key: string]: unknown;
  };

const rootClass = (
  variant: DitherButtonVariant,
  size: DitherButtonSize,
  className: string | undefined
) =>
  cn(
    "dcn-btn group/button relative isolate inline-flex shrink-0 cursor-pointer items-center justify-center font-medium whitespace-nowrap select-none",
    "transition-[scale] duration-150 ease-(--ease-out) motion-safe:active:scale-[0.97]",
    // Filled: dark text on the bright dark-theme colours, light text on the deeper light-theme ones.
    variant === "filled"
      ? "text-white [text-shadow:0_1px_0_oklch(0_0_0/0.35)] dark:text-[oklch(0.13_0.02_268)] dark:[text-shadow:none]"
      : "text-foreground",
    // An outline, not a ring: the edge is an inline box-shadow and would hide a ring.
    "outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
    "disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:opacity-45",
    "data-loading:cursor-progress",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    SIZE[size],
    className
  );

/**
 * A real `<button>` with a lit, dithered surface in any palette colour: a
 * highlight dithered down from the top and a shade dithered up from the
 * bottom. Hover brightens it through the Bayer levels and press shades it
 * from the top. Four fills, two variants, four sizes, a loading state, and
 * `asChild`/`as` to put the look on a link.
 */
export const DitherButton = (props: DitherButtonProps) => {
  const merged = mergeProps(
    {
      variant: "filled" as DitherButtonVariant,
      fill: "gradient" as FillVariant,
      color: "ink" as DitherColor,
      size: "md" as DitherButtonSize,
      bloom: "off" as Bloom,
      cell: 2,
      loading: false,
    },
    props
  );

  const [local, others] = splitProps(merged, [
    "variant",
    "fill",
    "color",
    "size",
    "bloom",
    "cell",
    "loading",
    "asChild",
    "as",
    "class",
    "style",
    "children",
    "type",
    "disabled",
    "onClick",
  ]);

  const Comp = () => local.as ?? (local.asChild ? "span" : "button");
  const step = () => Math.max(1, Math.round(local.cell));

  const handleClick: JSX.EventHandlerUnion<HTMLElement, MouseEvent> = (event) => {
    if (local.loading) {
      event.preventDefault();
      return;
    }
    if (typeof local.onClick === "function") {
      (local.onClick as (e: MouseEvent) => void)(event);
    } else if (Array.isArray(local.onClick)) {
      (local.onClick[0] as (data: unknown, e: MouseEvent) => void)(
        local.onClick[1],
        event
      );
    }
  };

  return (
    <Dynamic
      component={Comp()}
      data-slot="button"
      data-variant={local.variant}
      data-fill={local.fill}
      data-loading={local.loading ? "" : undefined}
      aria-busy={local.loading || undefined}
      aria-disabled={local.loading || undefined}
      type={local.as || local.asChild ? undefined : (local.type ?? "button")}
      disabled={local.as || local.asChild ? undefined : local.disabled}
      onClick={handleClick}
      class={rootClass(local.variant, local.size, local.class)}
      style={local.style}
      {...others}
    >
      <Fill
        variant={local.variant}
        bloom={local.bloom}
        fill={local.fill}
        color={local.color}
        cell={step()}
        rows={Math.round(HEIGHT[local.size] / step())}
      />
      <Show when={local.loading}>
        <Busy />
      </Show>
      {local.children}
    </Dynamic>
  );
};
