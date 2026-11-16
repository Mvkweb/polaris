import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

/**
 * 1:1 Zed Cursor Movement Animation & Damped Spring Physics for CodeMirror 6.
 *
 * Direct port of Zed Editor's cursor animation physics:
 * (crates/editor/src/cursor_animation.rs adapted from PR #63195 by @tiny-paris)
 *
 * Key physics characteristics:
 * - 4-corner animated quad representation:
 *     Corner 0: Top-Left (-0.5, -0.5)
 *     Corner 1: Top-Right (0.5, -0.5)
 *     Corner 2: Bottom-Right (0.5, 0.5)
 *     Corner 3: Bottom-Left (-0.5, 0.5)
 * - Exact DampedSpringAnimation closed-form differential equations:
 *     angular_frequency = 4.0 / animation_length
 *     decay = exp(-angular_frequency * dt)
 *     position = (initial_pos + combined_vel * dt) * decay
 *     velocity = decay * (-initial_pos * w - combined_vel * dt * w + combined_vel)
 * - Directional corner alignment and ranking trail factors [1.0, 0.9, 0.5, 0.3]:
 *     Leading corners (alignment > 0.5) snap forward in 20ms (SNAP_ANIMATION_LENGTH_SECONDS).
 *     Trailing corners lag behind according to rank.
 * - Short move threshold (8.0 chars): 50ms duration for rapid typing; 125ms for line jumps.
 * - Single filled quadrilateral polygon matching Zed's visual smear ribbon.
 * - Actively tracks and glides during selection (tracks selection.head in real time).
 * - Instant snap on document scroll so scrolling remains crisp and responsive.
 * - Zero CPU/GPU wakeups while idle (rAF sleeps as soon as physics converge).
 */

const MAX_FRAME_DURATION = 0.033 // 33ms maximum dt
const SPRING_RESET_EPSILON = 0.001
const SPRING_ACTIVE_EPSILON = 0.01
const CORNER_ACTIVE_DISTANCE = 0.5
const GEOMETRY_EPSILON = 0.01
const SHORT_MOVE_THRESHOLD = 8.0
const LEADING_SNAP_THRESHOLD = 0.5
const SNAP_ANIMATION_LENGTH_SECONDS = 0.02
const ANIMATION_RESET_THRESHOLD_SECONDS = 0.075
const MAX_TRAIL_DISTANCE_FACTOR = 100.0
const RANK_TRAIL_FACTORS = [1.0, 0.9, 0.5, 0.3]
const ANIMATION_LENGTH_SECONDS = 0.125
const SHORT_ANIMATION_LENGTH_SECONDS = 0.05
const TRAIL_SIZE = 1.0

interface AnimationPoint {
  x: number
  y: number
}

function pointLength(p: AnimationPoint): number {
  return Math.hypot(p.x, p.y)
}

function normalizePoint(p: AnimationPoint): AnimationPoint {
  const len = pointLength(p)
  if (len === 0 || !Number.isFinite(len)) return { x: 0, y: 0 }
  return { x: p.x / len, y: p.y / len }
}

interface CursorGeometry {
  origin: AnimationPoint
  width: number
  height: number
}

function geometryCenter(g: CursorGeometry): AnimationPoint {
  return {
    x: g.origin.x + g.width / 2.0,
    y: g.origin.y + g.height / 2.0
  }
}

/**
 * Closed-form analytical solution to the critically damped harmonic oscillator:
 * x''(t) + 2*w*x'(t) + w^2*x(t) = 0
 */
class DampedSpringAnimation {
  position = 0
  velocity = 0

  update(elapsedSeconds: number, animationLength: number): boolean {
    if (
      !Number.isFinite(elapsedSeconds) ||
      elapsedSeconds < 0 ||
      !Number.isFinite(animationLength) ||
      animationLength <= elapsedSeconds ||
      Math.abs(this.position) < SPRING_RESET_EPSILON
    ) {
      this.reset()
      return false
    }

    if (elapsedSeconds === 0) {
      return Math.abs(this.position) >= SPRING_ACTIVE_EPSILON
    }

    const angularFrequency = 4.0 / animationLength
    const initialPosition = this.position
    const combinedVelocity = this.position * angularFrequency + this.velocity
    const decay = Math.exp(-angularFrequency * elapsedSeconds)

    this.position = (initialPosition + combinedVelocity * elapsedSeconds) * decay
    this.velocity =
      decay *
      (-initialPosition * angularFrequency -
        combinedVelocity * elapsedSeconds * angularFrequency +
        combinedVelocity)

    if (
      !Number.isFinite(this.position) ||
      !Number.isFinite(this.velocity) ||
      Math.abs(this.position) < SPRING_RESET_EPSILON
    ) {
      this.reset()
      return false
    }

    return Math.abs(this.position) >= SPRING_ACTIVE_EPSILON
  }

  reset(): void {
    this.position = 0
    this.velocity = 0
  }
}

class Corner {
  readonly relativePosition: AnimationPoint
  currentPosition: AnimationPoint = { x: 0, y: 0 }
  targetPosition: AnimationPoint = { x: 0, y: 0 }
  horizontalAnimation = new DampedSpringAnimation()
  verticalAnimation = new DampedSpringAnimation()
  animationLength = 0

  constructor(rel: AnimationPoint) {
    this.relativePosition = rel
  }

  destination(geometry: CursorGeometry): AnimationPoint {
    const center = geometryCenter(geometry)
    return {
      x: center.x + this.relativePosition.x * geometry.width,
      y: center.y + this.relativePosition.y * geometry.height
    }
  }

  directionAlignment(geometry: CursorGeometry): number {
    const dest = this.destination(geometry)
    const travel = normalizePoint({
      x: dest.x - this.currentPosition.x,
      y: dest.y - this.currentPosition.y
    })
    const cornerDir = normalizePoint(this.relativePosition)
    return travel.x * cornerDir.x + travel.y * cornerDir.y
  }

  snap(geometry: CursorGeometry): void {
    const dest = this.destination(geometry)
    this.currentPosition = { ...dest }
    this.targetPosition = { ...dest }
    this.horizontalAnimation.reset()
    this.verticalAnimation.reset()
  }

  retarget(geometry: CursorGeometry, rank: number): void {
    const destination = this.destination(geometry)
    const geomWidth = Math.max(1e-7, geometry.width)
    const geomHeight = Math.max(1e-7, geometry.height)

    const horizontalJump = (destination.x - this.targetPosition.x) / geomWidth
    const verticalJump = (destination.y - this.targetPosition.y) / geomHeight
    const normalizedJump = normalizePoint({ x: horizontalJump, y: verticalJump })
    const cornerDirection = normalizePoint(this.relativePosition)
    const leadingAlignment =
      normalizedJump.x * cornerDirection.x + normalizedJump.y * cornerDirection.y
    const isShortJump =
      Math.abs(horizontalJump) <= SHORT_MOVE_THRESHOLD &&
      Math.abs(verticalJump) <= SPRING_RESET_EPSILON

    const baseAnimationLength = isShortJump
      ? Math.min(ANIMATION_LENGTH_SECONDS, SHORT_ANIMATION_LENGTH_SECONDS)
      : ANIMATION_LENGTH_SECONDS

    const referenceAnimationLength =
      leadingAlignment > LEADING_SNAP_THRESHOLD
        ? SNAP_ANIMATION_LENGTH_SECONDS
        : baseAnimationLength * RANK_TRAIL_FACTORS[Math.min(3, rank)]

    this.animationLength =
      baseAnimationLength +
      (referenceAnimationLength - baseAnimationLength) * TRAIL_SIZE

    if (this.animationLength > ANIMATION_RESET_THRESHOLD_SECONDS) {
      this.horizontalAnimation.reset()
      this.verticalAnimation.reset()
    }

    this.targetPosition = destination
    this.horizontalAnimation.position = destination.x - this.currentPosition.x
    this.verticalAnimation.position = destination.y - this.currentPosition.y
  }

  update(elapsedSeconds: number, maxTrailDistance: number): boolean {
    this.horizontalAnimation.update(elapsedSeconds, this.animationLength)
    this.verticalAnimation.update(elapsedSeconds, this.animationLength)

    this.horizontalAnimation.position = Math.max(
      -maxTrailDistance,
      Math.min(maxTrailDistance, this.horizontalAnimation.position)
    )
    this.verticalAnimation.position = Math.max(
      -maxTrailDistance,
      Math.min(maxTrailDistance, this.verticalAnimation.position)
    )

    this.currentPosition = {
      x: this.targetPosition.x - this.horizontalAnimation.position,
      y: this.targetPosition.y - this.verticalAnimation.position
    }

    return (
      Math.abs(this.horizontalAnimation.position) > CORNER_ACTIVE_DISTANCE ||
      Math.abs(this.verticalAnimation.position) > CORNER_ACTIVE_DISTANCE
    )
  }
}

class CursorAnimationState {
  corners: [Corner, Corner, Corner, Corner]
  targetGeometry: CursorGeometry | null = null
  active = false

  constructor() {
    this.corners = [
      new Corner({ x: -0.5, y: -0.5 }), // Top-Left (0)
      new Corner({ x: 0.5, y: -0.5 }),  // Top-Right (1)
      new Corner({ x: 0.5, y: 0.5 }),   // Bottom-Right (2)
      new Corner({ x: -0.5, y: 0.5 })   // Bottom-Left (3)
    ]
  }

  snap(geometry: CursorGeometry): void {
    for (const corner of this.corners) {
      corner.snap(geometry)
    }
    this.targetGeometry = geometry
    this.active = false
  }

  retarget(geometry: CursorGeometry): void {
    const alignedCorners = this.corners.map((corner, index) => ({
      index,
      alignment: corner.directionAlignment(geometry)
    }))
    alignedCorners.sort((a, b) => a.alignment - b.alignment)
    const ranks = [0, 0, 0, 0]
    alignedCorners.forEach((item, rank) => {
      ranks[item.index] = rank
    })

    for (let i = 0; i < 4; i++) {
      this.corners[i].retarget(geometry, ranks[i])
    }

    this.targetGeometry = geometry
    this.active = this.corners.some(
      (c) => c.horizontalAnimation.position !== 0 || c.verticalAnimation.position !== 0
    )
  }

  advance(elapsedSeconds: number): boolean {
    const maxTrailDistance = this.targetGeometry
      ? Math.max(this.targetGeometry.width, this.targetGeometry.height) * MAX_TRAIL_DISTANCE_FACTOR
      : 1000

    let active = false
    for (const corner of this.corners) {
      if (corner.update(elapsedSeconds, maxTrailDistance)) {
        active = true
      }
    }
    this.active = active

    if (!this.active && this.targetGeometry) {
      for (const corner of this.corners) {
        corner.snap(this.targetGeometry)
      }
    }

    return this.active
  }

  reset(): void {
    this.targetGeometry = null
    this.active = false
    for (const corner of this.corners) {
      corner.horizontalAnimation.reset()
      corner.verticalAnimation.reset()
    }
  }
}

const STYLE_ID = 'cm-zed-cursor-styles'

function injectStyles(): void {
  if (typeof document === 'undefined') return
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent = `
    .cm-editor,
    .cm-editor *,
    .cm-content,
    .cm-line {
      caret-color: transparent !important;
    }
    .cm-cursorLayer,
    .cm-cursor,
    .cm-cursor-primary,
    .cm-cursor-secondary,
    .cm-dropCursor {
      display: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
      border: none !important;
      border-left: none !important;
      width: 0 !important;
      height: 0 !important;
      pointer-events: none !important;
    }
    .cm-zed-cursor-svg-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 120;
      overflow: visible;
    }
    .cm-zed-cursor-polygon {
      pointer-events: none;
      transition: opacity 80ms ease;
    }
    .cm-zed-cursor-caret {
      pointer-events: none;
    }
    .cm-zed-cursor-caret.is-blinking {
      animation: cm-zed-caret-blink 1.06s steps(1) infinite;
    }
    @keyframes cm-zed-caret-blink {
      0%, 48% { opacity: 1; }
      50%, 98% { opacity: 0; }
      100% { opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
      .cm-zed-cursor-polygon {
        display: none !important;
      }
    }
  `
}

interface MeasureResult {
  ready: boolean
  hidden: boolean
  isFocused: boolean
  left: number
  top: number
  height: number
  scrolled: boolean
}

class ZedCursorPlugin {
  private view: EditorView
  private svg: SVGSVGElement
  private polygon: SVGPolygonElement
  private caret: SVGRectElement
  private state = new CursorAnimationState()

  private placed = false
  private animating = false
  private rafId = 0
  private lastTime = 0
  private idleTimer = 0

  private lastScrollTop = 0
  private lastScrollLeft = 0

  constructor(view: EditorView) {
    injectStyles()
    this.view = view

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'cm-zed-cursor-svg-layer')

    // Zed cursor polygon trail (clean sky-blue ribbon with subtle boundary definition)
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    polygon.setAttribute('class', 'cm-zed-cursor-polygon')
    polygon.style.fill = 'color-mix(in oklab, var(--accent, #38bdf8) 90%, transparent)'
    polygon.style.stroke = 'var(--accent, #38bdf8)'
    polygon.setAttribute('stroke-width', '0.5')
    polygon.setAttribute('stroke-linejoin', 'round')
    polygon.style.opacity = '0'

    // Static Caret Bar (2.5px width, sky blue, subtle 1.2px rounding)
    const caret = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    caret.setAttribute('class', 'cm-zed-cursor-caret')
    caret.style.fill = 'var(--accent, #38bdf8)'
    caret.setAttribute('rx', '1.2')
    caret.setAttribute('ry', '1.2')
    caret.style.opacity = '0'

    svg.appendChild(polygon)
    svg.appendChild(caret)

    this.svg = svg
    this.polygon = polygon
    this.caret = caret

    view.scrollDOM.appendChild(svg)
    this.scheduleMeasure()
  }

  update(update: ViewUpdate): void {
    if (
      update.docChanged ||
      update.selectionSet ||
      update.focusChanged ||
      update.geometryChanged ||
      update.viewportChanged
    ) {
      this.scheduleMeasure()
    }
  }

  private scheduleMeasure(): void {
    this.view.requestMeasure<MeasureResult>({
      read: (view) => this.readMeasure(view),
      write: (measure) => this.applyMeasure(measure)
    })
  }

  private readMeasure(view: EditorView): MeasureResult {
    const scroller = view.scrollDOM
    const scrolled =
      scroller.scrollTop !== this.lastScrollTop ||
      scroller.scrollLeft !== this.lastScrollLeft
    this.lastScrollTop = scroller.scrollTop
    this.lastScrollLeft = scroller.scrollLeft

    // Track selection.head in real time so the cursor actively glides & trails during text selection
    const selection = view.state.selection.main
    const headPos = selection.head
    const coords =
      view.coordsAtPos(headPos, 1) ||
      view.coordsAtPos(headPos, -1) ||
      view.coordsAtPos(headPos)

    if (!coords) {
      return {
        ready: false,
        hidden: false,
        isFocused: view.hasFocus,
        left: 0,
        top: 0,
        height: 0,
        scrolled
      }
    }

    const scrollerRect = scroller.getBoundingClientRect()
    const textHeight = Math.max(12, coords.bottom - coords.top)
    const lineHeight = Math.max(textHeight, view.defaultLineHeight || 18)
    const top =
      coords.top -
      scrollerRect.top +
      scroller.scrollTop -
      Math.max(0, (lineHeight - textHeight) / 2)
    const left = coords.left - scrollerRect.left + scroller.scrollLeft

    return {
      ready: true,
      hidden: false,
      isFocused: view.hasFocus,
      left,
      top,
      height: lineHeight,
      scrolled
    }
  }

  private applyMeasure(measure: MeasureResult): void {
    if (!measure.ready) {
      requestAnimationFrame(() => this.scheduleMeasure())
      return
    }

    if (measure.hidden || !measure.isFocused) {
      this.caret.style.opacity = '0'
      this.polygon.style.opacity = '0'
      this.stopAnimation()
      return
    }

    this.restartIdleBlink()

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const targetGeometry: CursorGeometry = {
      origin: { x: measure.left, y: measure.top },
      width: 2.5,
      height: measure.height
    }

    // On initial mount, document scroll, or reduced-motion: snap immediately without trail
    if (!this.placed || measure.scrolled || reducedMotion) {
      this.placed = true
      this.state.snap(targetGeometry)
      this.renderAtRest()
      this.stopAnimation()
      return
    }

    // Check jump distance
    const prevCenter = this.state.targetGeometry
      ? geometryCenter(this.state.targetGeometry)
      : { x: measure.left, y: measure.top }
    const newCenter = geometryCenter(targetGeometry)
    const jumpDist = Math.hypot(newCenter.x - prevCenter.x, newCenter.y - prevCenter.y)

    // Ignore identical position
    if (jumpDist <= GEOMETRY_EPSILON) {
      return
    }

    // If jump exceeds screen distance, snap cleanly without screen distortion
    if (jumpDist > 1600) {
      this.state.snap(targetGeometry)
      this.renderAtRest()
      this.stopAnimation()
      return
    }

    // Retarget the 4 corners using Zed's directional alignment and spring physics
    this.state.retarget(targetGeometry)
    this.startAnimation()
  }

  private startAnimation(): void {
    if (this.animating) return
    this.animating = true
    this.lastTime = performance.now()
    this.rafId = requestAnimationFrame((ts) => this.tick(ts))
  }

  private stopAnimation(): void {
    if (!this.animating) return
    this.animating = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
  }

  private tick(timestamp: number): void {
    if (!this.animating) return

    const elapsed = Math.min(
      MAX_FRAME_DURATION,
      Math.max(0.001, (timestamp - this.lastTime) / 1000)
    )
    this.lastTime = timestamp

    const active = this.state.advance(elapsed)

    if (active) {
      const c = this.state.corners
      const pts = `${c[0].currentPosition.x.toFixed(2)},${c[0].currentPosition.y.toFixed(2)} ${c[1].currentPosition.x.toFixed(2)},${c[1].currentPosition.y.toFixed(2)} ${c[2].currentPosition.x.toFixed(2)},${c[2].currentPosition.y.toFixed(2)} ${c[3].currentPosition.x.toFixed(2)},${c[3].currentPosition.y.toFixed(2)}`
      this.polygon.setAttribute('points', pts)
      this.polygon.style.opacity = '1'
      this.caret.style.opacity = '0'

      this.rafId = requestAnimationFrame((ts) => this.tick(ts))
    } else {
      this.renderAtRest()
      this.stopAnimation()
    }
  }

  private renderAtRest(): void {
    this.polygon.style.opacity = '0'
    this.polygon.setAttribute('points', '')

    if (this.state.targetGeometry) {
      const g = this.state.targetGeometry
      this.caret.setAttribute('x', g.origin.x.toFixed(2))
      this.caret.setAttribute('y', g.origin.y.toFixed(2))
      this.caret.setAttribute('width', g.width.toFixed(2))
      this.caret.setAttribute('height', g.height.toFixed(2))
      this.caret.style.opacity = '1'
    }
  }

  private restartIdleBlink(): void {
    this.caret.classList.remove('is-blinking')
    if (this.idleTimer) window.clearTimeout(this.idleTimer)
    this.idleTimer = window.setTimeout(() => {
      this.caret.classList.add('is-blinking')
    }, 600)
  }

  destroy(): void {
    this.stopAnimation()
    if (this.idleTimer) window.clearTimeout(this.idleTimer)
    this.svg.remove()
  }
}

export const smoothCursorExtension: Extension = ViewPlugin.fromClass(ZedCursorPlugin)
