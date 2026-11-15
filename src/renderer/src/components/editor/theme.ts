import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import type { Extension } from '@codemirror/state'

/**
 * Pierre / Dither OLED Dark Theme for CodeMirror 6
 * Inspired by diffs.com / Pierre / Dither Diff aesthetic:
 * Deep obsidian canvas, crisp monospace typography, muted line numbers,
 * vibrant coral keywords, cyan types, and mint string highlights.
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
      padding: '12px 0 32px 0'
    },
    // Only hide the native caret while the smooth overlay is actually alive.
    // If that plugin ever fails, CodeMirror's own blinking caret comes back.
    '&.cm-smooth-active .cm-cursor, &.cm-smooth-active .cm-dropCursor': {
      opacity: '0 !important'
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'rgba(56, 189, 248, 0.18) !important'
    },
    '.cm-selectionMatch': {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      outline: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '2px'
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
      fontFamily: 'ui-monospace, SFMono-Regular, monospace',
      color: '#475569'
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: '#94a3b8 !important',
      fontWeight: '500'
    },
    '.cm-foldGutter': {
      paddingRight: '6px'
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      border: 'none',
      color: '#94a3b8',
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
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        color: '#ffffff'
      }
    }
  },
  { dark: true }
)

export const ditherHighlightStyle = HighlightStyle.define([
  // Keywords (export, type, function, return, const, let, class)
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
