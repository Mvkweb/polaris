import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

/**
 * Clean, High-Craft Smooth Caret & Motion Trail for CodeMirror 6.
 *
 * Designed with strict adherence to design engineering principles:
 * - Crisp, razor-sharp 2px solid caret bar (ZERO blurry neon glow, ZERO box-shadow halos).
 * - Smooth, critically damped spring interpolation (tau ~18ms) for instantaneous,
 *   butter-smooth typing and arrow navigation.
 * - Minimal, elegant trailing stretch during rapid motion that collapses cleanly at rest.
 * - Classic clean blinking when idle (>550ms), solid and steady while typing.
 * - Rock-solid visibility: reliably measured and rendered across all states.
 */

const STYLE_ID = 'cm-clean-cursor-styles'

function injectStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .cm-editor.cm-smooth-active .cm-cursor,
    .cm-editor.cm-smooth-active .cm-dropCursor {
      opacity: 0 !important;
    }
    .cm-clean-cursor-layer {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 150;
    }
    .cm-clean-caret {
      position: absolute;
      top: 0;
      left: 0;
      width: 2px;
      border-radius: 1px;
      background: #38bdf8;
      pointer-events: none;
      will-change: transform, height, opacity;
      transition: opacity 80ms ease;
    }
    .cm-clean-caret.is-blinking {
      animation: cm-clean-blink 1.06s steps(1) infinite;
    }
    .cm-clean-trail {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      border-radius: 1px;
      background: rgba(56, 189, 248, 0.22);
      pointer-events: none;
      will-change: transform, width, opacity;
      opacity: 0;
      transition: opacity 120ms ease;
    }
    @keyframes cm-clean-blink {
      0%, 48% { opacity: 1; }
      50%, 98% { opacity: 0; }
      100% { opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
      .cm-clean-trail { display: none !important; }
      .cm-clean-caret { animation: none !important; }
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

class CleanSmoothCursorPlugin {
  private view: EditorView
  private layer: HTMLDivElement
  private caretEl: HTMLDivElement
  private trailEl: HTMLDivElement

  // Animation coordinates
  private x = 0
  private y = 0
  private h = 18

  private trailX = 0
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
    this.layer.className = 'cm-clean-cursor-layer'

    this.trailEl = document.createElement('div')
    this.trailEl.className = 'cm-clean-trail'

    this.caretEl = document.createElement('div')
    this.caretEl.className = 'cm-clean-caret'

    this.layer.appendChild(this.trailEl)
    this.layer.appendChild(this.caretEl)

    view.scrollDOM.appendChild(this.layer)
    view.dom.classList.add('cm-smooth-active')

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

    if (measure.hidden) {
      this.caretEl.style.opacity = '0'
      this.trailEl.style.opacity = '0'
      this.stopAnimation()
      return
    }

    const isApple =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const dx = measure.left - this.targetX
    const dy = measure.top - this.targetY
    const lineHeight = Math.max(1, measure.height)

    // Snap on first placement, window scroll, or long-distance line jump
    const isJump =
      !this.placed ||
      measure.scrolled ||
      Math.abs(dx) > 260 ||
      Math.abs(dy) / lineHeight > 1.8 ||
      isApple

    this.targetX = measure.left
    this.targetY = measure.top
    this.targetH = measure.height

    this.caretEl.style.opacity = measure.isFocused ? '1' : '0.6'
    this.restartIdleBlink()

    if (isJump) {
      this.placed = true
      this.x = this.targetX
      this.y = this.targetY
      this.h = this.targetH
      this.trailX = this.x
      this.paint()
      this.stopAnimation()
      return
    }

    this.placed = true
    this.startAnimation()
  }

  private restartIdleBlink(): void {
    this.caretEl.classList.remove('is-blinking')
    if (this.idleTimer) window.clearTimeout(this.idleTimer)
    this.idleTimer = window.setTimeout(() => {
      this.caretEl.classList.add('is-blinking')
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

    // Physics time constants:
    // Snappy, critically damped glide for the caret
    const headKx = 1 - Math.exp(-dt / 18)
    const headKy = 1 - Math.exp(-dt / 20)

    // Smooth subtle trailing edge
    const trailK = 1 - Math.exp(-dt / 42)

    this.x += (this.targetX - this.x) * headKx
    this.y += (this.targetY - this.y) * headKy
    this.h += (this.targetH - this.h) * headKy
    this.trailX += (this.x - this.trailX) * trailK

    this.paint()

    const settled =
      Math.abs(this.targetX - this.x) < 0.1 &&
      Math.abs(this.targetY - this.y) < 0.1 &&
      Math.abs(this.x - this.trailX) < 0.2

    if (settled) {
      this.x = this.targetX
      this.y = this.targetY
      this.h = this.targetH
      this.trailX = this.targetX
      this.paint()
      this.rafId = 0
      return
    }

    this.rafId = requestAnimationFrame(this.renderLoop)
  }

  private paint(): void {
    // 1. Crisp 2px solid caret bar
    this.caretEl.style.transform = `translate3d(${this.x.toFixed(2)}px, ${this.y.toFixed(2)}px, 0)`
    this.caretEl.style.height = `${this.h.toFixed(1)}px`

    // 2. Clean trailing stretch (only when moving across a line)
    const dx = this.x - this.trailX
    const dist = Math.abs(dx)

    if (dist > 1.5) {
      const minX = Math.min(this.x, this.trailX)
      const maxX = Math.max(this.x, this.trailX)
      const width = maxX - minX + 2

      this.trailEl.style.transform = `translate3d(${minX.toFixed(2)}px, ${this.y.toFixed(2)}px, 0)`
      this.trailEl.style.width = `${width.toFixed(2)}px`
      this.trailEl.style.height = `${this.h.toFixed(1)}px`
      this.trailEl.style.opacity = Math.min(0.5, dist / 16).toFixed(2)
    } else {
      this.trailEl.style.opacity = '0'
    }
  }

  destroy(): void {
    this.stopAnimation()
    if (this.idleTimer) window.clearTimeout(this.idleTimer)
    this.view.dom.classList.remove('cm-smooth-active')
    this.layer.remove()
  }
}

export const smoothCursorExtension: Extension = ViewPlugin.fromClass(CleanSmoothCursorPlugin)
