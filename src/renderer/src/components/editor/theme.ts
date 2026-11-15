import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import type { Extension } from '@codemirror/state'

/**
 * Aura Dark Custom Theme for CodeMirror 6
 * Matches alok-mishra143/alok-zed-config:
 * Deep dark obsidian canvas (#15141c), crisp off-white text (#edecee),
 * muted lavender gutter line numbers (#a394f033),
 * ethereal purple keywords (#a277ff), warm gold functions (#ffca85),
 * and vibrant mint strings/numbers (#61ffca).
 */
export const auraDarkTheme = EditorView.theme(
  {
    '&': {
      color: '#edecee',
      backgroundColor: '#15141c',
      height: '100%',
      fontSize: '13.5px',
      fontFamily:
        'ui-monospace, "ZedMono", "SF Mono", "JetBrains Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      letterSpacing: '0px'
    },
    '.cm-scroller': {
      position: 'relative',
      overflow: 'auto',
      lineHeight: '1.65',
      fontFamily: 'inherit'
    },
    '.cm-content': {
      padding: '12px 0 32px 0'
    },
    '&.cm-smooth-active .cm-cursor, &.cm-smooth-active .cm-dropCursor': {
      opacity: '0 !important'
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'rgba(162, 119, 255, 0.28) !important'
    },
    '.cm-selectionMatch': {
      backgroundColor: 'rgba(189, 157, 255, 0.16)',
      outline: '1px solid rgba(189, 157, 255, 0.25)',
      borderRadius: '2px'
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(163, 148, 240, 0.05)'
    },
    '.cm-gutters': {
      backgroundColor: '#15141b',
      color: '#a394f033',
      borderRight: '1px solid rgba(77, 70, 110, 0.25)',
      paddingRight: '4px',
      userSelect: 'none'
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 12px 0 16px',
      minWidth: '44px',
      textAlign: 'right',
      fontSize: '11.5px',
      fontFamily: 'inherit',
      color: '#a394f033'
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: '#edecee !important',
      fontWeight: '600'
    },
    '.cm-foldGutter': {
      paddingRight: '6px'
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'rgba(162, 119, 255, 0.12)',
      border: 'none',
      color: '#a277ff',
      padding: '0 6px',
      margin: '0 4px',
      borderRadius: '3px',
      fontSize: '11px'
    },
    '.cm-tooltip': {
      backgroundColor: '#110f18',
      border: '1px solid rgba(77, 70, 110, 0.4)',
      borderRadius: '8px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
      color: '#edecee'
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: 'rgba(162, 119, 255, 0.2)',
        color: '#ffffff'
      }
    }
  },
  { dark: true }
)

export const auraHighlightStyle = HighlightStyle.define([
  // Keywords (export, type, function, return, const, let, class, struct, package)
  { tag: [t.keyword, t.definitionKeyword, t.operatorKeyword], color: '#a277ff', fontWeight: '500' },
  // Types, Interfaces, Classes
  { tag: [t.typeName, t.className, t.standard(t.name)], color: '#a277ff' },
  // Function names and calls
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#ffca85' },
  // String literals
  { tag: [t.string, t.special(t.string)], color: '#61ffca' },
  // Numbers, Booleans
  { tag: [t.number, t.bool, t.null], color: '#61ffca' },
  // Comments
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#6d6d6d', fontStyle: 'italic' },
  // Properties and attributes
  { tag: [t.propertyName, t.attributeName], color: '#f694ff' },
  // Variable names
  { tag: [t.variableName], color: '#edecee' },
  // Constants and variants
  { tag: [t.constant(t.name), t.standard(t.constant(t.name))], color: '#82e2ff' },
  // Punctuation, brackets, operators
  { tag: [t.punctuation, t.bracket], color: '#edecee' },
  { tag: [t.operator], color: '#a277ff' },
  // HTML/JSX tags
  { tag: [t.tagName], color: '#a277ff' },
  // Markdown headings and emphasis
  { tag: t.heading, color: '#ffca85', fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.link, color: '#61ffca', textDecoration: 'underline' }
])

export const ditherSyntaxTheme: Extension = [
  auraDarkTheme,
  syntaxHighlighting(auraHighlightStyle)
]
