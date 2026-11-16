import { Show, type Component } from 'solid-js'
import { EXTENSION_TOKENS, FILE_NAME_TOKENS, SPRITE_SYMBOLS, TOKEN_COLORS } from './pierre/icons'

// Pierre's file-icon set (the one T3 Code ships). Icons are monochrome sprite
// symbols tinted per file type; one hidden <svg> sprite is injected on first
// use and every icon is a cheap <use> reference into it.

const SVG_NS = 'http://www.w3.org/2000/svg'
let spriteInjected = false
const ensureSprite = (): void => {
  if (spriteInjected) return
  spriteInjected = true
  const host = document.createElementNS(SVG_NS, 'svg')
  host.setAttribute('aria-hidden', 'true')
  host.setAttribute('width', '0')
  host.setAttribute('height', '0')
  host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'
  host.innerHTML = SPRITE_SYMBOLS
  document.body.prepend(host)
}

const FALLBACK_COLOR = '#adadb1'
const tokenCache = new Map<string, string>()

/** Resolve a file name to a Pierre icon token: exact name, then longest extension first. */
export const resolveFileIconToken = (name: string): string => {
  const cached = tokenCache.get(name)
  if (cached) return cached
  const lower = name.toLowerCase()
  let token = FILE_NAME_TOKENS[lower] ?? EXTENSION_TOKENS[name]
  if (!token) {
    const parts = lower.split('.')
    for (let i = 1; i < parts.length && !token; i++) {
      token = EXTENSION_TOKENS[parts.slice(i).join('.')]
    }
  }
  token ??= 'default'
  if (tokenCache.size > 2000) tokenCache.clear()
  tokenCache.set(name, token)
  return token
}

interface FileIconProps {
  name: string
  isDirectory: boolean
  isExpanded?: boolean
  class?: string
}

export const FileIcon: Component<FileIconProps> = (props) => {
  ensureSprite()
  const token = () => resolveFileIconToken(props.name)

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      class={`w-4 h-4 shrink-0 select-none pointer-events-none ${props.class || ''}`}
      style={{
        color: props.isDirectory
          ? 'rgb(255 255 255 / 0.45)'
          : (TOKEN_COLORS[token()] ?? FALLBACK_COLOR)
      }}
    >
      <Show when={props.isDirectory} fallback={<use href={`#file-tree-builtin-${token()}`} />}>
        <path
          fill="currentColor"
          d={
            props.isExpanded
              ? 'M1.5 4A1.5 1.5 0 0 1 3 2.5h3.38l1.5 1.5H13A1.5 1.5 0 0 1 14.5 5.5V6H4.2a1.5 1.5 0 0 0-1.43 1.05L1.5 11.2zM4.2 7h10.6l-1.6 5.45a1.5 1.5 0 0 1-1.44 1.05H2.4z'
              : 'M1.5 4A1.5 1.5 0 0 1 3 2.5h3.38l1.5 1.5H13A1.5 1.5 0 0 1 14.5 5.5V12A1.5 1.5 0 0 1 13 13.5H3A1.5 1.5 0 0 1 1.5 12z'
          }
        />
      </Show>
    </svg>
  )
}

export default FileIcon
