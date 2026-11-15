import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

/**
 * Smooth caret for CodeMirror 6.
 *
 * Modelled on kitty's `cursor_trail`: the caret glides between positions with
 * an exponential spring instead of teleporting, and a soft ghost trails behind
 * it, decaying as it catches up. Long jumps (line changes, scrolling, clicks
 * across the viewport) snap instantly so the eye never loses the cursor.
 *
 * Layout reads are deferred through `view.requestMeasure`, because CodeMirror
 * forbids `coordsAtPos` during an update cycle.
 */

const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Time constants, in ms. Smaller is snappier. */
const CARET_TAU_X = 20
const CARET_TAU_Y = 24
const TRAIL_TAU = 64
/** Beyond these a move is a jump, not a glide. */
const MAX_GLIDE_X = 240
const MAX_GLIDE_LINES = 1.6
/** Idle time before the caret starts its soft breathing blink. */
const IDLE_BLINK_DELAY = 640

interface Measure {
  hidden: boolean
  left: number
  top: number
  height: number
  scrolled: boolean
}

const STYLE_ID = 'cm-smooth-cursor-styles'

function injectStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .cm-editor.cm-smooth-active .cm-cursor,
    .cm-editor.cm-smooth-active .cm-dropCursor {
      opacity: 0 !important;
    }
    .cm-smooth-caret,
    .cm-smooth-trail {
      position: absolute;
      left: 0;
      top: 0;
      width: 2px;
      pointer-events: none;
      will-change: transform, height, opacity;
      opacity: 0;
    }
    .cm-smooth-caret { z-index: 120; }
    .cm-smooth-trail { z-index: 119; }
    .cm-smooth-caret-bar,
    .cm-smooth-trail-bar {
      width: 100%;
      height: 100%;
      border-radius: 1px;
      background: #38bdf8;
    }
    .cm-smooth-caret-bar {
      box-shadow:
        0 0 8px rgba(56, 189, 248, 0.55),
        0 0 18px rgba(56, 189, 248, 0.18);
    }
    .cm-smooth-trail-bar {
      opacity: 0.22;
      filter: blur(2.5px);
    }
    .cm-smooth-caret.is-blinking .cm-smooth-caret-bar {
      animation: cm-smooth-breathe 1.08s ease-in-out infinite;
    }
    @keyframes cm-smooth-breathe {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.22; }
    }
    @media (prefers-reduced-motion: reduce) {
      .cm-smooth-caret-bar { animation: none !important; }
    }
  `
  document.head.appendChild(style)
}

class SmoothCursorPlugin {
  private caret: HTMLDivElement
  private trail: HTMLDivElement
  private view: EditorView

  private x = 0
  private y = 0
  private h = 16
  private trailX = 0
  private trailY = 0
  private targetX = 0
  private targetY = 0
  private targetH = 16

  private placed = false
  private visible = false
  private raf = 0
  private lastFrame = 0
  private blinkTimer = 0

  constructor(view: EditorView) {
    injectStyles()
    this.view = view

    this.trail = document.createElement('div')
    this.trail.className = 'cm-smooth-trail'
    this.trail.innerHTML = '<div class="cm-smooth-trail-bar"></div>'

    this.caret = document.createElement('div')
    this.caret.className = 'cm-smooth-caret'
    this.caret.innerHTML = '<div class="cm-smooth-caret-bar"></div>'

    view.scrollDOM.appendChild(this.trail)
    view.scrollDOM.appendChild(this.caret)
    view.dom.classList.add('cm-smooth-active')

    // No layout reads here: CodeMirror is mid-construction. requestMeasure
    // queues the first read for after the initial layout pass.
    this.schedule()
  }

  update(update: ViewUpdate): void {
    if (
      update.selectionSet ||
      update.docChanged ||
      update.focusChanged ||
      update.geometryChanged ||
      update.viewportChanged
    ) {
      this.schedule()
    }
  }

  private schedule(): void {
    this.view.requestMeasure<Measure>({
      read: (view) => this.read(view),
      write: (measure) => this.write(measure)
    })
  }

  private lastScrollTop = 0

  private read(view: EditorView): Measure {
    const scrolled = view.scrollDOM.scrollTop !== this.lastScrollTop
    this.lastScrollTop = view.scrollDOM.scrollTop

    const selection = view.state.selection.main
    if (!view.hasFocus || !selection.empty) {
      return { hidden: true, left: 0, top: 0, height: 0, scrolled }
    }

    const coords = view.coordsAtPos(selection.head)
    if (!coords) return { hidden: true, left: 0, top: 0, height: 0, scrolled }

    const base = view.scrollDOM.getBoundingClientRect()
    const textHeight = Math.max(10, coords.bottom - coords.top)
    // A caret that only spans the glyphs looks stubby next to 1.65 line-height;
    // stretch it to the full line box and centre it on the text.
    const height = Math.max(textHeight, view.defaultLineHeight)
    const top =
      coords.top - base.top + view.scrollDOM.scrollTop - Math.max(0, (height - textHeight) / 2)

    return {
      hidden: false,
      left: coords.left - base.left + view.scrollDOM.scrollLeft,
      top,
      height,
      scrolled
    }
  }

  private write(measure: Measure): void {
    if (measure.hidden) {
      this.hide()
      return
    }

    const dx = measure.left - this.targetX
    const dy = measure.top - this.targetY
    const lineHeight = Math.max(1, measure.height)
    const jump =
      !this.placed ||
      measure.scrolled ||
      Math.abs(dx) > MAX_GLIDE_X ||
      Math.abs(dy) / lineHeight > MAX_GLIDE_LINES

    this.targetX = measure.left
    this.targetY = measure.top
    this.targetH = measure.height

    this.show()
    this.restartBlink()

    if (jump || REDUCED_MOTION) {
      this.x = this.targetX
      this.y = this.targetY
      this.h = this.targetH
      this.trailX = this.x
      this.trailY = this.y
      this.paint()
      this.stop()
      return
    }

    this.start()
  }

  private show(): void {
    if (this.visible) return
    this.visible = true
    this.caret.style.opacity = '1'
    this.trail.style.opacity = '1'
  }

  private hide(): void {
    if (!this.visible) return
    this.visible = false
    this.placed = false
    this.caret.style.opacity = '0'
    this.trail.style.opacity = '0'
    this.caret.classList.remove('is-blinking')
    this.stop()
    if (this.blinkTimer) {
      window.clearTimeout(this.blinkTimer)
      this.blinkTimer = 0
    }
  }

  private restartBlink(): void {
    this.caret.classList.remove('is-blinking')
    if (this.blinkTimer) window.clearTimeout(this.blinkTimer)
    this.blinkTimer = window.setTimeout(() => {
      if (this.visible) this.caret.classList.add('is-blinking')
    }, IDLE_BLINK_DELAY)
  }

  private start(): void {
    if (this.raf) return
    this.lastFrame = 0
    this.raf = requestAnimationFrame(this.tick)
  }

  private stop(): void {
    if (!this.raf) return
    cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  private tick = (now: number): void => {
    const dt = this.lastFrame ? Math.min(48, now - this.lastFrame) : 16
    this.lastFrame = now

    const kx = 1 - Math.exp(-dt / CARET_TAU_X)
    const ky = 1 - Math.exp(-dt / CARET_TAU_Y)
    const kt = 1 - Math.exp(-dt / TRAIL_TAU)

    this.x += (this.targetX - this.x) * kx
    this.y += (this.targetY - this.y) * ky
    this.h += (this.targetH - this.h) * ky
    this.trailX += (this.x - this.trailX) * kt
    this.trailY += (this.y - this.trailY) * kt

    this.paint()

    const settled =
      Math.abs(this.targetX - this.x) < 0.08 &&
      Math.abs(this.targetY - this.y) < 0.08 &&
      Math.abs(this.targetH - this.h) < 0.08

    if (settled) {
      this.x = this.targetX
      this.y = this.targetY
      this.h = this.targetH
      this.paint()
      this.raf = 0
      return
    }

    this.raf = requestAnimationFrame(this.tick)
  }

  private paint(): void {
    const left = this.x - 1
    this.caret.style.transform = `translate3d(${left}px, ${this.y}px, 0)`
    this.caret.style.height = `${this.h}px`

    // The ghost lags a touch and only shows when it has actually drifted away.
    const dx = Math.abs(this.x - this.trailX)
    const dy = Math.abs(this.y - this.trailY)
    const drift = Math.min(1, (dx + dy) / 26)
    this.trail.style.transform = `translate3d(${this.trailX - 1}px, ${this.trailY}px, 0)`
    this.trail.style.height = `${this.h}px`
    this.trail.style.opacity = this.visible ? String(0.55 * drift) : '0'
  }

  destroy(): void {
    this.stop()
    if (this.blinkTimer) window.clearTimeout(this.blinkTimer)
    this.view.dom.classList.remove('cm-smooth-active')
    this.caret.remove()
    this.trail.remove()
  }
}

export const smoothCursorExtension: Extension = ViewPlugin.fromClass(SmoothCursorPlugin)
