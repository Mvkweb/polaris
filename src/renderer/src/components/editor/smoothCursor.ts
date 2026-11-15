import { ViewPlugin, type ViewUpdate, EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

/**
 * Smooth Caret Animation for CodeMirror 6
 * Renders an animated floating cursor that glides smoothly across characters
 * with GPU-accelerated translate3d, spring-like easing, and idle breathing.
 */
class SmoothCursorPlugin {
  private cursorEl: HTMLDivElement
  private lastPos: { left: number; top: number; height: number } | null = null
  private blinkTimer: number | null = null

  constructor(view: EditorView) {
    this.cursorEl = document.createElement('div')
    this.cursorEl.className = 'cm-smooth-cursor'
    this.cursorEl.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 2px;
      background: #38bdf8;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.55);
      border-radius: 1px;
      pointer-events: none;
      z-index: 100;
      opacity: 0;
      will-change: transform, height, opacity;
    `
    view.scrollDOM.appendChild(this.cursorEl)
    this.updateCursor(view, false)
  }

  update(update: ViewUpdate): void {
    if (
      update.selectionSet ||
      update.docChanged ||
      update.geometryChanged ||
      update.viewportChanged
    ) {
      this.updateCursor(update.view, true)
    }
  }

  private updateCursor(view: EditorView, animate: boolean): void {
    // Only display smooth caret if editor is focused and has a valid selection
    if (!view.hasFocus) {
      this.cursorEl.style.opacity = '0'
      return
    }

    const selection = view.state.selection.main
    // When multiple characters are actively selected, let native selection styling shine
    if (!selection.empty) {
      this.cursorEl.style.opacity = '0'
      return
    }

    const head = selection.head
    const coords = view.coordsAtPos(head)
    if (!coords) {
      this.cursorEl.style.opacity = '0'
      return
    }

    const scrollRect = view.scrollDOM.getBoundingClientRect()
    const left = coords.left - scrollRect.left + view.scrollDOM.scrollLeft
    const top = coords.top - scrollRect.top + view.scrollDOM.scrollTop
    const height = Math.max(14, coords.bottom - coords.top)

    // Calculate distance traveled to avoid animating long-distance jumps / scrolls
    const dist = this.lastPos
      ? Math.hypot(left - this.lastPos.left, top - this.lastPos.top)
      : 0
    const shouldAnimate =
      animate && this.lastPos !== null && dist > 0 && dist < 240

    if (shouldAnimate) {
      this.cursorEl.style.transition =
        'transform 75ms cubic-bezier(0.16, 1, 0.3, 1), height 75ms ease-out, opacity 100ms ease'
    } else {
      this.cursorEl.style.transition = 'opacity 100ms ease'
    }

    this.cursorEl.style.transform = `translate3d(${left}px, ${top}px, 0)`
    this.cursorEl.style.height = `${height}px`
    this.cursorEl.style.opacity = '1'

    this.lastPos = { left, top, height }
    this.resetBlink()
  }

  private resetBlink(): void {
    this.cursorEl.style.animation = 'none'
    if (this.blinkTimer) window.clearTimeout(this.blinkTimer)

    // After 450ms of idle typing, resume soft breathing pulse
    this.blinkTimer = window.setTimeout(() => {
      this.cursorEl.style.animation = 'cm-smooth-blink 1.05s ease-in-out infinite'
    }, 450)
  }

  destroy(): void {
    if (this.blinkTimer) window.clearTimeout(this.blinkTimer)
    this.cursorEl.remove()
  }
}

// Global CSS animation definition for the soft pulse
if (typeof document !== 'undefined') {
  const styleId = 'cm-smooth-cursor-styles'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes cm-smooth-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
    `
    document.head.appendChild(style)
  }
}

export const smoothCursorExtension: Extension = ViewPlugin.fromClass(SmoothCursorPlugin, {
  eventHandlers: {
    focus(_e, view) {
      const plugin = view.plugin(smoothCursorExtension as any)
      if (plugin) {
        ;(plugin as any).updateCursor(view, false)
      }
    },
    blur(_e, view) {
      const plugin = view.plugin(smoothCursorExtension as any)
      if (plugin) {
        ;(plugin as any).cursorEl.style.opacity = '0'
      }
    }
  }
})
