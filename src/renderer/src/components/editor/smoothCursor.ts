import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

/**
 * Kitty Terminal-Style Smooth Caret & Cursor Trail for CodeMirror 6.
 *
 * Recreates the iconic Kitty terminal `cursor_trail` effect:
 * 1. Snappy, liquid head caret with spring physics (tau ~20ms) that glides
 *    between characters during typing and navigation with zero perceived latency.
 * 2. Trailing comet smear connecting previous positions to the head while moving.
 * 3. Multi-frame decaying ghost carets trailing behind fast movement.
 * 4. Calibrated snapping on long jumps (>220px or across distant lines) and scrolling.
 * 5. Gentle idle breathing pulse (1.05s) that immediately cancels on any keystroke.
 * 6. Always visible when document is open (never randomly hidden on blur).
 */

const STYLE_ID = 'cm-kitty-cursor-styles'

function injectStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .cm-editor.cm-smooth-active .cm-cursor,
    .cm-editor.cm-smooth-active .cm-dropCursor {
      opacity: 0 !important;
    }
    .cm-kitty-layer {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 150;
    }
    .cm-kitty-head {
      position: absolute;
      top: 0;
      left: 0;
      width: 2.5px;
      border-radius: 1px;
      background: #38bdf8;
      box-shadow:
        0 0 8px rgba(56, 189, 248, 0.75),
        0 0 16px rgba(56, 189, 248, 0.35);
      pointer-events: none;
      will-change: transform, height, opacity;
      transition: opacity 120ms ease;
    }
    .cm-kitty-head.is-idle-blinking {
      animation: cm-kitty-breathe 1.05s ease-in-out infinite;
    }
    .cm-kitty-smear {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      border-radius: 1.5px;
      pointer-events: none;
      will-change: transform, width, opacity;
      opacity: 0;
    }
    .cm-kitty-ghost {
      position: absolute;
      top: 0;
      left: 0;
      width: 2px;
      border-radius: 1px;
      background: #38bdf8;
      pointer-events: none;
      will-change: transform, height, opacity;
      opacity: 0;
    }
    .cm-kitty-ghost-1 {
      box-shadow: 0 0 6px rgba(56, 189, 248, 0.5);
    }
    .cm-kitty-ghost-2 {
      box-shadow: 0 0 4px rgba(56, 189, 248, 0.25);
    }
    @keyframes cm-kitty-breathe {
      0%, 100% { opacity: 1; filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.75)); }
      50% { opacity: 0.35; filter: drop-shadow(0 0 3px rgba(56, 189, 248, 0.3)); }
    }
    @media (prefers-reduced-motion: reduce) {
      .cm-kitty-head { animation: none !important; }
      .cm-kitty-smear, .cm-kitty-ghost { display: none !important; }
    }
  `
  document.head.appendChild(style)
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

class KittyCursorPlugin {
  private view: EditorView
  private layer: HTMLDivElement
  private headEl: HTMLDivElement
  private smearEl: HTMLDivElement
  private ghost1El: HTMLDivElement
  private ghost2El: HTMLDivElement

  // Animation coordinates
  private x = 0
  private y = 0
  private h = 18

  private trailX = 0
  private trailY = 0

  private ghost1X = 0
  private ghost1Y = 0

  private ghost2X = 0
  private ghost2Y = 0

  private targetX = 0
  private targetY = 0
  private targetH = 18

  private placed = false
  private rafId = 0
  private lastTime = 0
  private idleTimer = 0
  private lastScrollTop = 0
  private lastScrollLeft = 0

  constructor(view: EditorView) {
    injectStyles()
    this.view = view

    this.layer = document.createElement('div')
    this.layer.className = 'cm-kitty-layer'

    this.smearEl = document.createElement('div')
    this.smearEl.className = 'cm-kitty-smear'

    this.ghost2El = document.createElement('div')
    this.ghost2El.className = 'cm-kitty-ghost cm-kitty-ghost-2'

    this.ghost1El = document.createElement('div')
    this.ghost1El.className = 'cm-kitty-ghost cm-kitty-ghost-1'

    this.headEl = document.createElement('div')
    this.headEl.className = 'cm-kitty-head'

    this.layer.appendChild(this.smearEl)
    this.layer.appendChild(this.ghost2El)
    this.layer.appendChild(this.ghost1El)
    this.layer.appendChild(this.headEl)

    view.scrollDOM.appendChild(this.layer)
    view.dom.classList.add('cm-smooth-active')

    // Initial measure
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

    const selection = view.state.selection.main
    // Only hide custom caret when user is actively dragging/selecting text
    if (!selection.empty) {
      return {
        ready: true,
        hidden: true,
        isFocused: view.hasFocus,
        left: 0,
        top: 0,
        height: 0,
        scrolled
      }
    }

    const headPos = selection.head
    const coords =
      view.coordsAtPos(headPos, 1) ||
      view.coordsAtPos(headPos, -1) ||
      view.coordsAtPos(headPos)

    if (!coords) {
      // Layout might not be ready yet
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
      // Re-schedule measure on next animation frame
      requestAnimationFrame(() => this.scheduleMeasure())
      return
    }

    if (measure.hidden) {
      this.headEl.style.opacity = '0'
      this.smearEl.style.opacity = '0'
      this.ghost1El.style.opacity = '0'
      this.ghost2El.style.opacity = '0'
      this.stopAnimation()
      return
    }

    const isApple =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const dx = measure.left - this.targetX
    const dy = measure.top - this.targetY
    const lineHeight = Math.max(1, measure.height)

    // A jump occurs on initial mount, window scroll, or long-distance repositioning
    const isJump =
      !this.placed ||
      measure.scrolled ||
      Math.abs(dx) > 240 ||
      Math.abs(dy) / lineHeight > 1.8 ||
      isApple

    this.targetX = measure.left
    this.targetY = measure.top
    this.targetH = measure.height

    // Cursor visibility & idle breathing state
    this.headEl.style.opacity = measure.isFocused ? '1' : '0.65'
    this.restartIdleBlink()

    if (isJump) {
      this.placed = true
      this.x = this.targetX
      this.y = this.targetY
      this.h = this.targetH
      this.trailX = this.x
      this.trailY = this.y
      this.ghost1X = this.x
      this.ghost1Y = this.y
      this.ghost2X = this.x
      this.ghost2Y = this.y
      this.paint()
      this.stopAnimation()
      return
    }

    this.placed = true
    this.startAnimation()
  }

  private restartIdleBlink(): void {
    this.headEl.classList.remove('is-idle-blinking')
    if (this.idleTimer) window.clearTimeout(this.idleTimer)
    this.idleTimer = window.setTimeout(() => {
      this.headEl.classList.add('is-idle-blinking')
    }, 550)
  }

  private startAnimation(): void {
    if (this.rafId) return
    this.lastTime = 0
    this.rafId = requestAnimationFrame(this.renderLoop)
  }

  private stopAnimation(): void {
    if (!this.rafId) return
    cancelAnimationFrame(this.rafId)
    this.rafId = 0
  }

  private renderLoop = (now: number): void => {
    const dt = this.lastTime ? Math.min(48, Math.max(4, now - this.lastTime)) : 16
    this.lastTime = now

    // Physics time constants (ms) - lower is snappier
    // Head caret is critically damped & instant-feeling
    const headKx = 1 - Math.exp(-dt / 18)
    const headKy = 1 - Math.exp(-dt / 22)

    // Trail smear lags behind
    const trailK = 1 - Math.exp(-dt / 55)

    // Ghost after-images
    const ghost1K = 1 - Math.exp(-dt / 38)
    const ghost2K = 1 - Math.exp(-dt / 72)

    this.x += (this.targetX - this.x) * headKx
    this.y += (this.targetY - this.y) * headKy
    this.h += (this.targetH - this.h) * headKy

    this.trailX += (this.x - this.trailX) * trailK
    this.trailY += (this.y - this.trailY) * trailK

    this.ghost1X += (this.x - this.ghost1X) * ghost1K
    this.ghost1Y += (this.y - this.ghost1Y) * ghost1K

    this.ghost2X += (this.ghost1X - this.ghost2X) * ghost2K
    this.ghost2Y += (this.ghost1Y - this.ghost2Y) * ghost2K

    this.paint()

    // Settle criteria
    const settled =
      Math.abs(this.targetX - this.x) < 0.1 &&
      Math.abs(this.targetY - this.y) < 0.1 &&
      Math.abs(this.x - this.trailX) < 0.2 &&
      Math.abs(this.x - this.ghost2X) < 0.2

    if (settled) {
      this.x = this.targetX
      this.y = this.targetY
      this.h = this.targetH
      this.trailX = this.targetX
      this.trailY = this.targetY
      this.ghost1X = this.targetX
      this.ghost1Y = this.targetY
      this.ghost2X = this.targetX
      this.ghost2Y = this.targetY
      this.paint()
      this.rafId = 0
      return
    }

    this.rafId = requestAnimationFrame(this.renderLoop)
  }

  private paint(): void {
    // 1. Position main head caret
    this.headEl.style.transform = `translate3d(${this.x.toFixed(2)}px, ${this.y.toFixed(2)}px, 0)`
    this.headEl.style.height = `${this.h.toFixed(1)}px`

    const dx = this.x - this.trailX
    const dy = this.y - this.trailY
    const dist = Math.hypot(dx, dy)

    // 2. Kitty Trail Smear (connects trailX to x when moving horizontally)
    if (dist > 1.2 && Math.abs(dy) < 4) {
      const minX = Math.min(this.x, this.trailX)
      const maxX = Math.max(this.x, this.trailX)
      const width = maxX - minX + 2.5
      const movingRight = dx > 0

      this.smearEl.style.transform = `translate3d(${minX.toFixed(2)}px, ${this.y.toFixed(2)}px, 0)`
      this.smearEl.style.width = `${width.toFixed(2)}px`
      this.smearEl.style.height = `${this.h.toFixed(1)}px`
      this.smearEl.style.background = movingRight
        ? 'linear-gradient(to right, rgba(56, 189, 248, 0.04), rgba(56, 189, 248, 0.45))'
        : 'linear-gradient(to left, rgba(56, 189, 248, 0.04), rgba(56, 189, 248, 0.45))'
      this.smearEl.style.opacity = Math.min(0.75, dist / 14).toFixed(2)
    } else {
      this.smearEl.style.opacity = '0'
    }

    // 3. Kitty Ghost 1 after-image
    const g1Dist = Math.hypot(this.x - this.ghost1X, this.y - this.ghost1Y)
    if (g1Dist > 2) {
      this.ghost1El.style.transform = `translate3d(${this.ghost1X.toFixed(2)}px, ${this.ghost1Y.toFixed(2)}px, 0)`
      this.ghost1El.style.height = `${this.h.toFixed(1)}px`
      this.ghost1El.style.opacity = Math.min(0.48, g1Dist / 20).toFixed(2)
    } else {
      this.ghost1El.style.opacity = '0'
    }

    // 4. Kitty Ghost 2 after-image
    const g2Dist = Math.hypot(this.x - this.ghost2X, this.y - this.ghost2Y)
    if (g2Dist > 3.5) {
      this.ghost2El.style.transform = `translate3d(${this.ghost2X.toFixed(2)}px, ${this.ghost2Y.toFixed(2)}px, 0)`
      this.ghost2El.style.height = `${this.h.toFixed(1)}px`
      this.ghost2El.style.opacity = Math.min(0.24, g2Dist / 28).toFixed(2)
    } else {
      this.ghost2El.style.opacity = '0'
    }
  }

  destroy(): void {
    this.stopAnimation()
    if (this.idleTimer) window.clearTimeout(this.idleTimer)
    this.view.dom.classList.remove('cm-smooth-active')
    this.layer.remove()
  }
}

export const smoothCursorExtension: Extension = ViewPlugin.fromClass(KittyCursorPlugin)
