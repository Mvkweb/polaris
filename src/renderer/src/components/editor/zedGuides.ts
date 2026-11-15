import {
  EditorView,
  ViewPlugin,
  ViewUpdate,
  Decoration,
  type DecorationSet,
  WidgetType
} from '@codemirror/view'
import { RangeSetBuilder, type Extension, type Text } from '@codemirror/state'

/**
 * Zed-Style Indentation Guides & Whitespace Dots for CodeMirror 6.
 *
 * Implements:
 * 1. Indentation Guides:
 *    - Vertical 1px guide lines at each indentation level.
 *    - Interpolates blank lines across enclosing blocks so vertical lines never break.
 *    - Real-time active scope detection: highlights the enclosing block's guide line.
 * 2. Whitespace Dots & Tabs:
 *    - Renders leading indentation spaces and multiple spaces as subtle centered dots (·).
 *    - Renders tabs as subtle directional arrows (→).
 *    - Uses non-destructive CSS ::before rendering so text selection and clipboard copying remain 100% clean.
 */

const STYLE_ID = 'cm-zed-guides-styles'

function injectZedGuideStyles(): void {
  if (typeof document === 'undefined') return
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent = `
    .cm-line {
      position: relative;
    }
    .cm-indent-guides {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 0;
      height: 100%;
      pointer-events: none;
      user-select: none;
      z-index: 0;
    }
    .cm-indent-guide {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 1px;
      background-color: rgba(255, 255, 255, 0.08);
      pointer-events: none;
      transition: background-color 150ms ease;
    }
    .cm-indent-guide.cm-indent-guide-active {
      background-color: rgba(255, 255, 255, 0.28);
      box-shadow: 0 0 1px rgba(255, 255, 255, 0.2);
    }
    .cm-whitespace-dot {
      position: relative;
    }
    .cm-whitespace-dot::before {
      content: '·';
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.16);
      font-size: 13px;
      line-height: 1;
      pointer-events: none;
      user-select: none;
    }
    .cm-whitespace-tab {
      position: relative;
    }
    .cm-whitespace-tab::before {
      content: '→';
      position: absolute;
      left: 2px;
      top: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      color: rgba(255, 255, 255, 0.14);
      font-size: 10px;
      line-height: 1;
      pointer-events: none;
      user-select: none;
    }
    .cm-fold-marker {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      color: #64748b;
      cursor: pointer;
      border-radius: 2px;
      transition: color 120ms ease, background-color 120ms ease;
    }
    .cm-fold-marker:hover {
      color: #e2e8f0;
      background-color: rgba(255, 255, 255, 0.08);
    }
  `
}

class IndentGuidesWidget extends WidgetType {
  constructor(
    readonly levels: number,
    readonly activeIndex: number, // 0-based active level, or -1 if none
    readonly stepPx: number
  ) {
    super()
  }

  eq(other: IndentGuidesWidget): boolean {
    return (
      this.levels === other.levels &&
      this.activeIndex === other.activeIndex &&
      Math.abs(this.stepPx - other.stepPx) < 0.2
    )
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement('span')
    wrap.className = 'cm-indent-guides'
    wrap.setAttribute('aria-hidden', 'true')

    for (let i = 0; i < this.levels; i++) {
      const guide = document.createElement('span')
      const isActive = i === this.activeIndex
      guide.className = 'cm-indent-guide' + (isActive ? ' cm-indent-guide-active' : '')
      guide.style.left = `${(i + 1) * this.stepPx}px`
      wrap.appendChild(guide)
    }

    return wrap
  }

  ignoreEvent(): boolean {
    return true
  }
}

/**
 * Returns raw indent column count (spaces = 1, tab = indentUnit)
 */
function getLineIndent(text: string, indentUnit: number): number {
  let count = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    if (ch === 32) {
      count++
    } else if (ch === 9) {
      count += indentUnit
    } else {
      break
    }
  }
  return Math.floor(count / indentUnit)
}

function isBlankLine(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    if (ch !== 32 && ch !== 9) return false
  }
  return true
}

/**
 * Computes effective indent for a line, interpolating blank lines across surrounding code.
 */
function getEffectiveIndent(lineNum: number, doc: Text, indentUnit: number): number {
  const line = doc.line(lineNum)
  if (!isBlankLine(line.text)) {
    return getLineIndent(line.text, indentUnit)
  }

  // Blank line: scan backward and forward
  let prevIndent = 0
  for (let l = lineNum - 1; l >= Math.max(1, lineNum - 40); l--) {
    const prev = doc.line(l)
    if (!isBlankLine(prev.text)) {
      prevIndent = getLineIndent(prev.text, indentUnit)
      break
    }
  }

  let nextIndent = 0
  for (let l = lineNum + 1; l <= Math.min(doc.lines, lineNum + 40); l--) {
    const next = doc.line(l)
    if (!isBlankLine(next.text)) {
      nextIndent = getLineIndent(next.text, indentUnit)
      break
    }
  }

  return Math.min(prevIndent, nextIndent)
}

interface ActiveScope {
  activeLevel: number
  fromLine: number
  toLine: number
}

function computeActiveScope(doc: Text, cursorHead: number, indentUnit: number): ActiveScope {
  const cursorLine = doc.lineAt(cursorHead)
  const cursorIndent = getEffectiveIndent(cursorLine.number, doc, indentUnit)

  if (cursorIndent <= 0) {
    return { activeLevel: 0, fromLine: 0, toLine: 0 }
  }

  let fromLine = cursorLine.number
  while (fromLine > 1) {
    if (getEffectiveIndent(fromLine - 1, doc, indentUnit) < cursorIndent) break
    fromLine--
  }

  let toLine = cursorLine.number
  while (toLine < doc.lines) {
    if (getEffectiveIndent(toLine + 1, doc, indentUnit) < cursorIndent) break
    toLine++
  }

  return { activeLevel: cursorIndent, fromLine, toLine }
}

/**
 * Detects common indentation unit (2 or 4) from the document
 */
function detectIndentUnit(doc: Text): number {
  let count2 = 0
  let count4 = 0
  const maxLines = Math.min(doc.lines, 80)

  for (let l = 1; l <= maxLines; l++) {
    const text = doc.line(l).text
    let spaces = 0
    for (let i = 0; i < text.length && text.charCodeAt(i) === 32; i++) {
      spaces++
    }
    if (spaces > 0) {
      if (spaces % 4 === 0) count4++
      else if (spaces % 2 === 0) count2++
    }
  }

  return count2 > count4 ? 2 : 4
}

const dotMark = Decoration.mark({ class: 'cm-whitespace-dot' })
const tabMark = Decoration.mark({ class: 'cm-whitespace-tab' })

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const doc = view.state.doc
  const indentUnit = detectIndentUnit(doc)
  const charWidth = view.defaultCharacterWidth || 7.8
  const stepPx = indentUnit * charWidth

  const cursorHead = view.state.selection.main.head
  const scope = computeActiveScope(doc, cursorHead, indentUnit)

  for (const { from, to } of view.visibleRanges) {
    const startLine = doc.lineAt(from).number
    const endLine = doc.lineAt(to).number

    for (let l = startLine; l <= endLine; l++) {
      const line = doc.line(l)
      const text = line.text
      const effectiveIndent = getEffectiveIndent(l, doc, indentUnit)

      // 1. Add Indentation Guides Widget
      if (effectiveIndent > 0) {
        const isActive = l >= scope.fromLine && l <= scope.toLine
        const activeIdx = isActive ? scope.activeLevel - 1 : -1
        builder.add(
          line.from,
          line.from,
          Decoration.widget({
            widget: new IndentGuidesWidget(effectiveIndent, activeIdx, stepPx),
            side: -1
          })
        )
      }

      // 2. Add Whitespace Dots on Leading Indentation & Multiple Spaces
      let i = 0
      // Leading whitespace
      while (i < text.length && (text.charCodeAt(i) === 32 || text.charCodeAt(i) === 9)) {
        const pos = line.from + i
        if (text.charCodeAt(i) === 32) {
          builder.add(pos, pos + 1, dotMark)
        } else {
          builder.add(pos, pos + 1, tabMark)
        }
        i++
      }

      // Consecutive multiple spaces or trailing spaces inside code
      while (i < text.length) {
        if (text.charCodeAt(i) === 32) {
          let runStart = i
          while (i < text.length && text.charCodeAt(i) === 32) {
            i++
          }
          const runLen = i - runStart
          const isTrailing = i === text.length
          if (runLen >= 2 || isTrailing) {
            for (let r = runStart; r < i; r++) {
              const p = line.from + r
              builder.add(p, p + 1, dotMark)
            }
          }
        } else if (text.charCodeAt(i) === 9) {
          const p = line.from + i
          builder.add(p, p + 1, tabMark)
          i++
        } else {
          i++
        }
      }
    }
  }

  return builder.finish()
}

class ZedGuidesPlugin {
  decorations: DecorationSet

  constructor(view: EditorView) {
    injectZedGuideStyles()
    this.decorations = buildDecorations(view)
  }

  update(update: ViewUpdate): void {
    if (
      update.docChanged ||
      update.viewportChanged ||
      update.selectionSet ||
      update.geometryChanged
    ) {
      this.decorations = buildDecorations(update.view)
    }
  }
}

export const zedGuidesExtension: Extension = ViewPlugin.fromClass(ZedGuidesPlugin, {
  decorations: (v) => v.decorations
})

/**
 * Clean SVG fold chevrons matching Zed's gutter UI
 */
export function createZedFoldGutterDOM(open: boolean): HTMLElement {
  const span = document.createElement('span')
  span.className = 'cm-fold-marker'
  span.setAttribute('aria-hidden', 'true')
  span.innerHTML = open
    ? `<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 6 8 10 12 6"></polyline></svg>`
    : `<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 4 10 8 6 12"></polyline></svg>`
  return span
}
