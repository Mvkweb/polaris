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
 * The glow is a stack of rings drawn from a corner (or ellipses from an
 * edge), largest and lightest first. Each ring is filled with a denser
 * dither than the one under it; Bayer levels nest, so the stack reads as
 * one smooth falloff with every dot on the same grid. The hover layer is a
 * second, larger and denser stack whose rings switch on one after another,
 * innermost first, so the glow grows outward through the levels instead of
 * fading. Leaving the card switches them off in reverse. With a dotted,
 * hatched or solid fill, every ring shares one texture at a low opacity,
 * and the overlap of the stack builds the falloff instead.
 *
 * The rim is a third, much wider stack, masked to a band one cell wide
 * just inside the card's edge. It is dense where the glow sits and thins
 * out round the card, so the border catches the light like a rim.
 */

export type DitherCardGlow =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top"
  | "bottom";

export type DitherCardProps = Omit<JSX.IntrinsicElements["div"], "color"> & {
  /** Where the glow sits. Default `"top-left"`. */
  glow?: DitherCardGlow;
  /** Glow size in pixels, from its origin to where it fades out. Default 240. */
  reach?: number;
  /** Densest dither level, at the origin, 0 to 1. Default 0.5. */
  strength?: number;
  /** Grow and densify the glow on hover and keyboard focus. Default `false`. */
  interactive?: boolean;
  /** Glow colour: a palette name or any CSS colour. Default `"ink"`. */
  color?: DitherColor;
  /** Texture of the glow. Default `"gradient"`. */
  fill?: FillVariant;
  /** Threshold matrix. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Size of one dither cell in CSS pixels. Default 3. */
  cell?: number;
  /** Light the card's border with dither, densest near the glow. Default `true`. */
  rim?: boolean;
  /** Corner radius in pixels, matched by the rim. Default 14. */
  radius?: number;
};

const RINGS = 9;
// Milliseconds between rings when the hover glow grows or shrinks.
const RING_STEP = 26;

const STYLES = [
  ".dcn-card-boost{opacity:0;transition:opacity 0s linear var(--dcn-out)}",
  "@media (hover: hover){.dcn-card:hover .dcn-card-boost{opacity:1;transition-delay:var(--dcn-in)}}",
  ".dcn-card:focus-within .dcn-card-boost{opacity:1;transition-delay:var(--dcn-in)}",
  "@media (prefers-reduced-motion: reduce){.dcn-card-boost{transition-delay:0s!important}}",
].join("");

type StyleWithVars = JSX.CSSProperties & Record<`--${string}`, string>;

interface Origin {
  cx: string;
  cy: string;
  /** Edge glows are ellipses, wider than they are tall. */
  stretch: number;
}

const ORIGINS = {
  bottom: { cx: "50%", cy: "100%", stretch: 1.8 },
  "bottom-left": { cx: "0%", cy: "100%", stretch: 1 },
  "bottom-right": { cx: "100%", cy: "100%", stretch: 1 },
  top: { cx: "50%", cy: "0%", stretch: 1.8 },
  "top-left": { cx: "0%", cy: "0%", stretch: 1 },
  "top-right": { cx: "100%", cy: "0%", stretch: 1 },
} as const satisfies Record<DitherCardGlow, Origin>;

interface Ring {
  radius: number;
  level: number;
}

/** Rings from the outside in: radius falls linearly, level rises with an ease. */
const ringsFor = (reach: number, strength: number): Ring[] =>
  Array.from({ length: RINGS }, (_, index) => {
    const t = (index + 1) / RINGS;
    return {
      level: strength * t ** 2.2,
      radius: reach * (1 - (index / RINGS) * 0.92),
    };
  });

// Opacity of each ring when the rings share one texture; nine overlap at the origin.
const TEXTURE_OPACITY = 0.2;

const RingStack = (props: {
  id: string;
  /** The shared texture's id, or undefined for one dither level per ring. */
  texture: string | undefined;
  rings: Ring[];
  origin: Origin;
  boost: boolean;
  mask?: string;
}) => (
  <g mask={props.mask === undefined ? undefined : `url(#${props.mask})`}>
    <For each={props.rings}>
      {({ radius }, index) => {
        const timing: StyleWithVars | undefined = props.boost
          ? {
              // Index 0 is the outermost ring: it switches on last and off first.
              "--dcn-in": `${(RINGS - 1 - index()) * RING_STEP}ms`,
              "--dcn-out": `${index() * RING_STEP}ms`,
            }
          : undefined;
        return (
          <ellipse
            class={props.boost ? "dcn-card-boost" : undefined}
            style={timing}
            cx={props.origin.cx}
            cy={props.origin.cy}
            rx={radius * props.origin.stretch}
            ry={radius}
            fill={
              props.texture === undefined
                ? `url(#${props.id}-${index()})`
                : `url(#${props.texture})`
            }
            fill-opacity={props.texture === undefined ? undefined : TEXTURE_OPACITY}
          />
        );
      }}
    </For>
  </g>
);

/**
 * A card surface with a dithered glow in one corner or along one edge.
 * It carries shadcn Card's spacing and colours, so `CardHeader`,
 * `CardContent` and `CardFooter` drop straight in. With `interactive`, the
 * glow grows through the dither levels on hover and focus.
 */
export const DitherCard = (props: DitherCardProps) => {
  const merged = mergeProps(
    {
      glow: "top-left" as DitherCardGlow,
      reach: 240,
      strength: 0.5,
      interactive: false,
      color: "ink" as DitherColor,
      fill: "gradient" as FillVariant,
      matrix: "bayer4" as DitherMatrix,
      cell: 3,
      rim: true,
      radius: 14,
    },
    props
  );

  const [local, others] = splitProps(merged, [
    "glow",
    "reach",
    "strength",
    "interactive",
    "color",
    "fill",
    "matrix",
    "cell",
    "rim",
    "radius",
    "class",
    "style",
    "children",
  ]);

  const id = createUniqueId();
  const origin = () => ORIGINS[local.glow];
  const level = () => Math.min(1, Math.max(0, local.strength));
  const rings = () => ringsFor(local.reach, level());
  const boosted = () => ringsFor(local.reach * 1.3, Math.min(1, level() * 1.4));
  const texture = () => (local.fill === "gradient" ? undefined : `${id}-texture`);
  const rimRings = () => ringsFor(local.reach * 1.9, 1);

  return (
    <div
      data-slot="card"
      data-glow={local.glow}
      class={cn(
        "bg-card text-card-foreground relative isolate flex flex-col gap-6 overflow-hidden border py-6 shadow-sm",
        local.interactive && "dcn-card",
        local.class
      )}
      style={{
        "border-radius": `${local.radius}px`,
        ...(typeof local.style === "object" ? local.style : {}),
      }}
      {...others}
    >
      <Show when={local.interactive}>
        <style>{STYLES}</style>
      </Show>
      <svg
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 -z-10 size-full"
        shape-rendering="crispEdges"
      >
        <defs>
          <Show when={texture() !== undefined}>
            <FillPattern
              id={texture()!}
              fill={local.fill}
              color={local.color}
              cell={local.cell}
            />
          </Show>
          <For each={rings()}>
            {(ring, index) => (
              <DitherPattern
                id={`${id}-${index()}`}
                level={ring.level}
                matrix={local.matrix}
                cell={local.cell}
                color={local.color}
              />
            )}
          </For>
          <Show when={local.rim}>
            <For each={rimRings()}>
              {(ring, index) => (
                <DitherPattern
                  id={`${id}-rim-${index()}`}
                  level={ring.level}
                  matrix={local.matrix}
                  cell={local.cell}
                  color={local.color}
                />
              )}
            </For>
            <mask id={`${id}-rim-mask`}>
              <rect
                width="100%"
                height="100%"
                rx={local.radius}
                fill="none"
                stroke="white"
                stroke-width={local.cell * 2}
              />
            </mask>
          </Show>
          <Show when={local.interactive}>
            <For each={boosted()}>
              {(ring, index) => (
                <DitherPattern
                  id={`${id}-boost-${index()}`}
                  level={ring.level}
                  matrix={local.matrix}
                  cell={local.cell}
                  color={local.color}
                />
              )}
            </For>
          </Show>
        </defs>
        <RingStack
          id={id}
          texture={texture()}
          rings={rings()}
          origin={origin()}
          boost={false}
        />
        <Show when={local.interactive}>
          <RingStack
            id={`${id}-boost`}
            texture={texture()}
            rings={boosted()}
            origin={origin()}
            boost
          />
        </Show>
        <Show when={local.rim}>
          <RingStack
            id={`${id}-rim`}
            texture={undefined}
            rings={rimRings()}
            origin={origin()}
            boost={false}
            mask={`${id}-rim-mask`}
          />
        </Show>
      </svg>
      {local.children}
    </div>
  );
};
