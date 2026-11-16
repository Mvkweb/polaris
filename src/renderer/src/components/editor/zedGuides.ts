import {
  EditorView,
  ViewPlugin,
  ViewUpdate,
  Decoration,
  type DecorationSet,
  WidgetType
} from '@codemirror/view'
import { type Extension, type Range, type Text } from '@codemirror/state'

/**
 * Authentic Zed Indentation Guides & Whitespace Behavior for CodeMirror 6.
 *
 * Matches Zed 1:1:
 * 1. Indentation Guides:
 *    - Clean, subtle vertical 1px lines at each parent block's indentation level.
 *    - Continuous across blank lines without interruptions.
 *    - Active scope highlighting: when cursor is inside a block, its guide line glows brighter.
 * 2. Whitespace Dots & Tabs ("show_whitespaces: selection"):
 *    - By default, unselected code has ZERO dots (clean and uncluttered, matching Zed).
 *    - When text IS selected, spaces inside the selection display subtle centered dots (·).
 *    - Tabs display subtle directional arrows (→).
 *    - Trailing whitespace at end of lines is subtly marked.
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
      padding-left: 6px !important;
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
      background-color: color-mix(in oklab, var(--accent, #38bdf8) 55%, transparent);
      box-shadow: 0 0 1px color-mix(in oklab, var(--accent, #38bdf8) 45%, transparent);
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
      color: rgba(255, 255, 255, 0.22);
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
      color: rgba(255, 255, 255, 0.20);
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
    readonly guideColumns: number[],
    readonly activeCol: number, // column index of active guide, or -1 if none
    readonly charWidth: number
  ) {
    super()
  }

  eq(other: IndentGuidesWidget): boolean {
    if (this.guideColumns.length !== other.guideColumns.length) return false
    if (this.activeCol !== other.activeCol) return false
    if (Math.abs(this.charWidth - other.charWidth) >= 0.1) return false
    for (let i = 0; i < this.guideColumns.length; i++) {
      if (this.guideColumns[i] !== other.guideColumns[i]) return false
    }
    return true
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement('span')
    wrap.className = 'cm-indent-guides'
    wrap.setAttribute('aria-hidden', 'true')

    const padLeft = 6 // Matches .cm-line padding-left
    for (const col of this.guideColumns) {
      const guide = document.createElement('span')
      const isActive = col === this.activeCol
      guide.className = 'cm-indent-guide' + (isActive ? ' cm-indent-guide-active' : '')
      guide.style.left = `${padLeft + col * this.charWidth}px`
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
function countLeadingSpaces(text: string, indentUnit: number): number {
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
  return count
}

function isBlankLine(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    if (ch !== 32 && ch !== 9) return false
  }
  return true
}

/**
 * Computes effective indent spaces for a line, interpolating blank lines.
 */
function getEffectiveIndentSpaces(lineNum: number, doc: Text, indentUnit: number): number {
  const line = doc.line(lineNum)
  if (!isBlankLine(line.text)) {
    return countLeadingSpaces(line.text, indentUnit)
  }

  // Blank line: scan backward and forward
  let prevSpaces = 0
  for (let l = lineNum - 1; l >= Math.max(1, lineNum - 40); l--) {
    const prev = doc.line(l)
    if (!isBlankLine(prev.text)) {
      prevSpaces = countLeadingSpaces(prev.text, indentUnit)
      break
    }
  }

  let nextSpaces = 0
  for (let l = lineNum + 1; l <= Math.min(doc.lines, lineNum + 40); l++) {
    const next = doc.line(l)
    if (!isBlankLine(next.text)) {
      nextSpaces = countLeadingSpaces(next.text, indentUnit)
      break
    }
  }

  return Math.min(prevSpaces, nextSpaces)
}

interface ActiveScope {
  activeCol: number
  fromLine: number
  toLine: number
}

function computeActiveScope(doc: Text, cursorHead: number, indentUnit: number): ActiveScope {
  const cursorLine = doc.lineAt(cursorHead)
  const cursorSpaces = getEffectiveIndentSpaces(cursorLine.number, doc, indentUnit)
  const cursorLevel = Math.floor(cursorSpaces / indentUnit)

  if (cursorLevel <= 0) {
    return { activeCol: -1, fromLine: 0, toLine: 0 }
  }

  // Active guide column is the enclosing parent's indent column
  const activeCol = (cursorLevel - 1) * indentUnit
  if (activeCol <= 0) {
    return { activeCol: -1, fromLine: 0, toLine: 0 }
  }

  let fromLine = cursorLine.number
  while (fromLine > 1) {
    const sp = getEffectiveIndentSpaces(fromLine - 1, doc, indentUnit)
    if (Math.floor(sp / indentUnit) < cursorLevel) break
    fromLine--
  }

  let toLine = cursorLine.number
  while (toLine < doc.lines) {
    const sp = getEffectiveIndentSpaces(toLine + 1, doc, indentUnit)
    if (Math.floor(sp / indentUnit) < cursorLevel) break
    toLine++
  }

  return { activeCol, fromLine, toLine }
}

/**
 * Detects common indentation unit (2 or 4) from the document
 */
function detectIndentUnit(doc: Text): number {
  const maxLines = Math.min(doc.lines, 120)
  for (let l = 1; l <= maxLines; l++) {
    const text = doc.line(l).text
    let spaces = 0
    for (let i = 0; i < text.length && text.charCodeAt(i) === 32; i++) {
      spaces++
    }
    // If any line has 2, 6, or 10 spaces, the file is 2-space indented
    if (spaces === 2 || spaces === 6 || spaces === 10) {
      return 2
    }
  }
  return 4
}

const dotMark = Decoration.mark({ class: 'cm-whitespace-dot' })
const tabMark = Decoration.mark({ class: 'cm-whitespace-tab' })

function buildDecorations(view: EditorView): DecorationSet {
  // Collected unsorted (guides, then selection dots, then trailing dots) and
  // sorted once by Decoration.set — a RangeSetBuilder throws on out-of-order
  // adds, which killed the whole plugin as soon as anything was selected.
  const ranges: Range<Decoration>[] = []
  const doc = view.state.doc
  const indentUnit = detectIndentUnit(doc)
  const charWidth = view.defaultCharacterWidth || 7.82

  const cursorHead = view.state.selection.main.head
  const scope = computeActiveScope(doc, cursorHead, indentUnit)

  // 1. Indentation Guides on Visible Lines
  for (const { from, to } of view.visibleRanges) {
    const startLine = doc.lineAt(from).number
    const endLine = doc.lineAt(to).number

    for (let l = startLine; l <= endLine; l++) {
      const line = doc.line(l)
      const effectiveSpaces = getEffectiveIndentSpaces(l, doc, indentUnit)
      const level = Math.floor(effectiveSpaces / indentUnit)

      // A line indented to level >= 2 has parent guide lines at level 1, 2, ..., level - 1
      if (level >= 2) {
        const guideCols: number[] = []
        for (let k = 1; k < level; k++) {
          guideCols.push(k * indentUnit)
        }

        const isActive = l >= scope.fromLine && l <= scope.toLine
        const activeCol = isActive ? scope.activeCol : -1

        ranges.push(
          Decoration.widget({
            widget: new IndentGuidesWidget(guideCols, activeCol, charWidth),
            side: -1
          }).range(line.from)
        )
      }
    }
  }

  // 2. Whitespace Dots: Only in Selection (Zed default: show_whitespaces = "selection")
  // and trailing whitespace
  for (const range of view.state.selection.ranges) {
    if (range.empty) continue
    const selFrom = Math.max(range.from, view.viewport.from)
    const selTo = Math.min(range.to, view.viewport.to)
    if (selFrom >= selTo) continue

    const slice = doc.sliceString(selFrom, selTo)
    for (let i = 0; i < slice.length; i++) {
      const ch = slice.charCodeAt(i)
      const pos = selFrom + i
      if (ch === 32) {
        ranges.push(dotMark.range(pos, pos + 1))
      } else if (ch === 9) {
        ranges.push(tabMark.range(pos, pos + 1))
      }
    }
  }

  // 3. Trailing Whitespace Dots on Visible Lines (subtle alert for trailing spaces)
  for (const { from, to } of view.visibleRanges) {
    const startLine = doc.lineAt(from).number
    const endLine = doc.lineAt(to).number

    for (let l = startLine; l <= endLine; l++) {
      const line = doc.line(l)
      const text = line.text
      if (text.length === 0) continue

      let trail = text.length - 1
      while (trail >= 0 && (text.charCodeAt(trail) === 32 || text.charCodeAt(trail) === 9)) {
        trail--
      }

      // If trailing whitespace exists after non-whitespace content
      if (trail >= 0 && trail < text.length - 1) {
        for (let p = trail + 1; p < text.length; p++) {
          const absPos = line.from + p
          const inSelection = view.state.selection.ranges.some(
            (r) => !r.empty && r.from <= absPos && absPos < r.to
          )
          if (!inSelection) {
            if (text.charCodeAt(p) === 32) {
              ranges.push(dotMark.range(absPos, absPos + 1))
            } else {
              ranges.push(tabMark.range(absPos, absPos + 1))
            }
          }
        }
      }
    }
  }

  return Decoration.set(ranges, true)
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
