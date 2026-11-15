import type { Extension } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { markdown } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import { rust } from '@codemirror/lang-rust'

export interface LanguageInfo {
  name: string
  extension: () => Extension
}

export function detectLanguage(filePath: string): LanguageInfo {
  const lower = filePath.toLowerCase()
  const ext = lower.split('.').pop() || ''

  switch (ext) {
    case 'ts':
    case 'mts':
    case 'cts':
      return {
        name: 'TypeScript',
        extension: () => javascript({ typescript: true })
      }
    case 'tsx':
      return {
        name: 'TypeScript JSX',
        extension: () => javascript({ typescript: true, jsx: true })
      }
    case 'js':
    case 'mjs':
    case 'cjs':
      return {
        name: 'JavaScript',
        extension: () => javascript()
      }
    case 'jsx':
      return {
        name: 'JavaScript JSX',
        extension: () => javascript({ jsx: true })
      }
    case 'json':
    case 'jsonc':
    case 'lock':
      return {
        name: 'JSON',
        extension: () => json()
      }
    case 'html':
    case 'htm':
    case 'svg':
      return {
        name: 'HTML',
        extension: () => html()
      }
    case 'css':
    case 'scss':
    case 'less':
      return {
        name: 'CSS',
        extension: () => css()
      }
    case 'md':
    case 'markdown':
    case 'mdx':
      return {
        name: 'Markdown',
        extension: () => markdown()
      }
    case 'py':
    case 'pyw':
      return {
        name: 'Python',
        extension: () => python()
      }
    case 'rs':
      return {
        name: 'Rust',
        extension: () => rust()
      }
    case 'zig':
    case 'zon':
      return {
        name: 'Zig',
        extension: () => []
      }
    case 'yaml':
    case 'yml':
      return {
        name: 'YAML',
        extension: () => []
      }
    case 'toml':
      return {
        name: 'TOML',
        extension: () => []
      }
    case 'sh':
    case 'bash':
    case 'zsh':
      return {
        name: 'Shell',
        extension: () => []
      }
    default:
      return {
        name: 'Plain Text',
        extension: () => []
      }
  }
}
