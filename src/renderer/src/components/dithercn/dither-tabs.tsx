import { Tabs as TabsPrimitive } from "@kobalte/core/tabs";
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  onCleanup,
  onMount,
  splitProps,
  untrack,
  useContext,
  type JSX,
} from "solid-js";

import {
  bloomStyle,
  createDitherColors,
  createPrefersReducedMotion,
  cssColor,
  fillStyle,
  isInked,
} from "@/lib/dither";
import type { Bloom, DitherColor, DitherMatrix, Rgba } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * The indicator is one canvas behind the triggers, one canvas pixel per
 * cell, redrawn only while it moves. Each frame works out a tone for every
 * cell and inks the cell where the tone beats the matrix threshold, so a
 * tone that falls switches cells off in Bayer order rather than fading.
 *
 * A move is three shapes at once. A ghost of the old tab thins out in
 * place. A body glides from the old tab to the new one: its leading edge
 * runs ahead of its trailing edge, so it stretches, and its tone falls
 * from the leading edge back to the trailing one, so it trails off like a
 * comet. A ghost of the new tab fills in under it. The three meet as one
 * solid shape on the new tab.
 *
 * The pill is lit like Dither Button: the full colour, a highlight dithered
 * down from the top and a shade dithered up from the bottom, with the
 * label's band kept clear. The underline is a bar whose ends fade through
 * the levels, under a sparse glow that rises towards the label.
 */

export type DitherTabsVariant = "pill" | "underline";

type Orientation = "horizontal" | "vertical";
type TextDirection = "ltr" | "rtl";

interface TabsLook {
  variant: () => DitherTabsVariant;
  color: () => DitherColor;
  cell: () => number;
  bloom: () => Bloom;
  matrix: () => DitherMatrix;
  orientation: () => Orientation;
  direction: () => TextDirection;
  value: () => string | undefined;
  isKeyboard: () => boolean;
}

const TabsLookContext = createContext<TabsLook | null>(null);

const useTabsLook = (part: string): TabsLook => {
  const look = useContext(TabsLookContext);
  if (!look) {
    throw new Error(`${part} must be used inside <DitherTabs>.`);
  }
  return look;
};

const DURATION = 260;
const PILL_RADIUS = 8;
const BAR_CELLS = 2;
const GLOW_SHARE = 0.32;
const GLOW_PEAK = 0.36;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Glide {
  from: Box;
  to: string;
  start: number;
}

interface Scene {
  body: Box;
  dir: readonly [number, number];
  trail: number;
  ghosts: readonly { box: Box; tone: number }[];
}

interface Geometry {
  boxes: Map<string, Box>;
  left: number;
  width: number;
  height: number;
}

interface Grid {
  cols: number;
  rows: number;
  size: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOut = (value: number) => 1 - (1 - clamp01(value)) ** 4;
const easeInOut = (value: number) => {
  const x = clamp01(value);
  return x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2;
};
const smooth = (edge0: number, edge1: number, value: number) => {
  const x = clamp01((value - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const edgeProgress = (facing: number, progress: number) => {
  if (facing > 0) {
    return easeOut(progress / 0.78);
  }
  if (facing < 0) {
    return easeOut((progress - 0.14) / 0.86);
  }
  return easeOut(progress);
};

const centre = (box: Box): readonly [number, number] => [
  box.x + box.w / 2,
  box.y + box.h / 2,
];

const glideScene = (from: Box, to: Box, progress: number): Scene => {
  const [fx, fy] = centre(from);
  const [tx, ty] = centre(to);
  const length = Math.hypot(tx - fx, ty - fy);
  const dir: readonly [number, number] =
    length < 0.5 ? [0, 0] : [(tx - fx) / length, (ty - fy) / length];
  const left = lerp(from.x, to.x, edgeProgress(-dir[0], progress));
  const right = lerp(
    from.x + from.w,
    to.x + to.w,
    edgeProgress(dir[0], progress)
  );
  const top = lerp(from.y, to.y, edgeProgress(-dir[1], progress));
  const bottom = lerp(
    from.y + from.h,
    to.y + to.h,
    edgeProgress(dir[1], progress)
  );
  return {
    body: { h: bottom - top, w: right - left, x: left, y: top },
    dir,
    ghosts: [
      { box: from, tone: 1 - easeOut(progress / 0.5) },
      { box: to, tone: easeInOut((progress - 0.3) / 0.7) },
    ],
    trail: 1 - 0.85 * Math.sin(Math.PI * clamp01(progress)) ** 0.7,
  };
};

const EMPTY_BOX: Box = { h: 0, w: 0, x: 0, y: 0 };

const restScene = (box: Box): Scene => ({
  body: box,
  dir: [0, 0],
  ghosts: [],
  trail: 1,
});

const BASE = 0;
const LIGHT = 1;
const DARK = 2;

interface Sample {
  tone: number;
  ink: number;
}

const NONE: Sample = { ink: BASE, tone: 0 };

const roundedCoverage = (
  box: Box,
  px: number,
  py: number,
  radius: number,
  size: number
) => {
  const r = Math.min(radius, box.w / 2, box.h / 2);
  const qx = Math.abs(px - (box.x + box.w / 2)) - (box.w / 2 - r);
  const qy = Math.abs(py - (box.y + box.h / 2)) - (box.h / 2 - r);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const distance = outside + Math.min(Math.max(qx, qy), 0) - r;
  return clamp01(0.5 - distance / size);
};

interface ShapeContext {
  cx: number;
  cy: number;
  size: number;
  matrix: DitherMatrix;
  vertical: boolean;
  rtl: boolean;
}

const pillSample = (
  box: Box,
  px: number,
  py: number,
  { cx, cy, size, matrix }: ShapeContext
): Sample => {
  if (box.w <= 0 || box.h <= 0) {
    return NONE;
  }
  const cover = roundedCoverage(box, px, py, PILL_RADIUS, size);
  if (cover <= 0) {
    return NONE;
  }
  const fromTop = (py - box.y) / box.h;
  if (fromTop > 0.34 && fromTop < 0.66) {
    return { ink: BASE, tone: cover };
  }
  const rows = box.h / size;
  const lightLength = Math.max(2, Math.round(rows * 0.24));
  const darkLength = Math.max(2, Math.round(rows * 0.5));
  const light = 1 - (py - box.y) / size / lightLength;
  if (isInked(matrix, cx, cy, light)) {
    return { ink: LIGHT, tone: cover };
  }
  const dark = 1 - (box.y + box.h - py) / size / darkLength;
  return { ink: isInked(matrix, cx, cy, dark) ? DARK : BASE, tone: cover };
};

const underlineSample = (
  box: Box,
  px: number,
  py: number,
  { size, vertical, rtl }: ShapeContext
): Sample => {
  const along = vertical ? (py - box.y) / box.h : (px - box.x) / box.w;
  const fromStart = rtl ? box.x + box.w - px : px - box.x;
  const across = vertical ? fromStart : box.y + box.h - py;
  const depth = vertical ? box.w : box.h;
  if (along < 0 || along > 1 || across < 0 || across > depth) {
    return NONE;
  }
  const ends = smooth(0, 0.62, Math.min(along, 1 - along) * 2);
  const bar = BAR_CELLS * size;
  if (across <= bar) {
    return { ink: BASE, tone: ends };
  }
  const rise = (across - bar) / (depth * GLOW_SHARE);
  return {
    ink: BASE,
    tone: rise >= 1 ? 0 : GLOW_PEAK * (1 - rise) ** 1.3 * ends,
  };
};

const SAMPLERS = {
  pill: pillSample,
  underline: underlineSample,
} as const satisfies Record<
  DitherTabsVariant,
  (box: Box, px: number, py: number, context: ShapeContext) => Sample
>;

const alongBody = (scene: Scene, px: number, py: number) => {
  const [dx, dy] = scene.dir;
  const half = (Math.abs(dx) * scene.body.w + Math.abs(dy) * scene.body.h) / 2;
  if (half <= 0) {
    return 1;
  }
  const [bx, by] = centre(scene.body);
  return clamp01(((px - bx) * dx + (py - by) * dy) / (2 * half) + 0.5);
};

interface PaintOptions {
  canvas: HTMLCanvasElement;
  frame: { current: ImageData | null };
  grid: Grid;
  scene: Scene;
  inks: readonly Rgba[];
  variant: DitherTabsVariant;
  matrix: DitherMatrix;
  vertical: boolean;
  rtl: boolean;
}

const toByte = (value: number) => Math.round(clamp01(value) * 255);

const paint = ({
  canvas,
  frame,
  grid,
  scene,
  inks,
  variant,
  matrix,
  vertical,
  rtl,
}: PaintOptions): boolean => {
  const context = canvas.getContext("2d");
  if (!context) {
    return false;
  }
  const { cols, rows, size } = grid;
  if (frame.current?.width !== cols || frame.current.height !== rows) {
    frame.current = context.createImageData(cols, rows);
  }
  const { data } = frame.current;
  const bytes = inks.map((ink) => ink.map(toByte));
  const sample = SAMPLERS[variant];
  for (let cy = 0; cy < rows; cy += 1) {
    for (let cx = 0; cx < cols; cx += 1) {
      const px = (cx + 0.5) * size;
      const py = (cy + 0.5) * size;
      const shape: ShapeContext = { cx, cy, matrix, rtl, size, vertical };
      let best = sample(scene.body, px, py, shape);
      if (best.tone > 0 && scene.trail < 1) {
        const s = alongBody(scene, px, py);
        best = {
          ink: best.ink,
          tone: best.tone * lerp(scene.trail, 1, smooth(0, 0.9, s)),
        };
      }
      for (const ghost of scene.ghosts) {
        if (ghost.tone > 0) {
          const hit = sample(ghost.box, px, py, shape);
          if (hit.tone * ghost.tone > best.tone) {
            best = { ink: hit.ink, tone: hit.tone * ghost.tone };
          }
        }
      }
      const offset = (cy * cols + cx) * 4;
      const on = best.tone > 0 && isInked(matrix, cx, cy, best.tone);
      const [red = 0, green = 0, blue = 0, alpha = 255] =
        bytes[best.ink] ?? bytes[BASE] ?? [];
      data[offset] = red;
      data[offset + 1] = green;
      data[offset + 2] = blue;
      data[offset + 3] = on ? alpha : 0;
    }
  }
  context.putImageData(frame.current, 0, 0);
  return true;
};

const inkNames = (color: DitherColor) => {
  const base = cssColor(color);
  return [
    base,
    `color-mix(in oklab, ${base}, white 42%)`,
    `color-mix(in oklab, ${base}, black 48%)`,
  ] as const;
};

const offsetWithin = (el: HTMLElement, list: HTMLElement): Box => {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== list) {
    x += node.offsetLeft;
    y += node.offsetTop;
    const parent: Element | null = node.offsetParent;
    node = parent instanceof HTMLElement ? parent : null;
  }
  return { h: el.offsetHeight, w: el.offsetWidth, x, y };
};

const measureList = (list: HTMLElement): Geometry => {
  const found = new Map<string, Box>();
  for (const el of list.querySelectorAll<HTMLElement>(
    "[data-slot='tabs-trigger'][data-value], [data-key]"
  )) {
    const value = el.dataset.value ?? el.getAttribute("data-key");
    if (value && el.closest("[data-slot='tabs-list']") === list) {
      found.set(value, offsetWithin(el, list));
    }
  }
  const style = getComputedStyle(list);
  const padLeft = Number.parseFloat(style.paddingLeft) || 0;
  const padRight = Number.parseFloat(style.paddingRight) || 0;
  const padBottom = Number.parseFloat(style.paddingBottom) || 0;
  let left = 0;
  let right = list.clientWidth;
  let height = list.clientHeight;
  for (const box of found.values()) {
    left = Math.min(left, box.x - padLeft);
    right = Math.max(right, box.x + box.w + padRight);
    height = Math.max(height, box.y + box.h + padBottom);
  }
  const boxes = new Map<string, Box>();
  for (const [value, box] of found) {
    boxes.set(value, { ...box, x: box.x - left });
  }
  return { boxes, height, left, width: right - left };
};

const sameBox = (a: Box | undefined, b: Box | undefined) =>
  a !== undefined &&
  b !== undefined &&
  a.x === b.x &&
  a.y === b.y &&
  a.w === b.w &&
  a.h === b.h;

export interface DitherTabsProps {
  variant?: DitherTabsVariant;
  color?: DitherColor;
  cell?: number;
  bloom?: Bloom;
  matrix?: DitherMatrix;
  orientation?: Orientation;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  class?: string;
  children?: JSX.Element;
  dir?: TextDirection;
}

export const DitherTabs = (props: DitherTabsProps) => {
  const merged = mergeProps(
    {
      variant: "pill" as DitherTabsVariant,
      color: "ink" as DitherColor,
      cell: 2,
      bloom: "off" as Bloom,
      matrix: "bayer4" as DitherMatrix,
      orientation: "horizontal" as Orientation,
      dir: "ltr" as TextDirection,
    },
    props
  );

  const [local, rest] = splitProps(merged, [
    "variant",
    "color",
    "cell",
    "bloom",
    "matrix",
    "orientation",
    "dir",
    "value",
    "defaultValue",
    "onChange",
    "class",
    "children",
  ]);

  const [uncontrolled, setUncontrolled] = createSignal(local.defaultValue);
  const [isKeyboard, setIsKeyboard] = createSignal(false);

  const currentValue = createMemo(() => local.value ?? uncontrolled());

  const look: TabsLook = {
    bloom: () => local.bloom,
    cell: () => Math.max(1, Math.round(local.cell)),
    color: () => local.color,
    direction: () => local.dir,
    isKeyboard,
    matrix: () => local.matrix,
    orientation: () => local.orientation,
    value: currentValue,
    variant: () => local.variant,
  };

  return (
    <TabsLookContext.Provider value={look}>
      <TabsPrimitive
        value={currentValue()}
        defaultValue={local.defaultValue}
        onChange={(val) => {
          if (local.value === undefined) {
            setUncontrolled(val);
          }
          local.onChange?.(val);
        }}
        orientation={local.orientation}
        data-slot="tabs"
        data-variant={local.variant}
        onKeyDown={() => setIsKeyboard(true)}
        onPointerDown={() => setIsKeyboard(false)}
        class={cn(
          "group/tabs flex gap-4",
          local.orientation === "vertical" ? "flex-row" : "flex-col",
          local.class
        )}
        {...rest}
      >
        {local.children}
      </TabsPrimitive>
    </TabsLookContext.Provider>
  );
};

export type DitherTabsListProps = JSX.HTMLAttributes<HTMLDivElement> & {
  class?: string;
  style?: JSX.CSSProperties | string;
  children?: JSX.Element;
};

const LIST = {
  pill: "bg-muted h-10 items-center gap-1 rounded-[12px] p-1 data-[orientation=vertical]:h-auto data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
  underline:
    "items-end gap-1 shadow-[inset_0_-1px_0_var(--border)] data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[orientation=vertical]:shadow-[inset_1px_0_0_var(--border)] data-[orientation=vertical]:[&[dir=rtl]]:shadow-[inset_-1px_0_0_var(--border)]",
} as const satisfies Record<DitherTabsVariant, string>;

export const DitherTabsList = (props: DitherTabsListProps) => {
  const look = useTabsLook("DitherTabsList");
  let listRef: HTMLDivElement | undefined;
  let canvasRef: HTMLCanvasElement | undefined;
  const frameRef = { current: null as ImageData | null };
  let geometryRef: Geometry | null = null;
  let gridRef: Grid | null = null;
  let glideRef: Glide | null = null;
  let sceneRef: Scene | null = null;
  let shownRef: string | null = null;
  let rafRef = 0;

  const [ready, setReady] = createSignal(false);
  const reducedMotion = createPrefersReducedMotion();

  const [refSignal, setRefSignal] = createSignal<HTMLDivElement | null>(null);
  const inks = createDitherColors(refSignal, () => inkNames(look.color()));

  onMount(() => {
    if (listRef) setRefSignal(listRef);
  });

  const draw = (scene: Scene): boolean => {
    sceneRef = scene;
    const canvas = canvasRef;
    const grid = gridRef;
    const inkList = inks();
    if (!canvas || !grid || !inkList) {
      return false;
    }
    return paint({
      canvas,
      frame: frameRef,
      grid,
      inks: inkList,
      matrix: look.matrix(),
      rtl: look.direction() === "rtl",
      scene,
      variant: look.variant(),
      vertical: look.orientation() === "vertical",
    });
  };

  const frame = (now: number) => {
    const glide = glideRef;
    const target = glide ? geometryRef?.boxes.get(glide.to) : undefined;
    if (!glide || !target) {
      glideRef = null;
      rafRef = 0;
      return;
    }
    const progress = (now - glide.start) / DURATION;
    if (progress >= 1) {
      glideRef = null;
      rafRef = 0;
      draw(restScene(target));
      return;
    }
    draw(glideScene(glide.from, target, progress));
    rafRef = requestAnimationFrame(frame);
  };

  const redraw = () => {
    if (glideRef) {
      return;
    }
    const val = untrack(look.value);
    const box = val === undefined ? undefined : geometryRef?.boxes.get(val);
    if (draw(restScene(box ?? EMPTY_BOX)) && box) {
      setReady(true);
    }
  };

  const measure = () => {
    if (!listRef || !canvasRef) return;
    const geometry = measureList(listRef);
    geometryRef = geometry;
    const ratio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const size = Math.max(1, Math.round(untrack(look.cell) * ratio)) / ratio;
    const cols = Math.max(1, Math.ceil(geometry.width / size));
    const rows = Math.max(1, Math.ceil(geometry.height / size));
    gridRef = { cols, rows, size };
    canvasRef.width = cols;
    canvasRef.height = rows;
    canvasRef.style.width = `${cols * size}px`;
    canvasRef.style.height = `${rows * size}px`;

    const clip = canvasRef.parentElement;
    if (clip) {
      clip.style.left = `${geometry.left}px`;
      clip.style.width = `${geometry.width}px`;
      clip.style.height = `${geometry.height}px`;
    }
    untrack(() => redraw());
  };

  createEffect(() => {
    const val = look.value();
    const previous = shownRef;
    shownRef = val ?? null;
    const boxes = geometryRef?.boxes;
    const drawn = sceneRef?.body;
    const from = drawn && drawn.w > 0 ? drawn : boxes?.get(previous ?? "");
    const to = val === undefined ? undefined : boxes?.get(val);

    if (
      reducedMotion() ||
      look.isKeyboard() ||
      previous === null ||
      val === undefined ||
      from === undefined ||
      sameBox(from, to)
    ) {
      cancelAnimationFrame(rafRef);
      rafRef = 0;
      glideRef = null;
      redraw();
      return;
    }

    glideRef = { from, start: performance.now(), to: val };
    if (rafRef === 0) {
      rafRef = requestAnimationFrame(frame);
    }
  });

  onMount(() => {
    if (!listRef) return;
    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(listRef);
    for (const trigger of listRef.querySelectorAll("[data-slot='tabs-trigger']")) {
      observer.observe(trigger);
    }
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(() => measure());
      document.fonts.addEventListener("loadingdone", measure);
    }
    onCleanup(() => {
      cancelAnimationFrame(rafRef);
      observer.disconnect();
      if (typeof document !== "undefined" && document.fonts) {
        document.fonts.removeEventListener("loadingdone", measure);
      }
    });
  });

  createEffect(() => {
    // Redraw on changes to reactive options
    inks();
    look.matrix();
    look.variant();
    look.orientation();
    look.direction();
    untrack(() => redraw());
  });

  createEffect(() => {
    look.cell();
    untrack(() => measure());
  });

  return (
    <TabsPrimitive.List
      ref={(el: HTMLDivElement) => {
        listRef = el;
      }}
      data-slot="tabs-list"
      data-variant={look.variant()}
      data-pending={ready() ? undefined : ""}
      class={cn(
        "group/dither-tabs relative isolate inline-flex w-fit max-w-full",
        LIST[look.variant()],
        props.class
      )}
      style={{
        "--dcn-tabs-ink": cssColor(look.color()),
        ...(typeof props.style === "object" ? props.style : {}),
      }}
      dir={look.direction()}
    >
      <span
        aria-hidden="true"
        class="pointer-events-none absolute top-0 left-0 -z-10 size-full"
        style={bloomStyle(look.color(), look.bloom())}
      >
        <span class="absolute top-0 left-0 block size-full overflow-hidden">
          <canvas
            ref={(el) => (canvasRef = el)}
            class="absolute top-0 left-0 block max-w-none [image-rendering:pixelated]"
          />
        </span>
      </span>
      {props.children}
    </TabsPrimitive.List>
  );
};

export type DitherTabsTriggerProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
  disabled?: boolean;
  class?: string;
  children?: JSX.Element;
};

const TRIGGER = {
  pill: cn(
    "h-8 rounded-[8px] px-3.5 overflow-hidden",
    "data-[selected]:text-white",
    "group-data-pending/dither-tabs:data-[selected]:bg-(--dcn-tabs-ink)"
  ),
  underline: cn(
    "h-10 px-3 data-[selected]:text-foreground",
    "group-data-pending/dither-tabs:data-[selected]:shadow-[inset_0_-4px_0_var(--dcn-tabs-ink)]",
    "group-data-[orientation=vertical]/dither-tabs:group-data-pending/dither-tabs:data-[selected]:shadow-[inset_4px_0_0_var(--dcn-tabs-ink)]",
    "group-data-[orientation=vertical]/dither-tabs:group-data-pending/dither-tabs:group-[[dir=rtl]]/dither-tabs:data-[selected]:shadow-[inset_-4px_0_0_var(--dcn-tabs-ink)]",
    "group-data-[orientation=vertical]/dither-tabs:justify-start group-data-[orientation=vertical]/dither-tabs:ps-4"
  ),
} as const satisfies Record<DitherTabsVariant, string>;

const HOVER = {
  pill: "inset-0 rounded-[inherit]",
  underline:
    "inset-x-0 bottom-0 h-(--dcn-tabs-bar) group-data-[orientation=vertical]/dither-tabs:inset-y-0 group-data-[orientation=vertical]/dither-tabs:end-auto group-data-[orientation=vertical]/dither-tabs:h-auto group-data-[orientation=vertical]/dither-tabs:w-(--dcn-tabs-bar)",
} as const satisfies Record<DitherTabsVariant, string>;

export const DitherTabsTrigger = (props: DitherTabsTriggerProps) => {
  const look = useTabsLook("DitherTabsTrigger");
  const hoverStyle = createMemo<JSX.CSSProperties>(() => {
    if (look.variant() === "pill") {
      const cellPx = look.cell();
      const extentCells = Math.max(8, Math.round(32 / (cellPx || 2)));
      const fadeCells = Math.max(6, Math.round(extentCells * 0.85));
      return {
        ...fillStyle("gradient", {
          edge: "bottom",
          length: fadeCells,
          extent: extentCells,
          from: 0.52,
          to: 0,
          matrix: look.matrix(),
          cell: cellPx,
          color: look.color(),
        }),
        "--dcn-tabs-bar": `${cellPx * BAR_CELLS}px`,
      };
    }
    return {
      ...fillStyle("dotted", { cell: look.cell(), color: look.color() }),
      "--dcn-tabs-bar": `${look.cell() * BAR_CELLS}px`,
    };
  });

  return (
    <TabsPrimitive.Trigger
      value={props.value}
      data-slot="tabs-trigger"
      data-value={props.value}
      disabled={props.disabled}
      class={cn(
        "group/tab relative isolate inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 text-sm font-medium whitespace-nowrap select-none",
        "text-muted-foreground transition-[color] duration-200 ease-(--ease-out) hover:text-foreground motion-reduce:transition-none",
        "data-[selected]:delay-100 motion-reduce:data-[selected]:delay-0",
        "group-data-[input=keyboard]/tabs:transition-none group-data-[input=keyboard]/tabs:delay-0",
        "outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
        "disabled:cursor-not-allowed disabled:opacity-45",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        TRIGGER[look.variant()],
        props.class
      )}
    >
      <span
        aria-hidden="true"
        class={cn(
          "pointer-events-none absolute -z-10 opacity-0 transition-opacity duration-200 ease-(--ease-out) motion-reduce:transition-none",
          "group-hover/tab:opacity-60 group-data-[selected]/tab:opacity-0 group-data-[selected]/tab:duration-0",
          HOVER[look.variant()]
        )}
        style={hoverStyle()}
      />
      {props.children}
    </TabsPrimitive.Trigger>
  );
};

export type DitherTabsContentProps = JSX.HTMLAttributes<HTMLDivElement> & {
  value: string;
  class?: string;
  children?: JSX.Element;
};

export const DitherTabsContent = (props: DitherTabsContentProps) => {
  useTabsLook("DitherTabsContent");
  return (
    <TabsPrimitive.Content
      value={props.value}
      data-slot="tabs-content"
      class={cn(
        "flex-1 rounded-md outline-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring focus-visible:outline-solid",
        props.class
      )}
    >
      {props.children}
    </TabsPrimitive.Content>
  );
};
