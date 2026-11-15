import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import type { Extension } from '@codemirror/state'

/**
 * Pierre / Dither OLED Dark Theme for CodeMirror 6
 * Deep obsidian canvas (#0a0a0a), crisp monospace typography, muted line numbers,
 * vibrant coral keywords (#f43f5e), clean sky-blue types & caret (#38bdf8),
 * mint string highlights (#34d399), and rounded selection pills.
 */
export const ditherTheme = EditorView.theme(
  {
    '&': {
      color: '#e6edf3',
      backgroundColor: '#0a0a0a',
      height: '100%',
      fontSize: '13px',
      fontFamily:
        'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      letterSpacing: '0px'
    },
    '.cm-scroller': {
      position: 'relative',
      overflow: 'auto',
      lineHeight: '1.65',
      fontFamily: 'inherit'
    },
    '.cm-content': {
      padding: '12px 0 32px 0',
      caretColor: 'transparent !important'
    },
    '&, & *, .cm-content, .cm-line': {
      caretColor: 'transparent !important'
    },
    '.cm-cursorLayer, .cm-cursor, .cm-cursor-primary, .cm-cursor-secondary, .cm-dropCursor': {
      display: 'none !important',
      opacity: '0 !important',
      visibility: 'hidden !important',
      border: 'none !important',
      borderLeft: 'none !important',
      width: '0 !important',
      height: '0 !important'
    },
    // Selection styling: uniform background, flat internal edges
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-selectionLayer .cm-selectionBackground': {
      backgroundColor: 'rgba(56, 189, 248, 0.22) !important',
      borderRadius: '0px'
    },
    // Single-line or word selection: clean subtle 3px rounding
    '.cm-selectionLayer .cm-selectionBackground:only-child': {
      borderRadius: '3px !important'
    },
    // Multi-line top row: round only top-left & top-right
    '.cm-selectionLayer .cm-selectionBackground:first-child': {
      borderTopLeftRadius: '3px !important',
      borderTopRightRadius: '3px !important',
      borderBottomLeftRadius: '0 !important',
      borderBottomRightRadius: '0 !important'
    },
    // Multi-line bottom row: round only bottom-left & bottom-right
    '.cm-selectionLayer .cm-selectionBackground:last-child': {
      borderBottomLeftRadius: '3px !important',
      borderBottomRightRadius: '3px !important',
      borderTopLeftRadius: '0 !important',
      borderTopRightRadius: '0 !important'
    },
    // Seamless straight edges on intermediate rows (no scalloped notches)
    '.cm-selectionLayer .cm-selectionBackground:not(:first-child):not(:last-child)': {
      borderRadius: '0 !important'
    },
    // Hide duplicate native browser selection to avoid double-brightness
    '.cm-content ::selection': {
      backgroundColor: 'transparent !important'
    },
    // When text is selected, avoid activeLine background clashing under the cursor line
    '&:has(.cm-selectionLayer .cm-selectionBackground) .cm-activeLine': {
      backgroundColor: 'transparent !important'
    },
    '.cm-selectionMatch': {
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
      outline: '1px solid rgba(56, 189, 248, 0.3)',
      borderRadius: '3px'
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(255, 255, 255, 0.025)'
    },
    '.cm-gutters': {
      backgroundColor: '#0a0a0a',
      color: '#475569',
      borderRight: '1px solid rgba(255, 255, 255, 0.06)',
      paddingRight: '4px',
      userSelect: 'none'
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 12px 0 16px',
      minWidth: '44px',
      textAlign: 'right',
      fontSize: '11.5px',
      fontFamily: 'inherit',
      color: '#475569'
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: '#e2e8f0 !important',
      fontWeight: '600'
    },
    '.cm-foldGutter': {
      paddingRight: '6px'
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
      border: 'none',
      color: '#38bdf8',
      padding: '0 6px',
      margin: '0 4px',
      borderRadius: '3px',
      fontSize: '11px'
    },
    '.cm-tooltip': {
      backgroundColor: '#111111',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '8px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
      color: '#f1f5f9'
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: 'rgba(56, 189, 248, 0.18)',
        color: '#ffffff'
      }
    }
  },
  { dark: true }
)

export const ditherHighlightStyle = HighlightStyle.define([
  // Keywords (export, type, function, return, const, let, class, struct)
  { tag: [t.keyword, t.definitionKeyword, t.operatorKeyword], color: '#f43f5e', fontWeight: '500' },
  // Types, Interfaces, Classes
  { tag: [t.typeName, t.className, t.standard(t.name)], color: '#38bdf8' },
  // Function names and calls
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#60a5fa' },
  // String literals
  { tag: [t.string, t.special(t.string)], color: '#34d399' },
  // Numbers, Booleans
  { tag: [t.number, t.bool, t.null], color: '#fbbf24' },
  // Comments
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#64748b', fontStyle: 'italic' },
  // Properties and variables
  { tag: [t.propertyName, t.attributeName], color: '#e2e8f0' },
  { tag: [t.variableName], color: '#f8fafc' },
  // Punctuation, brackets, operators
  { tag: [t.punctuation, t.bracket], color: '#94a3b8' },
  { tag: [t.operator], color: '#cbd5e1' },
  // HTML/JSX tags
  { tag: [t.tagName], color: '#f43f5e' },
  // Markdown headings and emphasis
  { tag: t.heading, color: '#38bdf8', fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.link, color: '#60a5fa', textDecoration: 'underline' }
])

export const ditherSyntaxTheme: Extension = [
  ditherTheme,
  syntaxHighlighting(ditherHighlightStyle)
]
