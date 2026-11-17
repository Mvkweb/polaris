import { For, Show, createSignal, onCleanup, type JSX } from 'solid-js'
import { Portal } from 'solid-js/web'

export interface DockSelectOption<T extends string | number> {
  value: T
  label: JSX.Element
  hint?: JSX.Element
  disabled?: boolean
}

/**
 * Dock dropdown: a quiet trigger that opens a dark menu *upward* (the dock
 * sits at the bottom of the canvas). The menu is portalled and positioned from
 * the trigger, so a morphing/clipping dock never cuts it off.
 */
export function DockSelect<T extends string | number>(props: {
  title: string
  value: T
  options: ReadonlyArray<DockSelectOption<T>>
  onChange: (value: T) => void
  trigger: JSX.Element
  menuWidth?: number
  align?: 'left' | 'right'
}): JSX.Element {
  let trigger: HTMLButtonElement | undefined
  let menu: HTMLDivElement | undefined
  const [anchor, setAnchor] = createSignal<DOMRect | null>(null)
  const open = () => anchor() !== null

  const close = (): void => {
    setAnchor(null)
    document.removeEventListener('pointerdown', onDocPointer, true)
    window.removeEventListener('keydown', onKey, true)
    window.removeEventListener('resize', close)
  }
  const onDocPointer = (e: PointerEvent): void => {
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
    if (open()) return close()
    setAnchor(trigger!.getBoundingClientRect())
    document.addEventListener('pointerdown', onDocPointer, true)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', close)
  }
  const pick = (v: T): void => {
    props.onChange(v)
    close()
  }
  onCleanup(close)

  const width = () => props.menuWidth ?? 210
  const position = (): JSX.CSSProperties => {
    const r = anchor()!
    const left =
      props.align === 'right'
        ? r.right - width()
        : Math.max(8, Math.min(r.left, innerWidth - width() - 8))
    return { left: `${left}px`, bottom: `${innerHeight - r.top + 8}px`, width: `${width()}px` }
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        title={props.title}
        aria-haspopup="listbox"
        aria-expanded={open()}
        onClick={toggle}
        class="media-dock-btn h-8 px-2.5 flex items-center gap-1.5 rounded-[10px] text-[12.5px]"
        classList={{ 'is-open': open() }}
      >
        {props.trigger}
        <svg viewBox="0 0 16 16" class="media-select-chevron w-3 h-3 opacity-50" aria-hidden="true">
          <path
            d="m4 10 4-4 4 4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <Show when={open()}>
        <Portal>
          <div
            ref={menu}
            role="listbox"
            aria-label={props.title}
            class="media-menu fixed z-[80] p-1 rounded-[12px]"
            classList={{ 'is-right': props.align === 'right' }}
            style={position()}
          >
            <For each={props.options}>
              {(opt) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={opt.value === props.value}
                  disabled={opt.disabled}
                  onClick={() => pick(opt.value)}
                  class="media-menu-item w-full h-8 flex items-center gap-2.5 pl-2.5 pr-2 rounded-[8px] text-left"
                  classList={{ 'is-active': opt.value === props.value }}
                >
                  <span class="text-[12.5px]">{opt.label}</span>
                  <span class="ml-auto flex items-center gap-2 min-w-0">
                    <Show when={opt.hint}>
                      <span class="text-[11px] truncate media-menu-hint">{opt.hint}</span>
                    </Show>
                    <svg
                      viewBox="0 0 12 12"
                      class="media-menu-check w-3 h-3 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M2.5 6.2 5 8.5l4.5-5" />
                    </svg>
                  </span>
                </button>
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </>
  )
}

export default DockSelect
