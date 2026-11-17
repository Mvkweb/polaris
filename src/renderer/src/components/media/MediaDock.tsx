import { For, createSignal, onCleanup, onMount, type JSX, type ParentComponent } from 'solid-js'

/**
 * The floating control dock shared by every media view: a dark, borderless
 * pill that sits over the bottom of the canvas. Items are quiet text/icons;
 * the active one gets a solid black "key" that slides between options.
 */

export const MediaDock: ParentComponent<{ hidden?: boolean; class?: string }> = (props) => (
  <div
    class={`media-dock pointer-events-auto flex items-center gap-0.5 p-1 rounded-[14px] ${props.class ?? ''}`}
    classList={{ 'media-dock-hidden': props.hidden }}
    onPointerDown={(e) => e.stopPropagation()}
    onDblClick={(e) => e.stopPropagation()}
  >
    {props.children}
  </div>
)

/** Six-dot grip, purely decorative — anchors the dock visually like a handle. */
export const DockGrip = () => (
  <span class="grid grid-cols-2 gap-[3px] px-2 opacity-40" aria-hidden="true">
    <For each={[0, 1, 2, 3, 4, 5]}>
      {() => <span class="w-[3px] h-[3px] rounded-full bg-white" />}
    </For>
  </span>
)

export const DockDivider = () => <span class="mx-1 h-4 w-px bg-white/[0.07]" aria-hidden="true" />

export const DockButton: ParentComponent<{
  title: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  class?: string
}> = (props) => (
  <button
    type="button"
    title={props.title}
    aria-label={props.title}
    aria-pressed={props.active}
    disabled={props.disabled}
    onClick={() => props.onClick()}
    class={`media-dock-btn h-8 min-w-8 px-2 flex items-center justify-center gap-1.5 rounded-[10px] text-[12.5px] ${props.class ?? ''}`}
    classList={{ 'is-active': props.active }}
  >
    {props.children}
  </button>
)

/** Segmented choice with a sliding black key under the active option. */
export function DockSegments<T extends string>(props: {
  options: ReadonlyArray<{ value: T; label: JSX.Element; title?: string }>
  value: T | null
  onChange: (value: T) => void
  width?: number
}): JSX.Element {
  const w = () => props.width ?? 52
  const index = () => props.options.findIndex((o) => o.value === props.value)
  return (
    <div class="relative flex items-center" role="radiogroup">
      <span
        class="media-dock-key absolute top-0 left-0 h-8 rounded-[10px]"
        style={{
          width: `${w()}px`,
          transform: `translateX(${Math.max(0, index()) * w()}px)`,
          opacity: index() < 0 ? 0 : 1
        }}
        aria-hidden="true"
      />
      <For each={props.options}>
        {(opt) => (
          <button
            type="button"
            role="radio"
            aria-checked={opt.value === props.value}
            title={opt.title}
            onClick={() => props.onChange(opt.value)}
            class="media-dock-seg relative z-10 h-8 flex items-center justify-center text-[12.5px]"
            classList={{ 'is-active': opt.value === props.value }}
            style={{ width: `${w()}px` }}
          >
            {opt.label}
          </button>
        )}
      </For>
    </div>
  )
}

/**
 * Morphing container: measures its content and animates its own width/height
 * to match, so the dock reshapes as one surface when rows/controls appear.
 * Content is clipped while it morphs (menus render in a portal, so they escape).
 */
export const MorphBox: ParentComponent<{ class?: string }> = (props) => {
  let inner: HTMLDivElement | undefined
  const [size, setSize] = createSignal<{ w: number; h: number } | null>(null)
  onMount(() => {
    const ro = new ResizeObserver(() => {
      if (inner) setSize({ w: inner.offsetWidth, h: inner.offsetHeight })
    })
    ro.observe(inner!)
    onCleanup(() => ro.disconnect())
  })
  return (
    <div
      class={`media-morph ${props.class ?? ''}`}
      style={size() ? { width: `${size()!.w}px`, height: `${size()!.h}px` } : undefined}
    >
      <div ref={inner} class="media-morph-inner">
        {props.children}
      </div>
    </div>
  )
}
