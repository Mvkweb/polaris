import {
  For,
  Show,
  createEffect,
  createSignal,
  on,
  onCleanup,
  onMount,
  type JSX,
  type ParentComponent
} from 'solid-js'
import { Portal } from 'solid-js/web'
import {
  navigateTo,
  pathEditing,
  setPathEditing,
  setRevealRequest,
  workspaceRoot
} from '../../store'
import { fillStyle } from '../../lib/dither'
import '../media/media.css'

/** Home folder, for showing `~/…` and expanding what the user types. */
let home = ''
void window.api
  ?.getUserPlaces?.()
  .then((u: { home?: string }) => (home = u?.home ?? ''))
  .catch(() => {})

const tildify = (p: string): string =>
  home && (p === home || p.startsWith(home + '/')) ? '~' + p.slice(home.length) : p
const expand = (p: string): string => {
  const t = p.trim()
  if (t === '~' || t.startsWith('~/')) return normalize(home + t.slice(1))
  if (t.startsWith('/')) return normalize(t)
  const base = workspaceRoot() || home
  return normalize(`${base.replace(/\/$/, '')}/${t}`)
}
const dirname = (p: string): string => p.replace(/\/[^/]*$/, '') || '/'
/** Resolve `.`/`..` and duplicate slashes, keeping a trailing slash. */
const normalize = (p: string): string => {
  const trailing = p.endsWith('/') && p.length > 1
  const out: string[] = []
  for (const part of p.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') out.pop()
    else out.push(part)
  }
  return '/' + out.join('/') + (trailing && out.length ? '/' : '')
}

const SWAP_OUT_MS = 90
const MAX_SUGGESTIONS = 8

/**
 * Location bar. At rest it shows the folder pills (children). Click the active
 * pill (or Ctrl+L) and the pills melt into a text field: the outgoing view
 * drifts up and blurs out, the field rises in while the bar eases to its new
 * width. Folder suggestions follow what you type; Tab completes, ↑/↓ pick,
 * Enter goes, Esc or clicking away melts back. A file path opens its folder
 * with the file selected; a path that doesn't exist shakes into red hatching.
 */
export const PathBar: ParentComponent = (props) => {
  let inner: HTMLSpanElement | undefined
  let input: HTMLInputElement | undefined
  const [width, setWidth] = createSignal<number | null>(null)
  const [shown, setShown] = createSignal<'pills' | 'edit'>('pills')
  const [swap, setSwap] = createSignal<'rest' | 'exit' | 'enter-start'>('rest')
  const [value, setValue] = createSignal('')
  const [items, setItems] = createSignal<string[]>([])
  const [active, setActive] = createSignal(-1)
  const [error, setError] = createSignal(false)
  const [anchor, setAnchor] = createSignal<DOMRect | null>(null)

  // ── Morph: swap content (text-states-swap) + ease the width ────────────
  let swapTimer: number | undefined
  let raf = 0
  createEffect(
    on(
      pathEditing,
      (editing) => {
        window.clearTimeout(swapTimer)
        cancelAnimationFrame(raf)
        setSwap('exit')
        swapTimer = window.setTimeout(() => {
          setShown(editing ? 'edit' : 'pills')
          setSwap('enter-start')
          raf = requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              setSwap('rest')
              if (editing && input) {
                setValue(tildify(workspaceRoot() || home))
                setError(false)
                input.focus()
                input.select()
                refresh()
              }
            })
          )
        }, SWAP_OUT_MS)
      },
      { defer: true }
    )
  )
  onMount(() => {
    const ro = new ResizeObserver(() => inner && setWidth(inner.offsetWidth))
    ro.observe(inner!)
    onCleanup(() => ro.disconnect())
  })
  onCleanup(() => {
    window.clearTimeout(swapTimer)
    cancelAnimationFrame(raf)
  })

  // ── Suggestions: subfolders of the typed parent, prefix-matched ────────
  const listing = new Map<string, Promise<string[]>>()
  const subfolders = (dir: string): Promise<string[]> => {
    if (!listing.has(dir)) {
      listing.set(
        dir,
        window.api
          .readDirectory(dir)
          .then((entries) => entries.filter((e) => e.isDirectory).map((e) => e.name))
          .catch(() => [])
      )
    }
    return listing.get(dir)!
  }
  let seq = 0
  const refresh = async (): Promise<void> => {
    const v = value()
    const full = expand(v || '/')
    const endsWithSlash = v.endsWith('/')
    const parent = endsWithSlash ? full.replace(/\/$/, '') || '/' : dirname(full)
    const partial = endsWithSlash ? '' : full.slice(parent.length + (parent === '/' ? 0 : 1))
    const id = ++seq
    const names = await subfolders(parent)
    if (id !== seq) return
    const p = partial.toLowerCase()
    const showHidden = p.startsWith('.')
    const matches = names
      .filter((n) => n.toLowerCase().startsWith(p) && (showHidden || !n.startsWith('.')))
      .filter((n) => !(n.toLowerCase() === p && !endsWithSlash))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, MAX_SUGGESTIONS)
      .map((n) => tildify(`${parent === '/' ? '' : parent}/${n}`))
    setItems(matches)
    setActive(-1)
    if (input) setAnchor(input.getBoundingClientRect())
  }

  const close = (): void => {
    setItems([])
    setAnchor(null)
    setPathEditing(false)
  }

  const go = async (raw: string): Promise<void> => {
    const target = expand(raw).replace(/\/+$/, '') || '/'
    try {
      const info = await window.api.getFileProperties(target)
      if (!info) throw new Error('missing')
      if (info.isDirectory) {
        navigateTo(target)
      } else {
        navigateTo(dirname(target))
        setRevealRequest(target)
      }
      close()
    } catch {
      setError(false)
      requestAnimationFrame(() => setError(true))
    }
  }

  const complete = (path: string): void => {
    const full = tildify(normalize(expand(path)))
    setValue(full.endsWith('/') ? full : full + '/')
    setError(false)
    void refresh()
  }

  const onKeyDown = (e: KeyboardEvent): void => {
    e.stopPropagation()
    const list = items()
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      void go(active() >= 0 ? list[active()] : value())
    } else if (e.key === 'Tab' && list.length) {
      e.preventDefault()
      complete(list[Math.max(0, active())])
    } else if (e.key === 'ArrowDown' && list.length) {
      e.preventDefault()
      setActive((i) => (i + 1) % list.length)
    } else if (e.key === 'ArrowUp' && list.length) {
      e.preventDefault()
      setActive((i) => (i <= 0 ? list.length - 1 : i - 1))
    }
  }

  const menuStyle = (): JSX.CSSProperties => {
    const r = anchor()!
    return { top: `${r.bottom + 6}px`, left: `${r.left}px`, width: `${Math.max(r.width, 260)}px` }
  }

  return (
    <span
      class="path-morph"
      classList={{ 'is-editing': shown() === 'edit' }}
      style={width() === null ? undefined : { width: `${width()}px` }}
    >
      <span
        ref={inner}
        class="path-swap flex items-center gap-1.5"
        classList={{ 'is-exit': swap() === 'exit', 'is-enter-start': swap() === 'enter-start' }}
      >
        <Show when={shown() === 'edit'} fallback={props.children}>
          <span class="path-field" classList={{ 'is-error': error() }}>
            <span
              class="path-field-error"
              style={fillStyle('hatched', { color: 'red', cell: 2 })}
              aria-hidden="true"
            />
            <svg
              viewBox="0 0 16 16"
              class="relative w-3.5 h-3.5 text-white/35 shrink-0"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M2.5 5.5A1.5 1.5 0 0 1 4 4h2.4l1.2 1.2H12a1.5 1.5 0 0 1 1.5 1.5v4.8A1.5 1.5 0 0 1 12 13H4a1.5 1.5 0 0 1-1.5-1.5Z" />
            </svg>
            <input
              ref={input}
              class="path-input"
              value={value()}
              spellcheck={false}
              autocomplete="off"
              aria-label="Location"
              aria-expanded={items().length > 0}
              onInput={(e) => {
                setValue(e.currentTarget.value)
                setError(false)
                void refresh()
              }}
              onKeyDown={onKeyDown}
              onBlur={() => window.setTimeout(() => pathEditing() && close(), 120)}
            />
            <kbd class="path-hint">⏎</kbd>
          </span>
        </Show>
      </span>

      <Show when={shown() === 'edit' && anchor() && items().length}>
        <Portal>
          <div
            class="media-menu path-menu fixed z-[80] p-1 rounded-[12px]"
            style={menuStyle()}
            role="listbox"
          >
            <For each={items()}>
              {(item, i) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={i() === active()}
                  class="media-menu-item w-full h-8 flex items-center px-2.5 rounded-[8px] text-left"
                  classList={{ 'is-active': i() === active() }}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => void go(item)}
                >
                  <span class="truncate text-[12.5px] text-white/40">
                    {item.slice(0, item.lastIndexOf('/') + 1)}
                  </span>
                  <span class="text-[12.5px] shrink-0">
                    {item.slice(item.lastIndexOf('/') + 1)}
                  </span>
                </button>
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </span>
  )
}

export default PathBar
