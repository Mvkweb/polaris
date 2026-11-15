import {
  Component,
  For,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount
} from 'solid-js'
import {
  openTabs,
  activeTabPath,
  setActiveTabPath,
  closeEditorTab,
  isFileDirty,
  lastSavedPath,
  toggleQuickOpen
} from '../../store'
import type { EditorTab } from '../../types'
import { FileIcon } from '../file-tree/FileIcon'

/**
 * Liquid tab bar: a SolidJS port of the technique from `liquid-gooey`
 * (github.com/Jakubantalik/Libraries.dev, MIT, React-only).
 *
 *   silhouette layer (SVG): one blob for the active tab + one blob for the
 *   editor surface, run through blur → alpha-contrast. Where the blobs touch
 *   they bridge into concave fillets, so the active tab is literally the same
 *   liquid as the editor below it.
 *   content layer (DOM): crisp, transparent tabs on top.
 *
 * The active blob's left and right edges are two independent springs (the edge
 * in the direction of travel is stiffer), so it stretches and snaps as it moves.
 */

// ── Dimensions ───────────────────────────────────────────────────────────────
const BAR_HEIGHT = 40
const TOP_GAP = 5
const TAB_HEIGHT = BAR_HEIGHT - TOP_GAP // tabs sit flush on the editor edge
const TAB_RADIUS = 9

// ── Colors ───────────────────────────────────────────────────────────────────
const EDITOR_BG = '#0a0a0a' // MUST match the editor canvas color

// ── Goo filter (same math as liquid-gooey's GooFilterPrimitives) ─────────────
const BLUR = 6 // bigger = deeper fillets between tab and editor
const CONTRAST = 18
const INTERCEPT = Math.round((0.5 - CONTRAST * (5 / 12)) * 100) / 100
// The threshold contour of a blurred straight edge sits ~0.21σ outside the
// geometry. Blobs are inset by this so the final edges land exactly on the
// tab bounds and exactly on the editor's top edge.
const EDGE = BLUR * 0.21
const BELOW = 40 // blobs extend below the bar (clipped by it) so they merge solidly
const SIDE_BLEED = 80
const FILTER_PAD = BLUR * 3 + 12

// ── Springs ──────────────────────────────────────────────────────────────────
// Snappier, higher-tempo liquid physics: leading edge shoots ahead, trailing edge
// catches up in a quick, energetic stretch-and-snap.
const LEAD = { k: 700, c: 38 }
const TRAIL = { k: 300, c: 26 }

// ── Misc motion ──────────────────────────────────────────────────────────────
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'

type Edge = { x: number; v: number; target: number; k: number; c: number }

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let uid = 0

export const TabBar: Component = () => {
  const filterId = `tabbar-goo-${uid++}`

  let barRef: HTMLDivElement | undefined
  let tabsScrollRef: HTMLDivElement | undefined
  let trackRef: HTMLDivElement | undefined
  let blobRef: SVGRectElement | undefined
  const tabElements: Map<string, HTMLDivElement> = new Map()

  // Tabs created after first paint pop in. Tabs restored on startup don't.
  let hasMounted = false

  const shouldShow = createMemo(() => openTabs().length > 0)
  const [barWidth, setBarWidth] = createSignal(0)

  // ── Liquid engine: two springs (left/right edge), rAF that sleeps at rest ──
  const left: Edge = { x: 0, v: 0, target: 0, ...TRAIL }
  const right: Edge = { x: 0, v: 0, target: 0, ...LEAD }
  let placed = false
  let lastDir: 1 | -1 = 1
  let raf = 0
  let last = 0

  const step = (e: Edge, dt: number) => {
    const n = Math.max(1, Math.ceil(dt * 240))
    const h = dt / n
    for (let i = 0; i < n; i++) {
      const a = -e.k * (e.x - e.target) - e.c * e.v
      e.v += a * h
      e.x += e.v * h
    }
  }

  const settled = (e: Edge) => Math.abs(e.x - e.target) < 0.05 && Math.abs(e.v) < 0.5

  // Paints the active blob. Springs live in track coordinates; the silhouette
  // layer is bar-wide and doesn't scroll, so subtract scrollLeft here.
  const render = () => {
    if (!blobRef) return
    const sl = tabsScrollRef?.scrollLeft ?? 0
    const l = Math.min(left.x, right.x - 2 * EDGE - 1)
    // When at the left wall (Tab 0 unscrolled), extend the blob flush to x <= 0
    // so it fills down cleanly into the editor without an awkward dark notch or scoop.
    // As it slides to other tabs, this smoothly tapers so fillets naturally form between tabs.
    const leftExt = Math.max(0, 1 - Math.max(0, l - sl) / 14) * (EDGE * 2.5)
    const renderX = l - sl + EDGE - leftExt
    const renderW = Math.max(0, right.x - l - EDGE * 2 + leftExt)
    blobRef.setAttribute('x', String(renderX))
    blobRef.setAttribute('width', String(renderW))
  }

  const tick = (t: number) => {
    const dt = Math.min((t - last) / 1000, 1 / 30)
    last = t
    step(left, dt)
    step(right, dt)
    if (settled(left) && settled(right)) {
      left.x = left.target
      right.x = right.target
      left.v = right.v = 0
      raf = 0
      render()
      return
    }
    render()
    raf = requestAnimationFrame(tick)
  }

  const wake = () => {
    if (raf) return
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }

  const setBlobVisible = (visible: boolean) => {
    if (blobRef) blobRef.style.opacity = visible ? '1' : '0'
  }

  const setTarget = (l: number, r: number) => {
    if (!placed || prefersReducedMotion()) {
      // first placement (or reduced motion): snap, don't fly in from 0
      left.x = left.target = l
      right.x = right.target = r
      left.v = right.v = 0
      placed = true
      render()
      setBlobVisible(true)
      return
    }
    if (l === left.target && r === right.target) return

    if (l !== left.target) lastDir = l > left.target ? 1 : -1
    // The edge in the direction of travel snaps ahead, the other trails.
    Object.assign(right, lastDir === 1 ? LEAD : TRAIL)
    Object.assign(left, lastDir === 1 ? TRAIL : LEAD)
    left.target = l
    right.target = r
    setBlobVisible(true)
    wake()
  }

  const updateActiveBounds = (path?: string | null) => {
    const currentPath = path ?? activeTabPath()
    const el = currentPath ? tabElements.get(currentPath) : undefined
    if (!el) {
      setBlobVisible(false)
      placed = false
      return
    }
    setTarget(el.offsetLeft, el.offsetLeft + el.offsetWidth)
  }

  // Instant selection on pointerdown
  const selectTab = (path: string) => {
    setActiveTabPath(path)
    updateActiveBounds(path)
    tabElements
      .get(path)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }

  // Keep the blob in sync when tabs change from outside (open file, close tab…)
  createEffect(
    on([activeTabPath, () => openTabs().length], () => {
      requestAnimationFrame(() => {
        updateActiveBounds()
        const currentPath = activeTabPath()
        if (currentPath) {
          tabElements
            .get(currentPath)
            ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
        }
      })
    })
  )

  onMount(() => {
    requestAnimationFrame(() => {
      updateActiveBounds()
      hasMounted = true
    })

    const ro = new ResizeObserver(() => {
      if (barRef) setBarWidth(barRef.offsetWidth)
      updateActiveBounds()
    })
    if (barRef) ro.observe(barRef)
    if (trackRef) ro.observe(trackRef)
    onCleanup(() => ro.disconnect())
  })

  onCleanup(() => {
    if (raf) cancelAnimationFrame(raf)
  })

  // Vertical mouse wheel scrolls tabs horizontally
  const handleWheel = (e: WheelEvent) => {
    if (tabsScrollRef && e.deltaY !== 0 && !e.deltaX) {
      e.preventDefault()
      tabsScrollRef.scrollBy({ left: e.deltaY, behavior: 'auto' })
    }
  }

  return (
    <div
      ref={(el) => (barRef = el)}
      class="w-full flex items-stretch shrink-0 select-none overflow-hidden relative"
      style={{
        height: shouldShow() ? `${BAR_HEIGHT}px` : '0px',
        transition: `height 220ms ${EASE_OUT}`,
        border: 'none'
      }}
    >
      <style>{`
        @keyframes tabbar-tab-in {
          from { opacity: 0; transform: translateY(4px) scale(0.9); }
          to   { opacity: 1; transform: none; }
        }
        .tabbar-tab-in { animation: tabbar-tab-in 300ms ${EASE_OUT} backwards; }
        @media (prefers-reduced-motion: reduce) {
          .tabbar-tab-in { animation: none; }
        }
      `}</style>

      {/* ── Silhouette layer (below): the liquid ─────────────────────────────── */}
      <svg
        aria-hidden="true"
        class="absolute pointer-events-none z-0"
        style={{ inset: '0', width: '100%', height: '100%', overflow: 'visible' }}
      >
        <defs>
          <filter
            id={filterId}
            filterUnits="userSpaceOnUse"
            x={-(FILTER_PAD + SIDE_BLEED)}
            y={-FILTER_PAD}
            width={barWidth() + 2 * (FILTER_PAD + SIDE_BLEED)}
            height={BAR_HEIGHT + BELOW + 2 * FILTER_PAD}
            color-interpolation-filters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation={BLUR} result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${CONTRAST} ${INTERCEPT}`}
              result="goo"
            />
            <feFlood flood-color={EDITOR_BG} flood-opacity="1" result="color" />
            <feComposite in="color" in2="goo" operator="in" />
          </filter>
        </defs>

        <g filter={`url(#${filterId})`} fill={EDITOR_BG}>
          {/* Editor surface: its top edge is the bar's bottom edge. The active
              tab merges into it, which is what forms the concave fillets. */}
          <rect
            x={-SIDE_BLEED}
            y={BAR_HEIGHT + EDGE}
            width={barWidth() + 2 * SIDE_BLEED}
            height={BELOW}
          />
          {/* Active tab blob: x/width are driven by the springs */}
          <rect
            ref={(el) => (blobRef = el)}
            x="0"
            y={TOP_GAP + EDGE}
            width="0"
            height={BAR_HEIGHT + BELOW / 2 - TOP_GAP - EDGE}
            rx={TAB_RADIUS}
            ry={TAB_RADIUS}
            style={{ opacity: '0', transition: 'opacity 150ms linear' }}
          />
        </g>
      </svg>

      {/* ── Content layer (above): crisp, transparent tabs ────────────────────── */}
      <div
        ref={(el) => (tabsScrollRef = el)}
        onWheel={handleWheel}
        onScroll={render}
        class="relative z-10 flex items-end h-full min-w-0 no-drag overflow-x-auto no-scrollbar"
      >
        <div ref={(el) => (trackRef = el)} class="relative flex items-end h-full gap-1 pl-0 pr-2">
          <For each={openTabs()}>
            {(tab: EditorTab) => {
              const animateIn = hasMounted
              const isActive = () => activeTabPath() === tab.path
              const isDirty = () => isFileDirty(tab.path)
              const isJustSaved = () => lastSavedPath() === tab.path
              const showsDot = () => isDirty() || isJustSaved()

              onCleanup(() => {
                tabElements.delete(tab.path)
              })

              return (
                <div
                  ref={(el) => {
                    tabElements.set(tab.path, el)
                  }}
                  onPointerDown={(e) => {
                    if (e.button === 0) selectTab(tab.path)
                  }}
                  onAuxClick={(e) => {
                    if (e.button === 1) {
                      e.preventDefault()
                      closeEditorTab(tab.path)
                    }
                  }}
                  title={tab.path}
                  class={`group relative shrink-0 flex items-center gap-2 pl-3 pr-2 pb-[5px] text-[12.5px] font-medium tracking-tight cursor-pointer select-none transition-colors duration-200 ${
                    animateIn ? 'tabbar-tab-in' : ''
                  } ${isActive() ? 'text-white' : 'text-white/45 hover:text-white/90'}`}
                  style={{ height: `${TAB_HEIGHT}px` }}
                >
                  {/* Hover chip for inactive tabs (the active tab is liquid) */}
                  <span
                    class={`absolute inset-x-0 top-0 bottom-[5px] -z-10 transition-opacity duration-200 bg-white/[0.04] ${
                      isActive() ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    style={{ 'border-radius': `${TAB_RADIUS + 1}px` }}
                  />

                  <FileIcon name={tab.name} isDirectory={false} class="w-3.5 h-3.5 shrink-0" />

                  <span class="truncate max-w-[150px]">{tab.name}</span>

                  {/* Status dot and close button share one slot and cross-morph on hover */}
                  <div class="relative w-4 h-4 shrink-0">
                    <span
                      title={isJustSaved() ? 'Saved' : 'Unsaved changes'}
                      class={`absolute inset-0 m-auto w-2 h-2 rounded-full pointer-events-none transition-all duration-200 group-hover:scale-0 group-hover:opacity-0 ${
                        isJustSaved() ? 'bg-emerald-400' : 'bg-[var(--accent)]'
                      } ${showsDot() ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                    />

                    <button
                      type="button"
                      title="Close Tab"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        closeEditorTab(tab.path)
                      }}
                      class={`absolute inset-0 rounded-full flex items-center justify-center outline-none cursor-pointer text-white/60 hover:text-white hover:bg-white/[0.14] transition-all duration-200 ${
                        showsDot()
                          ? 'opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100'
                          : isActive()
                            ? 'opacity-100 scale-100'
                            : 'opacity-40 scale-100 group-hover:opacity-100'
                      }`}
                    >
                      <svg viewBox="0 0 16 16" fill="currentColor" class="w-2.5 h-2.5">
                        <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            }}
          </For>

          {/* + button: quick open */}
          <button
            type="button"
            onClick={() => toggleQuickOpen()}
            title="Quick Open / Open File (Ctrl+P)"
            class="group/plus relative mb-[6px] ml-1.5 w-7 h-7 shrink-0 rounded-full flex items-center justify-center bg-white/[0.06] text-white/55 hover:text-white hover:bg-white/[0.12] active:scale-90 transition-all duration-200 cursor-pointer outline-none"
          >
            <svg
              viewBox="0 0 16 16"
              fill="currentColor"
              class="w-3.5 h-3.5 transition-transform duration-300 group-hover/plus:rotate-90"
              style={{ 'transition-timing-function': EASE_OUT }}
            >
              <path d="M8 2.5a.75.75 0 0 1 .75.75v4h4a.75.75 0 0 1 0 1.5h-4v4a.75.75 0 0 1-1.5 0v-4h-4a.75.75 0 0 1 0-1.5h4v-4A.75.75 0 0 1 8 2.5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Remaining space: frameless window drag region */}
      <div class="relative z-10 flex-1 h-full drag-region" />
    </div>
  )
}

export default TabBar
