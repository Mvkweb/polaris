import {
  createMemo,
  createSignal,
  For,
  mergeProps,
  onCleanup,
  onMount,
  Show,
  splitProps,
  type JSX,
} from "solid-js";

import {
  bloomStyle,
  createPrefersReducedMotion,
  cssColor,
  fillStyle,
  readDitherCell,
  SERIES_COLORS,
  subscribeToTheme,
} from "@/lib/dither";
import type {
  Bloom,
  DitherColor,
  DitherMatrix,
  FillVariant,
} from "@/lib/dither";
import { cn } from "@/lib/utils";

export interface StorageMapItem {
  id?: string;
  /** Label shown on the tile, such as `"Applications"` or `"Tool definitions"`. */
  label: string;
  /** Size in `unit`s, e.g. 142 for 142 GB. */
  value: number;
  /** Colour: a palette name (`"blue"`, `"purple"`, etc.) or any CSS colour. Default: palette series order. */
  color?: DitherColor;
  /** Texture: `"gradient"`, `"dotted"`, `"hatched"` or `"solid"`. Default: `"gradient"` (or `"hatched"` for free). */
  fill?: FillVariant;
  /** Secondary subtitle text, e.g. `"Binaries & packages"` or `"Memory"`. */
  detail?: string;
  /** Whether this tile represents unallocated / available space. Automatically gets a hatched fill and dashed border. */
  isFree?: boolean;
  /** True when the scan budget cut this bucket short, so `value` is a floor. Rendered with a `~` prefix. */
  partial?: boolean;
}

export interface StorageMapRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type StorageMapScanState = "scanning" | "calculating" | "settling" | "complete";

export type StorageMapSpotlight = "blur" | "opacity" | "none";

export interface StorageMapProps
  extends Omit<JSX.IntrinsicElements["div"], "children"> {
  /** Headline title on the top-left bar, e.g. `"Storage"` or `"Context"`. Default `"Storage"`. */
  title?: string;
  /** Target device or context label, e.g. `"/dev/nvme0n1p2"` or `"Checkout fixer"`. Default `"/dev/nvme0n1p2"`. */
  target?: string;
  /** Total capacity in `unit`s. Default calculated from items or 512. */
  capacity?: number;
  /** Unit displayed after numbers, e.g. `" GB"` or `"k"`. Default `" GB"`. */
  unit?: string;
  /** The partitioned items. Defaults to standard Linux/Unix storage partitions. */
  items?: readonly StorageMapItem[];
  /** How long the initial scan & calculation animation lasts in milliseconds. Default `6000` (5-7 seconds). */
  duration?: number;
  /** Whether to animate the calculation and growth on mount/replay. Default `true` (disabled under reduced motion). */
  animate?: boolean;
  /** Enable interactive hover spotlights and tooltips. Default `true`. */
  interactive?: boolean;
  /** Spotlight effect on other partitions when hovering an item: `"blur"` (blurs background partitions), `"opacity"` (dims without blur), or `"none"`. Default `"blur"`. */
  spotlight?: StorageMapSpotlight;
  /** Blur radius in pixels when `spotlight="blur"`. Default `2.5`. */
  blurRadius?: number;
  /** Soft glow in the hovered item's colour: `"off"`, `"low"` or `"high"`. Default `"off"`. */
  bloom?: Bloom;
  /** Size of one dither cell in CSS pixels. Default `3`. */
  cell?: number;
  /** Threshold matrix for gradient dither. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Show the top header bar with target selector and used/total percentage. Default `true`. */
  header?: boolean;
  /** Show the bottom calculation status caption and replay button. Default `true`. */
  footer?: boolean;
}

export const DEFAULT_STORAGE_ITEMS: readonly StorageMapItem[] = [
  {
    label: "Applications",
    value: 142,
    color: "blue",
    fill: "gradient",
    detail: "Binaries & Flatpaks",
  },
  {
    label: "Operating System",
    value: 64,
    color: "purple",
    fill: "gradient",
    detail: "Kernel, /usr & libs",
  },
  {
    label: "Developer",
    value: 48,
    color: "green",
    fill: "gradient",
    detail: "Docker & git repos",
  },
  {
    label: "Photos & Media",
    value: 32,
    color: "pink",
    fill: "gradient",
    detail: "Images & audio",
  },
  {
    label: "Documents",
    value: 18,
    color: "orange",
    fill: "gradient",
    detail: "Configs & cache",
  },
  {
    label: "Free",
    value: 208,
    color: "grey",
    fill: "hatched",
    isFree: true,
    detail: "Available space",
  },
];

export const CONTEXT_MAP_ITEMS: readonly StorageMapItem[] = [
  {
    label: "Tool definitions",
    value: 14800,
    color: "blue",
    fill: "gradient",
    detail: "System tools",
  },
  {
    label: "Project memory",
    value: 9400,
    color: "purple",
    fill: "gradient",
    detail: "Memory",
  },
  {
    label: "checkout.spec",
    value: 8200,
    color: "ink",
    fill: "gradient",
    detail: "Test suite",
  },
  {
    label: "Diff context",
    value: 6500,
    color: "pink",
    fill: "gradient",
    detail: "Git diff",
  },
  {
    label: "Agent scratchpad",
    value: 4000,
    color: "green",
    fill: "gradient",
    detail: "Scratchpad",
  },
  {
    label: "Free",
    value: 157100,
    color: "grey",
    fill: "hatched",
    isFree: true,
    detail: "Available context",
  },
];

/** Clamp value to [0, 1]. */
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Smooth ease-out quad curve. */
const easeOutQuad = (x: number) => 1 - (1 - x) * (1 - x);

/**
 * Pure squarified treemap layout algorithm.
 * Partitions items into rectangular tiles within `bounds` (x, y, w, h in 0..100%).
 */
export function layoutSquarifiedTreemap(
  items: readonly { value: number; origIdx: number }[],
  bounds: StorageMapRect
): Record<number, StorageMapRect> {
  const results: Record<number, StorageMapRect> = {};
  const total = items.reduce((s, it) => s + Math.max(0, it.value), 0);

  if (total <= 0) {
    for (const it of items) {
      results[it.origIdx] = { x: bounds.x, y: bounds.y, w: 0, h: 0 };
    }
    return results;
  }

  let remX = bounds.x;
  let remY = bounds.y;
  let remW = bounds.w;
  let remH = bounds.h;
  const remaining = items
    .map((it) => {
      const raw = Math.max(0, it.value);
      // Provide a clean minimum visual floor (5.5%) so labels and sizes are never crushed into unreadable strips
      const visualFloor = total * 0.055;
      const val = raw > 0 ? Math.max(raw, visualFloor) : 0;
      return { origIdx: it.origIdx, val };
    })
    .sort((a, b) => b.val - a.val);

  let remTotal = remaining.reduce((s, it) => s + it.val, 0);

  while (remaining.length > 0) {
    const isHoriz = remW >= remH;
    const side = isHoriz ? remH : remW;
    let row = [remaining[0]];
    let rowVal = remaining[0].val;

    const worstAspect = (
      rowItems: typeof remaining,
      rowSum: number,
      sideLen: number
    ) => {
      const rowThickness = (rowSum / remTotal) * (isHoriz ? remW : remH);
      if (rowThickness <= 0) return Infinity;
      let worst = 1;
      for (const item of rowItems) {
        const itemLen = (item.val / rowSum) * sideLen;
        if (itemLen <= 0) continue;
        const aspect = Math.max(rowThickness / itemLen, itemLen / rowThickness);
        if (aspect > worst) worst = aspect;
      }
      return worst;
    };

    let currentWorst = worstAspect(row, rowVal, side);
    let nextIdx = 1;
    while (nextIdx < remaining.length) {
      const nextItem = remaining[nextIdx];
      const testRow = [...row, nextItem];
      const testVal = rowVal + nextItem.val;
      const testWorst = worstAspect(testRow, testVal, side);
      if (testWorst <= currentWorst) {
        row = testRow;
        rowVal = testVal;
        currentWorst = testWorst;
        nextIdx += 1;
      } else {
        break;
      }
    }

    const rowThickness = (rowVal / remTotal) * (isHoriz ? remW : remH);
    let offset = 0;
    for (const item of row) {
      const itemLen = rowVal > 0 ? (item.val / rowVal) * side : 0;
      results[item.origIdx] = {
        x: isHoriz ? remX : remX + offset,
        y: isHoriz ? remY + offset : remY,
        w: isHoriz ? rowThickness : itemLen,
        h: isHoriz ? itemLen : rowThickness,
      };
      offset += itemLen;
    }

    if (isHoriz) {
      remX += rowThickness;
      remW = Math.max(0, remW - rowThickness);
    } else {
      remY += rowThickness;
      remH = Math.max(0, remH - rowThickness);
    }
    remTotal = Math.max(0, remTotal - rowVal);
    remaining.splice(0, row.length);
  }

  return results;
}

interface DitherSwatchProps {
  color?: DitherColor;
  fill?: FillVariant;
  isFree?: boolean;
  matrix?: DitherMatrix;
  cell?: number;
  class?: string;
}

/**
 * Adaptive miniature dither block symbol that directly derives from the tile's
 * fill engine (gradient, hatched, dotted, or solid) with matching cell scale and matrix.
 */
function DitherSwatch(props: DitherSwatchProps) {
  const c = () => props.color ?? "ink";
  const clr = () => props.cell ?? 3;
  const m = () => props.matrix ?? "bayer4";
  const fillVariant = () => (props.isFree ? "solid" : (props.fill ?? "gradient"));

  const swatchStyle = createMemo(() => {
    if (props.isFree) {
      return {};
    }
    const v = fillVariant();
    if (v === "solid") {
      return {
        "background-color": cssColor(c()),
      };
    }
    if (v === "hatched" || v === "dotted") {
      return fillStyle(v, {
        color: c(),
        cell: clr(),
        matrix: m(),
      });
    }
    // Gradient: scaled 4-cell ramp reproducing the tile's exact top-to-bottom dither fade
    return fillStyle("gradient", {
      color: c(),
      cell: clr(),
      matrix: m(),
      edge: "bottom",
      length: 4,
      from: 1,
      to: 0.0625,
    });
  });

  return (
    <span
      aria-hidden="true"
      class={cn(
        "relative inline-block size-3.5 shrink-0 rounded-[2px] overflow-hidden border border-border/80 bg-background/80 align-middle",
        props.class
      )}
    >
      <span class="absolute inset-0" style={swatchStyle()} />
    </span>
  );
}

export function StorageMap(props: StorageMapProps) {
  const merged = mergeProps(
    {
      title: "Storage",
      target: "/dev/nvme0n1p2",
      unit: " GB",
      duration: 6000,
      animate: true,
      interactive: true,
      spotlight: "blur" as StorageMapSpotlight,
      blurRadius: 2.5,
      bloom: "off" as Bloom,
      matrix: "bayer4" as DitherMatrix,
      header: true,
      footer: true,
    },
    props
  );

  const [local, rest] = splitProps(merged, [
    "title",
    "target",
    "capacity",
    "unit",
    "items",
    "duration",
    "animate",
    "interactive",
    "spotlight",
    "blurRadius",
    "bloom",
    "cell",
    "matrix",
    "header",
    "footer",
    "class",
  ]);

  let rootRef: HTMLDivElement | undefined;
  const reducedMotion = createPrefersReducedMotion();

  // Responsive dither cell size: reacts to local.cell knob changes live
  const [themeCell, setThemeCell] = createSignal(3);
  onMount(() => {
    if (local.cell !== undefined) return;
    const update = () => {
      if (rootRef) setThemeCell(readDitherCell(rootRef));
    };
    update();
    const unsub = subscribeToTheme(update);
    onCleanup(unsub);
  });
  const cell = () => local.cell ?? themeCell();

  // Effective items list
  const rawItems = createMemo(() => {
    const list = local.items && local.items.length > 0 ? local.items : DEFAULT_STORAGE_ITEMS;
    return list.map((item, idx) => ({
      ...item,
      id: item.id ?? `item-${idx}`,
      color: item.color ?? SERIES_COLORS[idx % SERIES_COLORS.length] ?? "ink",
      fill: item.fill ?? (item.isFree ? "solid" : "gradient"),
    }));
  });

  // Free item detection
  const freeItemIndex = createMemo(() => rawItems().findIndex((it) => it.isFree || it.label.toLowerCase() === "free"));

  // Capacity calculation
  const totalCapacity = createMemo(() => {
    if (local.capacity !== undefined && local.capacity > 0) return local.capacity;
    return rawItems().reduce((sum, it) => sum + Math.max(0, it.value), 0);
  });

  // Hover state
  const [hoveredIdx, setHoveredIdx] = createSignal<number | null>(null);

  // Scan progress state: 0 to 1
  const shouldAnimate = () => local.animate && !reducedMotion();
  const [progress, setProgress] = createSignal(shouldAnimate() ? 0 : 1);
  const [scanState, setScanState] = createSignal<StorageMapScanState>(shouldAnimate() ? "scanning" : "complete");

  // Re-run scan function
  const startScan = () => {
    if (!shouldAnimate()) {
      setProgress(1);
      setScanState("complete");
      return;
    }
    setProgress(0);
    setScanState("scanning");

    const startTime = performance.now();
    const totalDuration = Math.max(1000, local.duration);
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const p = clamp01(elapsed / totalDuration);
      setProgress(p);

      if (p < 0.2) {
        setScanState("scanning");
      } else if (p < 0.75) {
        setScanState("calculating");
      } else if (p < 1) {
        setScanState("settling");
      } else {
        setScanState("complete");
      }

      if (p < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    onCleanup(() => cancelAnimationFrame(rafId));
  };

  onMount(() => {
    if (shouldAnimate()) {
      startScan();
    }
  });

  // Calculate live values during calculation
  const liveItems = createMemo(() => {
    const p = progress();
    const items = rawItems();
    const freeIdx = freeItemIndex();
    const cap = totalCapacity();

    if (p >= 1) {
      // Completed exact values
      return items.map((it) => ({ ...it, currentValue: it.value }));
    }

    // Staggered discovery during the 5-7s calculation
    const count = items.length;
    let usedSum = 0;

    const mapped = items.map((item, idx) => {
      if (idx === freeIdx) return null; // compute free after

      // Stagger start: early categories scan first
      const itemStart = 0.05 + (idx / Math.max(1, count - 1)) * 0.4;
      const itemEnd = Math.min(0.98, itemStart + 0.45);

      const rawP = clamp01((p - itemStart) / (itemEnd - itemStart));
      const curved = easeOutQuad(rawP);
      const curVal = item.value * curved;
      usedSum += curVal;

      return {
        ...item,
        currentValue: curVal,
      };
    });

    const freeValue = Math.max(0, cap - usedSum);

    return mapped.map((item, idx) => {
      if (idx === freeIdx) {
        return {
          ...items[idx],
          currentValue: freeValue,
        };
      }
      return item!;
    });
  });

  // Live used total and percentage
  const totalUsed = createMemo(() => {
    const items = liveItems();
    const freeIdx = freeItemIndex();
    return items.reduce((acc, it, idx) => (idx === freeIdx ? acc : acc + it.currentValue), 0);
  });

  const percentUsed = createMemo(() => {
    const cap = totalCapacity();
    if (cap <= 0) return 0;
    return Math.min(100, Math.round((totalUsed() / cap) * 100));
  });

  // Compute treemap rects
  const layoutRects = createMemo(() => {
    const items = liveItems();
    const freeIdx = freeItemIndex();
    const cap = totalCapacity();

    // If there is an explicit Free space, partition into Used (left) and Free (right)
    if (freeIdx !== -1) {
      const usedItemsWithIdx = items
        .map((it, idx) => ({ ...it, origIdx: idx }))
        .filter((_, idx) => idx !== freeIdx);

      const usedVal = usedItemsWithIdx.reduce((s, it) => s + Math.max(0, it.currentValue), 0);
      const usedShare = cap > 0 ? clamp01(usedVal / cap) : 0.5;

      const usedWidthPercent = usedShare * 100;
      const freeWidthPercent = Math.max(0, 100 - usedWidthPercent);

      // Squarified treemap for the used items on the left
      const usedRects = layoutSquarifiedTreemap(
        usedItemsWithIdx.map((it) => ({ value: it.currentValue, origIdx: it.origIdx })),
        { x: 0, y: 0, w: usedWidthPercent, h: 100 }
      );

      // Free item takes the remaining space on the right
      const allRects: Record<number, StorageMapRect> = {
        ...usedRects,
        [freeIdx]: {
          x: usedWidthPercent,
          y: 0,
          w: freeWidthPercent,
          h: 100,
        },
      };

      return allRects;
    }

    // Otherwise standard squarified treemap over full space
    return layoutSquarifiedTreemap(
      items.map((it, idx) => ({ value: it.currentValue, origIdx: idx })),
      { x: 0, y: 0, w: 100, h: 100 }
    );
  });

  // Format numbers and handle unit scaling (e.g. GB -> TB for >= 1000)
  const formatVal = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 1 });

  const formatValWithUnit = (v: number) => {
    const baseUnit = (local.unit ?? " GB").trim();
    if (baseUnit === "GB" && v >= 1000) {
      return {
        val: (v / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }),
        unit: " TB",
      };
    }
    return {
      val: formatVal(v),
      unit: local.unit ?? " GB",
    };
  };

  // A partial bucket is a floor, not an exact size, so it reads as "~12.3".
  const valueLabel = (item: { currentValue: number; partial?: boolean }): string =>
    `${item.partial ? "~" : ""}${formatValWithUnit(item.currentValue).val}`;

  const itemUnit = (item: { currentValue: number }): string =>
    formatValWithUnit(item.currentValue).unit;

  return (
    <div
      ref={(el) => (rootRef = el)}
      class={cn(
        "relative rounded-xl border border-white/[0.08] bg-[#050506] p-4 text-white shadow-[0_16px_40px_rgba(0,0,0,0.95)] select-none",
        local.class
      )}
      {...rest}
    >
      {/* Top Header */}
      <Show when={local.header}>
        <div class="mb-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: 4-tile blue icon & Title */}
          <div class="flex items-center gap-2">
            <svg
              class="h-4 w-4 shrink-0 text-sky-400"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="1" y="1" width="6" height="6" rx="1.5" />
              <rect x="9" y="1" width="6" height="6" rx="1.5" />
              <rect x="1" y="9" width="6" height="6" rx="1.5" />
              <rect x="9" y="9" width="6" height="6" rx="1.5" />
            </svg>
            <span class="font-semibold tracking-tight text-sm text-white/90">{local.title}</span>
          </div>

          {/* Right: Live stats readout */}
          <div class="flex items-center gap-2 font-mono text-xs text-white/50">
            <span>
              <strong class="font-semibold text-white/90">{formatVal(totalUsed())}</strong>
              {local.unit} / {formatVal(totalCapacity())}
              {local.unit}
            </span>
            <span class="rounded bg-white/[0.06] border border-white/[0.06] px-1.5 py-0.5 font-sans font-medium text-white/80">
              {percentUsed()}%
            </span>
          </div>
        </div>
      </Show>

      {/* Treemap Stage */}
      <div
        class="relative h-64 sm:h-72 w-full overflow-hidden rounded-lg bg-transparent"
        role="region"
        aria-label={`${local.title} breakdown`}
      >
        <For each={liveItems()}>
          {(item, idx) => {
            const rect = () => layoutRects()[idx()] ?? { x: 0, y: 0, w: 0, h: 0 };
            const isHovered = () => hoveredIdx() === idx();
            const isDimmed = () => hoveredIdx() !== null && hoveredIdx() !== idx();
            const isFree = () => item.isFree;

            // Fill style using dithercn style kit: reacts live to cell slider
            const tileFillStyle = createMemo(() => {
              if (isFree()) {
                // Free space: empty dark tile, no dither texture
                return {};
              }
              return fillStyle(item.fill ?? "gradient", {
                color: item.color,
                cell: cell(),
                matrix: local.matrix,
                edge: "bottom",
              });
            });

            // Soft bloom glow around the tile (drop-shadow, does not blur text)
            const bloomStyleProps = createMemo(() => {
              if (local.bloom === "off" || !isHovered()) return undefined;
              return bloomStyle(item.color, local.bloom);
            });

            // Spotlight dimming style for other tiles
            const spotlightStyleProps = createMemo(() => {
              if (!isDimmed() || local.spotlight === "none") return undefined;
              if (local.spotlight === "blur") {
                const r = local.blurRadius ?? 2.5;
                return {
                  filter: `blur(${r}px)`,
                  opacity: 0.52,
                };
              }
              return {
                opacity: 0.45,
              };
            });

            // Gap sizing (4px between tiles, 2px margin from stage edge)
            const gap = 4;

            return (
              <div
                class={cn(
                  "absolute overflow-hidden rounded-[6px] transition-[opacity,filter,box-shadow] duration-150 ease-out",
                  isFree()
                    ? "border border-dashed border-white/20 bg-black/40"
                    : "border-0 bg-[#09090b]",
                  isHovered() && "z-20 ring-1 ring-inset ring-white/30 shadow-lg"
                )}
                style={{
                  left: `calc(${rect().x}% + ${gap / 2}px)`,
                  top: `calc(${rect().y}% + ${gap / 2}px)`,
                  width: `calc(${rect().w}% - ${gap}px)`,
                  height: `calc(${rect().h}% - ${gap}px)`,
                  ...bloomStyleProps(),
                  ...spotlightStyleProps(),
                }}
                onPointerEnter={() => local.interactive && setHoveredIdx(idx())}
                onPointerLeave={() => local.interactive && setHoveredIdx(null)}
                tabIndex={local.interactive ? 0 : undefined}
                role="group"
                aria-label={`${item.label}: ${valueLabel(item)}${local.unit}`}
              >
                {/* Dither Texture Fill Layer */}
                <div
                  class={cn(
                    "pointer-events-none absolute inset-0 rounded-[5px] transition-opacity duration-150",
                    isFree()
                      ? isHovered()
                        ? "opacity-55"
                        : "opacity-35"
                      : isHovered()
                        ? "opacity-45"
                        : "opacity-25"
                  )}
                  style={tileFillStyle()}
                />

                {/* Content Overlay */}
                <div
                  class={cn(
                    "relative z-10 flex h-full flex-col justify-between overflow-hidden",
                    rect().h <= 18 ? "px-2 py-0" : "p-2 sm:p-2.5"
                  )}
                >
                  <Show
                    when={rect().h > 18}
                    fallback={
                      /* Compact horizontal row for small/short partitions */
                      <div class="flex items-center justify-between gap-1.5 w-full h-full min-w-0">
                        <span
                          class={cn(
                            "truncate font-medium tracking-tight leading-none",
                            rect().h <= 12 ? "text-[10px]" : "text-xs",
                            isFree() ? "text-white/40" : "text-white/90"
                          )}
                        >
                          {item.label}
                        </span>
                        <span
                          class={cn(
                            "font-mono font-semibold shrink-0 leading-none",
                            rect().h <= 12 ? "text-[10px]" : "text-xs"
                          )}
                          style={{ color: cssColor(item.color) }}
                        >
                          {valueLabel(item)}
                          <span class="text-[9px] font-normal text-white/40 ml-0.5">
                            {itemUnit(item)}
                          </span>
                        </span>
                      </div>
                    }
                  >
                    <div class="min-w-0">
                      <div
                        class={cn(
                          "truncate font-medium text-xs tracking-tight",
                          isFree() ? "text-muted-foreground" : "text-foreground"
                        )}
                      >
                        {item.label}
                      </div>
                      <div
                        class="font-mono text-xs font-semibold"
                        style={{ color: cssColor(item.color) }}
                      >
                        {valueLabel(item)}
                        <span class="text-[10px] font-normal text-muted-foreground ml-0.5">
                          {itemUnit(item)}
                        </span>
                      </div>
                    </div>

                    {/* Subtitle / category detail */}
                    <Show when={item.detail && rect().h > 24 && rect().w > 18}>
                      <div class="truncate text-[10px] text-muted-foreground/90">
                        {item.detail}
                      </div>
                    </Show>
                  </Show>
                </div>
              </div>
            );
          }}
        </For>

        {/* Floating smart hover tooltip for quick inspection */}
        <Show when={hoveredIdx() !== null && local.interactive}>
          {(() => {
            const idx = hoveredIdx()!;
            const item = liveItems()[idx];
            const r = layoutRects()[idx];
            if (!item || !r) return null;
            const share =
              totalCapacity() > 0
                ? Math.round((item.currentValue / totalCapacity()) * 100)
                : 0;

            // Robust positioning that never clips left, right, top, or bottom
            const isNearTop = r.y < 25 && r.y + r.h < 75;
            const isFullHeight = r.h >= 75;
            const isRightSide = r.x > 50;

            const vertStyle = isFullHeight
              ? { top: "8px", bottom: "auto" }
              : isNearTop
                ? { top: `calc(${r.y + r.h}% + 6px)`, bottom: "auto" }
                : { bottom: `calc(${100 - r.y}% + 6px)`, top: "auto" };

            const horizStyle = isFullHeight || isRightSide
              ? { right: `calc(${Math.max(1, 100 - (r.x + r.w))}% + 6px)`, left: "auto", transform: "none" }
              : { left: `calc(${Math.max(1, r.x)}% + 6px)`, right: "auto", transform: "none" };

            return (
              <div
                class="pointer-events-none absolute z-30 flex items-center gap-2 rounded-md border border-border/90 bg-card/95 px-2.5 py-1 text-xs text-card-foreground shadow-xl backdrop-blur-md transition-all duration-150 max-w-[calc(100%-16px)]"
                style={{
                  ...vertStyle,
                  ...horizStyle,
                }}
              >
                <DitherSwatch
                  color={item.color}
                  fill={item.fill}
                  isFree={item.isFree}
                  matrix={local.matrix}
                  cell={cell()}
                />
                <span class="font-medium text-foreground">{item.label}</span>
                <span
                  class="font-mono font-semibold"
                  style={{ color: cssColor(item.color) }}
                >
                  {valueLabel(item)}
                  {local.unit}
                </span>
                <span class="text-[10px] text-muted-foreground font-sans">
                  ({share}%)
                </span>
                <Show when={item.detail}>
                  <span class="text-[10px] text-muted-foreground/80">
                    · {item.detail}
                  </span>
                </Show>
              </div>
            );
          })()}
        </Show>
      </div>

      {/* Bottom Footer / Status Line */}
      <Show when={local.footer}>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          {/* Status Message with Indicator */}
          <div class="flex items-center gap-2">
            <Show
              when={hoveredIdx() !== null}
              fallback={
                <Show
                  when={scanState() === "complete"}
                  fallback={
                    <span class="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  }
                >
                  <span class="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                </Show>
              }
            >
              {(() => {
                const it = liveItems()[hoveredIdx()!];
                if (!it) return null;
                return (
                  <DitherSwatch
                    color={it.color}
                    fill={it.fill}
                    isFree={it.isFree}
                    matrix={local.matrix}
                    cell={cell()}
                  />
                );
              })()}
            </Show>

            <span>
              <Show
                when={hoveredIdx() !== null}
                fallback={
                  <Show
                    when={scanState() === "complete"}
                    fallback={
                      scanState() === "scanning"
                        ? "Scanning filesystem allocations..."
                        : scanState() === "calculating"
                          ? `Calculating block allocations... ${formatVal(totalUsed())}${local.unit} discovered`
                          : "Verifying free blocks and parity..."
                    }
                  >
                    Calculation complete –{" "}
                    <strong class="font-medium text-foreground">{formatVal(totalUsed())}{local.unit}</strong>{" "}
                    used ·{" "}
                    <strong class="font-medium text-foreground">
                      {formatVal(Math.max(0, totalCapacity() - totalUsed()))}
                      {local.unit}
                    </strong>{" "}
                    free ({percentUsed()}% allocated)
                  </Show>
                }
              >
                {(() => {
                  const it = liveItems()[hoveredIdx()!];
                  if (!it) return null;
                  const share = totalCapacity() > 0 ? Math.round((it.currentValue / totalCapacity()) * 100) : 0;
                  return (
                    <span>
                      <strong class="font-medium text-foreground">{it.label}</strong>:{" "}
                      <span class="font-mono font-semibold" style={{ color: cssColor(it.color) }}>
                        {valueLabel(it)}{local.unit}
                      </span>{" "}
                      ({share}% of total){it.detail ? ` · ${it.detail}` : ""}
                    </span>
                  );
                })()}
              </Show>
            </span>
          </div>

          {/* Re-scan / Replay Button */}
          <button
            type="button"
            onClick={startScan}
            class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            title="Recalculate storage breakdown"
          >
            <svg
              class={cn(
                "h-3.5 w-3.5 shrink-0 transition-transform",
                scanState() !== "complete" && "animate-spin"
              )}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              aria-hidden="true"
            >
              <path d="M2.5 8a5.5 5.5 0 1 0 1.2-3.4" stroke-linecap="round" />
              <path d="M2.5 3v3h3" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>{scanState() === "complete" ? "Scan again" : "Calculating..."}</span>
          </button>
        </div>
      </Show>
    </div>
  );
}

/** Convenience ContextMap preset configured for AI Agent context window visualisations. */
export function ContextMap(props: StorageMapProps) {
  const merged = mergeProps(
    {
      title: "Context",
      target: "Checkout fixer",
      capacity: 200000,
      unit: "k",
      items: CONTEXT_MAP_ITEMS,
    },
    props
  );
  return <StorageMap {...merged} />;
}
