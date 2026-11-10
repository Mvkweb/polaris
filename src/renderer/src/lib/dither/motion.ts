import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  untrack,
  type Accessor,
} from "solid-js";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Whether the visitor asked for reduced motion. `false` on the server. */
export const createPrefersReducedMotion = (): Accessor<boolean> => {
  const [matches, setMatches] = createSignal(false);

  onMount(() => {
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    setMatches(query.matches);
    const onChange = () => setMatches(query.matches);
    query.addEventListener("change", onChange);
    onCleanup(() => query.removeEventListener("change", onChange));
  });

  return matches;
};

/** Whether the tab is visible. `true` on the server. */
export const createDocumentVisible = (): Accessor<boolean> => {
  const [visible, setVisible] = createSignal(true);

  onMount(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    onCleanup(() => document.removeEventListener("visibilitychange", onChange));
  });

  return visible;
};

/**
 * Whether the element is on screen, or within `rootMargin` of it.
 * `false` until the first observation.
 */
export const createInView = (
  target: Accessor<Element | null | undefined>,
  { rootMargin = "120px" }: { rootMargin?: string } = {}
): Accessor<boolean> => {
  const [inView, setInView] = createSignal(false);

  createEffect(() => {
    const el = target();
    if (!el) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? false),
      { rootMargin }
    );
    observer.observe(el);
    onCleanup(() => observer.disconnect());
  });

  return inView;
};

/**
 * `running`: drawing every frame. `paused`: offscreen or the tab is hidden.
 * `static`: motion is off (reduced motion or `enabled: false`), so the
 * callback ran once for a still frame.
 */
export type FrameLoopState = "running" | "paused" | "static";

/**
 * Called once per drawn frame with the seconds of motion so far (frozen
 * while paused) and the seconds since the previous frame (at most 0.1).
 * For the still frame drawn when motion is off, `delta` is 0 and `time` is
 * `stillTime`.
 */
export type FrameLoopCallback = (time: number, delta: number) => void;

type MaybeAccessor<T> = T | Accessor<T>;

const read = <T>(value: MaybeAccessor<T>): T =>
  typeof value === "function" ? (value as Accessor<T>)() : value;

export interface FrameLoopOptions {
  /** Pause while this element is offscreen. Omit to ignore visibility. */
  target?: Accessor<Element | null | undefined>;
  /** `false` holds a still frame, as reduced motion does. Default `true`. */
  enabled?: MaybeAccessor<boolean>;
  /** Frame rate cap. Default 30, which keeps slow drifts smooth. */
  fps?: MaybeAccessor<number>;
  /** The `time` passed for the still frame. Default 0. */
  stillTime?: MaybeAccessor<number>;
}

const noTarget = () => null;

// One long frame (a tab switch, a debugger) must not jump the motion.
const MAX_DELTA = 0.1;

/**
 * A requestAnimationFrame loop that runs only when it can be seen. It
 * pauses offscreen and in hidden tabs, and under reduced motion (or
 * `enabled: false`) it calls `callback` once with `stillTime` instead.
 * Returns the loop state, which changes rarely, never per frame.
 */
export const createFrameLoop = (
  callback: FrameLoopCallback,
  {
    target,
    enabled = true,
    fps = 30,
    stillTime = 0,
  }: FrameLoopOptions = {}
): Accessor<FrameLoopState> => {
  const reducedMotion = createPrefersReducedMotion();
  const visible = createDocumentVisible();
  const inView = createInView(target ?? noTarget);
  const onScreen = () => (target ? inView() : true);

  const isStatic = () => reducedMotion() || !read(enabled);
  const isRunning = () => !isStatic() && visible() && onScreen();
  let time = 0;

  createEffect(() => {
    if (isStatic()) {
      const still = read(stillTime);
      untrack(() => callback(still, 0));
      return;
    }
    if (!isRunning()) {
      return;
    }
    const interval = 1000 / Math.max(1, read(fps));
    let frame = 0;
    let lastTick = performance.now();
    let lastDraw = -Infinity;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const delta = Math.min((now - lastTick) / 1000, MAX_DELTA);
      lastTick = now;
      time += delta;
      // A small tolerance so 60Hz screens hit 30fps evenly.
      if (now - lastDraw >= interval - 2) {
        const sinceDraw = Math.min((now - lastDraw) / 1000, MAX_DELTA);
        lastDraw = now;
        untrack(() => callback(time, sinceDraw));
      }
    };
    frame = requestAnimationFrame(tick);
    onCleanup(() => cancelAnimationFrame(frame));
  });

  return createMemo(() => {
    if (isStatic()) {
      return "static";
    }
    return isRunning() ? "running" : "paused";
  });
};

export const useFrameLoop = createFrameLoop;
export const usePrefersReducedMotion = createPrefersReducedMotion;
export const useDocumentVisible = createDocumentVisible;
export const useInView = createInView;

