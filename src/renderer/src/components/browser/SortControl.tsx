import { For, Show, createSignal, onCleanup, type Component, type JSX } from 'solid-js'
import { Portal } from 'solid-js/web'
import {
  SORT_LABELS,
  foldersFirst,
  setFoldersFirst,
  setSort,
  sortDescending,
  sortField,
  type SortByField
} from '../../store'
import '../media/media.css'

const FIELDS: SortByField[] = ['name', 'modified', 'size', 'kind']
/** What the direction means for a field, e.g. Newest / Largest / A–Z. */
export const directionLabel = (f: SortByField, desc: boolean): string =>
  f === 'modified'
    ? desc
      ? 'Newest'
      : 'Oldest'
    : f === 'size'
      ? desc
        ? 'Largest'
        : 'Smallest'
      : desc
        ? 'Z–A'
        : 'A–Z'

const SHORT: Record<SortByField, string> = {
  name: 'Name',
  modified: 'Date',
  size: 'Size',
  kind: 'Kind'
}

/** ↑ ascending / ↓ descending, rotating between the two. */
const DirArrow: Component<{ desc: boolean; class?: string }> = (props) => (
  <svg
    viewBox="0 0 16 16"
    class={`sort-arrow ${props.class ?? 'w-3 h-3'}`}
    classList={{ 'is-desc': props.desc }}
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M8 12.5v-9M4.5 7 8 3.5 11.5 7" />
  </svg>
)

/**
 * Top-bar sort chip ("Date ↓"). Opens a dark menu: pick a field (picking the
 * active one flips direction) and toggle folders-first. Remembered globally.
 */
export const SortControl: Component = () => {
  let trigger: HTMLButtonElement | undefined
  let menu: HTMLDivElement | undefined
  const [anchor, setAnchor] = createSignal<DOMRect | null>(null)

  const close = (): void => {
    setAnchor(null)
    document.removeEventListener('pointerdown', onOutside, true)
    window.removeEventListener('keydown', onKey, true)
    window.removeEventListener('resize', close)
  }
  const onOutside = (e: PointerEvent): void => {
    const t = e.target as Node
    if (!menu?.contains(t) && !trigger?.contains(t)) close()
  }
  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return
    e.preventDefault()
    e.stopImmediatePropagation()
    close()
  }
  const toggle = (): void => {
    if (anchor()) return close()
    setAnchor(trigger!.getBoundingClientRect())
    document.addEventListener('pointerdown', onOutside, true)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', close)
  }
  onCleanup(close)

  const position = (): JSX.CSSProperties => {
    const r = anchor()!
    const width = 220
    return {
      top: `${r.bottom + 8}px`,
      left: `${Math.max(8, Math.min(r.right - width, innerWidth - width - 8))}px`,
      width: `${width}px`
    }
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={toggle}
        title="Sort"
        aria-haspopup="menu"
        aria-expanded={!!anchor()}
        class={`sort-chip h-7 pl-2 pr-2.5 rounded-md flex items-center gap-1.5 text-[12.5px] transition-colors cursor-pointer ${
          anchor()
            ? 'bg-white/[0.08] text-white'
            : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
        }`}
      >
        <DirArrow desc={sortDescending()} />
        <span>{SHORT[sortField()]}</span>
      </button>

      <Show when={anchor()}>
        <Portal>
          <div
            ref={menu}
            role="menu"
            aria-label="Sort"
            class="media-menu sort-menu fixed z-[80] p-1 rounded-[12px]"
            style={position()}
          >
            <div class="px-2.5 pt-1.5 pb-1 text-[11px] text-white/35">Sort by</div>
            <For each={FIELDS}>
              {(f) => (
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={sortField() === f}
                  onClick={() => setSort(f)}
                  class="media-menu-item w-full h-8 flex items-center gap-2.5 pl-2.5 pr-2 rounded-[8px] text-left"
                  classList={{ 'is-active': sortField() === f }}
                  title={sortField() === f ? 'Click again to reverse' : undefined}
                >
                  <span class="text-[12.5px]">{SORT_LABELS[f]}</span>
                  <Show when={sortField() === f}>
                    <span class="ml-auto flex items-center gap-1 text-[11px] text-white/45">
                      {directionLabel(f, sortDescending())}
                      <DirArrow desc={sortDescending()} class="w-3 h-3 text-[var(--accent)]" />
                    </span>
                  </Show>
                </button>
              )}
            </For>
            <div class="my-1 h-px mx-2 bg-white/[0.06]" />
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={foldersFirst()}
              onClick={() => setFoldersFirst(!foldersFirst())}
              class="media-menu-item w-full h-8 flex items-center gap-2.5 pl-2.5 pr-2 rounded-[8px] text-left"
            >
              <span class="text-[12.5px]">Folders first</span>
              <span class="sort-check ml-auto" classList={{ 'is-on': foldersFirst() }} />
            </button>
          </div>
        </Portal>
      </Show>
    </>
  )
}

export default SortControl
