import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

/**
 * 240Hz GPU-Composited Smooth Caret & Motion Trail for CodeMirror 6.
 *
 * Designed with strict adherence to design engineering principles:
 * - Offloads coordinate transitions directly to Chromium's GPU compositor
 *   thread (runs at native display V-sync: 120Hz, 144Hz, 240Hz+).
 * - Zero JS frame-step stutter: silky-smooth interruptible hardware curves.
 * - Crisp, razor-sharp 2px solid caret bar (ZERO blurry neon glow, ZERO box-shadow halos).
 * - Subtle, elegant trailing ghost that smoothly lags during typing and collapses at rest.
 * - Calibrated instant snapping on line jumps (>1.5 lines), scroll, and initial mount.
 * - Classic discrete blinking when idle (>550ms), solid and steady while typing.
 */

const STYLE_ID = 'cm-hardware-cursor-styles'

function injectStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .cm-editor.cm-smooth-active .cm-cursor,
    .cm-editor.cm-smooth-active .cm-dropCursor {
      opacity: 0 !important;
    }
    .cm-hw-cursor-layer {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 150;
    }
    .cm-hw-caret {
      position: absolute;
      top: 0;
      left: 0;
      width: 2px;
      border-radius: 1px;
      background: #38bdf8;
      pointer-events: none;
      will-change: transform, height, opacity;
      transform: translate3d(0, 0, 0);
      transition: transform 65ms cubic-bezier(0.16, 1, 0.3, 1), height 75ms ease-out;
    }
    .cm-hw-caret.is-blinking {
      animation: cm-hw-blink 1.06s steps(1) infinite;
    }
    .cm-hw-trail {
      position: absolute;
      top: 0;
      left: 0;
      width: 2px;
      border-radius: 1px;
      background: rgba(56, 189, 248, 0.32);
      pointer-events: none;
      will-change: transform, height, opacity;
      transform: translate3d(0, 0, 0);
      transition: transform 125ms cubic-bezier(0.16, 1, 0.3, 1), height 75ms ease-out, opacity 140ms ease;
      opacity: 0;
    }
    @keyframes cm-hw-blink {
      0%, 48% { opacity: 1; }
      50%, 98% { opacity: 0; }
      100% { opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
      .cm-hw-caret,
      .cm-hw-trail {
        transition: none !important;
        animation: none !important;
      }
      .cm-hw-trail {
        display: none !important;
      }
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

class HardwareSmoothCursorPlugin {
  private view: EditorView
  private layer: HTMLDivElement
  private caretEl: HTMLDivElement
  private trailEl: HTMLDivElement

  private targetX = 0
  private targetY = 0
  private targetH = 18

  private placed = false
  private idleTimer = 0
  private lastScrollTop = 0
  private lastScrollLeft = 0

  constructor(view: EditorView) {
    injectStyles()
    this.view = view

    this.layer = document.createElement('div')
    this.layer.className = 'cm-hw-cursor-layer'

    this.trailEl = document.createElement('div')
    this.trailEl.className = 'cm-hw-trail'

    this.caretEl = document.createElement('div')
    this.caretEl.className = 'cm-hw-caret'

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
      return
    }

    const dx = measure.left - this.targetX
    const dy = measure.top - this.targetY
    const lineHeight = Math.max(1, measure.height)

    // Snap without transition on first placement, window scroll, or long-distance jump
    const isJump =
      !this.placed ||
      measure.scrolled ||
      Math.abs(dx) > 240 ||
      Math.abs(dy) / lineHeight > 1.6

    this.targetX = measure.left
    this.targetY = measure.top
    this.targetH = measure.height

    this.caretEl.style.opacity = measure.isFocused ? '1' : '0.6'
    this.restartIdleBlink()

    if (isJump) {
      this.placed = true
      // Disable transition for instantaneous snap
      this.caretEl.style.transition = 'none'
      this.trailEl.style.transition = 'none'
      this.trailEl.style.opacity = '0'

      this.caretEl.style.transform = `translate3d(${this.targetX.toFixed(2)}px, ${this.targetY.toFixed(2)}px, 0)`
      this.caretEl.style.height = `${this.targetH.toFixed(1)}px`
      this.trailEl.style.transform = `translate3d(${this.targetX.toFixed(2)}px, ${this.targetY.toFixed(2)}px, 0)`
      this.trailEl.style.height = `${this.targetH.toFixed(1)}px`

      // Restore GPU transitions on next animation frame
      requestAnimationFrame(() => {
        this.caretEl.style.transition = ''
        this.trailEl.style.transition = ''
      })
      return
    }

    this.placed = true

    // Show trailing ghost during active motion
    this.trailEl.style.opacity = '0.5'

    // GPU compositor smoothly animates both transform and height at native display refresh rate
    this.caretEl.style.transform = `translate3d(${this.targetX.toFixed(2)}px, ${this.targetY.toFixed(2)}px, 0)`
    this.caretEl.style.height = `${this.targetH.toFixed(1)}px`
    this.trailEl.style.transform = `translate3d(${this.targetX.toFixed(2)}px, ${this.targetY.toFixed(2)}px, 0)`
    this.trailEl.style.height = `${this.targetH.toFixed(1)}px`

    // Fade trail ghost back to 0 once motion settles
    window.setTimeout(() => {
      this.trailEl.style.opacity = '0'
    }, 130)
  }

  private restartIdleBlink(): void {
    this.caretEl.classList.remove('is-blinking')
    if (this.idleTimer) window.clearTimeout(this.idleTimer)
    this.idleTimer = window.setTimeout(() => {
      this.caretEl.classList.add('is-blinking')
    }, 550)
  }

  destroy(): void {
    if (this.idleTimer) window.clearTimeout(this.idleTimer)
    this.view.dom.classList.remove('cm-smooth-active')
    this.layer.remove()
  }
}

export const smoothCursorExtension: Extension = ViewPlugin.fromClass(HardwareSmoothCursorPlugin)
