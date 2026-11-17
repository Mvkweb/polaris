import { Show, type JSX } from 'solid-js'

// Small, consistent 16px glyphs for the media dock (1.6 stroke, round caps).

type P = { class?: string }
const base = (props: P, children: JSX.Element, fill = false) => (
  <svg
    viewBox="0 0 16 16"
    fill={fill ? 'currentColor' : 'none'}
    stroke={fill ? 'none' : 'currentColor'}
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class ?? 'w-4 h-4'}
    aria-hidden="true"
  >
    {children}
  </svg>
)

export const PlayIcon = (p: P) =>
  base(
    p,
    <path d="M5 3.4v9.2a.8.8 0 0 0 1.2.7l7.3-4.6a.8.8 0 0 0 0-1.4L6.2 2.7A.8.8 0 0 0 5 3.4Z" />,
    true
  )
export const PauseIcon = (p: P) =>
  base(
    p,
    <>
      <rect x="3.5" y="2.75" width="3" height="10.5" rx="1" />
      <rect x="9.5" y="2.75" width="3" height="10.5" rx="1" />
    </>,
    true
  )
export const VolumeIcon = (p: P & { level: number; muted: boolean }) =>
  base(
    p,
    <>
      <path d="M2.5 6.2v3.6h2.3L8 12.6V3.4L4.8 6.2H2.5Z" fill="currentColor" />
      <Show when={!(p.muted || p.level === 0)} fallback={<path d="m11 6 3 4m0-4-3 4" />}>
        <path d="M10.6 6.1a2.7 2.7 0 0 1 0 3.8" />
        <path
          d="M12.4 4.3a5.2 5.2 0 0 1 0 7.4"
          style={{ opacity: p.level > 0.5 ? 1 : 0.25, transition: 'opacity 150ms' }}
        />
      </Show>
    </>
  )
export const LoopIcon = (p: P) =>
  base(
    p,
    <>
      <path d="M3 7.5V7a3 3 0 0 1 3-3h7m-2-2 2 2-2 2" />
      <path d="M13 8.5V9a3 3 0 0 1-3 3H3m2 2-2-2 2-2" />
    </>
  )
export const ExpandIcon = (p: P) =>
  base(p, <path d="M2.75 6V2.75H6M10 2.75h3.25V6M13.25 10v3.25H10M6 13.25H2.75V10" />)
export const RotateIcon = (p: P) =>
  base(
    p,
    <>
      <path d="M13 8a5 5 0 1 1-1.6-3.7" />
      <path d="M13 2.5v2.5h-2.5" />
    </>
  )
export const MinusIcon = (p: P) => base(p, <path d="M3.5 8h9" />)
export const PlusIcon = (p: P) => base(p, <path d="M3.5 8h9M8 3.5v9" />)
export const CodeIcon = (p: P) => base(p, <path d="m5.5 4.5-3.5 3.5 3.5 3.5m5-7 3.5 3.5-3.5 3.5" />)
export const CheckerIcon = (p: P) =>
  base(
    p,
    <>
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
      <path d="M2.5 8h11M8 2.5v11" />
      <path
        d="M2.5 2.5h5.5v5.5H2.5zM8 8h5.5v5.5H8z"
        fill="currentColor"
        stroke="none"
        opacity=".45"
      />
    </>
  )
export const StudioIcon = (p: P) =>
  base(
    p,
    <>
      <path d="M2.5 4.5h6M11.5 4.5h2M2.5 11.5h2M7.5 11.5h6" />
      <circle cx="10" cy="4.5" r="1.5" />
      <circle cx="6" cy="11.5" r="1.5" />
    </>
  )
