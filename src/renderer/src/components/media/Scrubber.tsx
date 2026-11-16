import { Show, createSignal, type Component } from 'solid-js'
import { formatTime } from './mediaKind'

interface ScrubberProps {
  current: number
  duration: number
  buffered: number
  onSeek: (time: number) => void
  onScrubStart?: () => void
  onScrubEnd?: () => void
}

/**
 * Thin progress rail that thickens on hover, with a buffered band, a
 * hover-time bubble and pointer-captured dragging. Seeks are live while dragging.
 */
export const Scrubber: Component<ScrubberProps> = (props) => {
  let rail: HTMLDivElement | undefined
  const [hover, setHover] = createSignal<number | null>(null) // 0..1
  const [dragging, setDragging] = createSignal(false)

  const ratioAt = (clientX: number): number => {
    const r = rail!.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width))
  }
  const pct = (v: number): string =>
    `${props.duration > 0 ? Math.min(100, (v / props.duration) * 100) : 0}%`

  const onDown = (e: PointerEvent): void => {
    if (e.button !== 0 || !props.duration) return
    rail!.setPointerCapture(e.pointerId)
    setDragging(true)
    props.onScrubStart?.()
    props.onSeek(ratioAt(e.clientX) * props.duration)
  }
  const onMove = (e: PointerEvent): void => {
    const r = ratioAt(e.clientX)
    setHover(r)
    if (dragging()) props.onSeek(r * props.duration)
  }
  const onUp = (): void => {
    if (!dragging()) return
    setDragging(false)
    props.onScrubEnd?.()
  }

  return (
    <div
      ref={rail}
      class="media-scrubber group/scrub relative flex-1 h-8 flex items-center cursor-pointer"
      classList={{ 'is-dragging': dragging() }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={() => !dragging() && setHover(null)}
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(props.duration)}
      aria-valuenow={Math.round(props.current)}
    >
      <div class="media-scrubber-track relative w-full rounded-full overflow-hidden">
        <div
          class="absolute inset-y-0 left-0 bg-white/[0.10]"
          style={{ width: pct(props.buffered) }}
        />
        <div
          class="media-scrubber-fill absolute inset-y-0 left-0"
          style={{ width: pct(props.current) }}
        />
      </div>
      <span class="media-scrubber-thumb" style={{ left: pct(props.current) }} />
      <Show when={hover() !== null && props.duration > 0}>
        <span
          class="media-scrubber-bubble absolute bottom-full mb-1.5 -translate-x-1/2 px-1.5 py-0.5 rounded-md text-[11px] tabular-nums"
          style={{ left: `${hover()! * 100}%` }}
        >
          {formatTime(hover()! * props.duration)}
        </span>
      </Show>
    </div>
  )
}

export default Scrubber
