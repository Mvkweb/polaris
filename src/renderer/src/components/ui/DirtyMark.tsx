import { For, type Component } from 'solid-js'

/**
 * Unsaved-changes mark: a tiny dithered dot drawn as a 5×5 pixel sprite in the
 * accent colour. Solid core, checkerboard halo; the halo pixels trade places
 * on a slow two-phase step, so it shimmers like the dither elsewhere in the app.
 */

// 2 = solid core, 1 = halo phase A, 3 = halo phase B, 0 = empty
const SPRITE = [
  [0, 1, 0, 3, 0],
  [3, 2, 2, 2, 1],
  [0, 2, 2, 2, 0],
  [1, 2, 2, 2, 3],
  [0, 3, 0, 1, 0]
]
const CELLS = SPRITE.flatMap((row, y) => row.map((v, x) => ({ x, y, v })).filter((c) => c.v !== 0))

export const DirtyMark: Component<{ class?: string; title?: string }> = (props) => (
  <svg
    viewBox="0 0 5 5"
    class={`dirty-mark ${props.class ?? 'w-[9px] h-[9px]'}`}
    shape-rendering="crispEdges"
    role="img"
    aria-label={props.title ?? 'Unsaved changes'}
  >
    <title>{props.title ?? 'Unsaved changes'}</title>
    <For each={CELLS}>
      {(c) => (
        <rect
          x={c.x}
          y={c.y}
          width="1"
          height="1"
          class={c.v === 2 ? 'dm-core' : c.v === 1 ? 'dm-a' : 'dm-b'}
        />
      )}
    </For>
  </svg>
)

export default DirtyMark
