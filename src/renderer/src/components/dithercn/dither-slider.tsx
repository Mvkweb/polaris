import { Slider as SliderPrimitive } from '@kobalte/core/slider'
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  Index,
  mergeProps,
  onCleanup,
  onMount,
  Show,
  splitProps,
  type JSX
} from 'solid-js'

import { bloomFilter, cssColor, fillStyle, getThresholdMap, MOTION } from '@/lib/dither'
import type { Bloom, DitherColor, DitherMatrix, FillVariant } from '@/lib/dither'
import { cn } from '@/lib/utils'

/*
 * The filled part of the track is a Bayer ramp worked out cell by cell:
 * sparse far from the thumb, denser towards it, and solid for the last
 * two cells before a one-cell gap at the thumb. The cells sit on the
 * track's own grid, so dragging flips cells through their thresholds
 * instead of sliding a texture under the thumb. With two thumbs the ramp
 * runs in from both ends. Hover, keyboard focus and drag fade in a longer,
 * denser ramp over the resting one (Bayer sets nest, so it only adds
 * cells). The thumb is a pixel-notched cap lit like Dither Button: a
 * highlight dithered down from the top, a shade dithered up from the
 * bottom and a grip line, brighter on hover and pressed in while dragged.
 * Only opacity animates.
 *
 * In addition to the notched Bayer ramp, custom fills ("dotted", "hatched",
 * "solid") and stepped "segments" can be specified for specialised styling.
 */

export type DitherSliderSize = 'sm' | 'md' | 'lg'

/** Track height and thumb size in CSS pixels, before snapping to cells. */
const SIZES = {
  lg: { thumbHeight: 30, thumbWidth: 22, track: 12 },
  md: { thumbHeight: 24, thumbWidth: 18, track: 8 },
  sm: { thumbHeight: 20, thumbWidth: 14, track: 6 }
} as const satisfies Record<
  DitherSliderSize,
  { thumbHeight: number; thumbWidth: number; track: number }
>

/** How the fill thins out behind a thumb, in cells and coverage. */
interface Ramp {
  length: number
  floor: number
}

const REST: Ramp = { floor: 2 / 16, length: 30 }
const HOT: Ramp = { floor: 5 / 16, length: 60 }
const SOLID = 2
const GAP = 1
const MAX_TICKS = 101

interface Geometry {
  cell: number
  rows: number
  thumbWidth: number
  thumbHeight: number
}

const geometryOf = (size: DitherSliderSize, cell: number): Geometry => {
  const spec = SIZES[size]
  const rows = Math.max(2, Math.round(spec.track / cell))
  const across = Math.max(3, Math.round(spec.thumbWidth / cell))
  const tall = Math.max(rows + 4, Math.round(spec.thumbHeight / cell))
  return {
    cell,
    rows,
    thumbHeight: tall * cell,
    thumbWidth: (across % 2 === 0 ? across + 1 : across) * cell
  }
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const notched = (width: number, height: number, notch: number, inset = 0) => {
  const [l, t, r, b] = [inset, inset, width - inset, height - inset]
  return `M${l + notch} ${t}H${r - notch}V${t + notch}H${r}V${b - notch}H${r - notch}V${b}H${l + notch}V${b - notch}H${l}V${t + notch}H${l + notch}Z`
}

const clipOf = (width: number, height: number, notch: number) =>
  `path("${notched(width, height, notch)}")`

interface Run {
  start: number
  end: number
  both: boolean
}

const rampPath = ({
  runs,
  cols,
  rows,
  ramp,
  matrix
}: {
  runs: readonly Run[]
  cols: number
  rows: number
  ramp: Ramp
  matrix: DitherMatrix
}) => {
  const { size, thresholds } = getThresholdMap(matrix)
  const levelAt = (distance: number) =>
    distance < SOLID
      ? 1
      : Math.max(ramp.floor, 1 - ((distance - SOLID + 0.5) / ramp.length) * (1 - ramp.floor))
  let path = ''
  for (const { start, end, both } of runs) {
    const from = Math.max(0, start)
    const to = Math.min(cols, end)
    for (let y = 0; y < rows; y += 1) {
      let open = -1
      for (let x = from; x <= to; x += 1) {
        const corner = (x === 0 || x === cols - 1) && (y === 0 || y === rows - 1)
        const distance = both ? Math.min(x - start, end - 1 - x) : end - 1 - x
        const on =
          x < to && !corner && levelAt(distance) > (thresholds[(y % size) * size + (x % size)] ?? 1)
        if (on && open === -1) {
          open = x
        } else if (!on && open !== -1) {
          path += `M${open} ${y}h${x - open}v1h${open - x}z`
          open = -1
        }
      }
    }
  }
  return path
}

const centreCss = (ratio: number, thumbWidth: number) =>
  `calc(${thumbWidth / 2}px + ${ratio} * (100% - ${thumbWidth}px))`

const centrePx = (ratio: number, width: number, thumbWidth: number) =>
  thumbWidth / 2 + ratio * (width - thumbWidth)

const runsOf = ({
  ratios,
  width,
  geometry
}: {
  ratios: readonly number[]
  width: number
  geometry: Geometry
}): Run[] => {
  const { cell, thumbWidth } = geometry
  const half = thumbWidth / 2 / cell
  const centres = ratios.map((ratio) => centrePx(ratio, width, thumbWidth) / cell)
  const [first] = centres
  const last = centres.at(-1)
  if (first === undefined || last === undefined) {
    return []
  }
  if (centres.length === 1) {
    return [{ both: false, end: Math.round(first - half) - GAP, start: 0 }]
  }
  return [
    {
      both: true,
      end: Math.round(last - half) - GAP,
      start: Math.round(first + half) + GAP
    }
  ]
}

const STYLES = [
  `.dcn-sld-hot,.dcn-sld-lit,.dcn-sld-press,.dcn-sld-ring{opacity:0;transition:opacity 220ms ${MOTION.ease}}`,
  `.dcn-sld-tick{transition:background-color ${MOTION.fast}ms ${MOTION.ease}}`,
  '@media (hover:hover){.dcn-sld:not([data-disabled]):hover .dcn-sld-hot,.dcn-sld:not([data-disabled]) .dcn-sld-thumb:hover .dcn-sld-lit{opacity:1}}',
  '.dcn-sld:not([data-pointer]):has(.dcn-sld-thumb:focus-visible) .dcn-sld-hot,.dcn-sld[data-dragging] .dcn-sld-hot,.dcn-sld:not([data-pointer]) .dcn-sld-thumb:focus-visible :is(.dcn-sld-lit,.dcn-sld-ring){opacity:1}',
  '.dcn-sld[data-dragging] .dcn-sld-thumb:focus .dcn-sld-press{opacity:1;transition-duration:80ms}',
  '.dcn-sld[data-dragging] .dcn-sld-thumb:focus .dcn-sld-lit{opacity:0;transition-duration:80ms}',
  '@media (prefers-reduced-motion:reduce){.dcn-sld-hot,.dcn-sld-lit,.dcn-sld-press,.dcn-sld-ring,.dcn-sld-tick{transition:none}}'
].join('')

const Fill = (props: {
  runs: readonly Run[]
  cols: number
  geometry: Geometry
  color: DitherColor
  bloom: Bloom
  matrix: DitherMatrix
}) => {
  const { cell, rows } = props.geometry
  const shared = () => ({
    cols: props.cols,
    matrix: props.matrix,
    rows,
    runs: props.runs
  })
  const svg = {
    'aria-hidden': true,
    class: 'absolute top-0 left-0 overflow-visible',
    height: rows * cell,
    'shape-rendering': 'crispEdges',
    viewBox: `0 0 ${props.cols} ${rows}`,
    width: props.cols * cell
  } as const
  return (
    <span
      aria-hidden="true"
      class="absolute inset-0"
      style={{ filter: bloomFilter(props.color, props.bloom) }}
    >
      <svg {...svg}>
        <path d={rampPath({ ...shared(), ramp: REST })} fill={cssColor(props.color)} />
      </svg>
      <svg {...svg} class={cn(svg.class, 'dcn-sld-hot')}>
        <path d={rampPath({ ...shared(), ramp: HOT })} fill={cssColor(props.color)} />
      </svg>
    </span>
  )
}

const FallbackFill = (props: {
  ratios: readonly number[]
  geometry: Geometry
  color: DitherColor
}) => {
  const { cell, thumbWidth } = props.geometry
  const ramp = (edge: 'left' | 'right') =>
    fillStyle('gradient', {
      cell,
      color: props.color,
      edge,
      from: 1,
      length: REST.length,
      to: REST.floor
    })
  const first = () => props.ratios[0] ?? 0
  const last = () => props.ratios.at(-1) ?? 0
  return (
    <Show
      when={props.ratios.length > 1}
      fallback={
        <span
          aria-hidden="true"
          class="absolute inset-y-0 left-0"
          style={{ width: centreCss(first(), thumbWidth), ...ramp('right') }}
        />
      }
    >
      {(() => {
        const left = centreCss(first(), thumbWidth)
        return (
          <span
            aria-hidden="true"
            class="absolute inset-y-0 flex"
            style={{ left, width: `calc(${centreCss(last(), thumbWidth)} - ${left})` }}
          >
            <span class="h-full w-1/2" style={ramp('left')} />
            <span class="h-full w-1/2" style={ramp('right')} />
          </span>
        )
      })()}
    </Show>
  )
}

interface Shades {
  base: string
  light: string
  dark: string
}

const shadesOf = (color: DitherColor): Shades => {
  const base = cssColor(color)
  return {
    base,
    dark: `color-mix(in oklab, ${base}, black 48%)`,
    light: `color-mix(in oklab, ${base}, white 42%)`
  }
}

const LAYER = 'pointer-events-none absolute inset-0'

const ThumbSurface = (props: { geometry: Geometry; color: DitherColor; bloom: Bloom }) => {
  const shades = createMemo(() => shadesOf(props.color))
  const ramp = (edge: 'top' | 'bottom', tone: string, share: number, from = 1) =>
    fillStyle('gradient', {
      cell: props.geometry.cell,
      color: tone,
      edge,
      from,
      length: Math.max(2, Math.round((props.geometry.thumbHeight / props.geometry.cell) * share)),
      to: 0
    })
  const ring = () =>
    `path(evenodd, "${notched(props.geometry.thumbWidth + 6, props.geometry.thumbHeight + 6, props.geometry.cell)} ${notched(props.geometry.thumbWidth + 6, props.geometry.thumbHeight + 6, props.geometry.cell, 2)}")`
  return (
    <>
      <span
        aria-hidden="true"
        class="dcn-sld-ring pointer-events-none absolute -inset-[3px] bg-ring"
        style={{ 'clip-path': ring() }}
      />
      <span
        aria-hidden="true"
        class={LAYER}
        style={{ filter: bloomFilter(props.color, props.bloom) }}
      >
        <span
          class={LAYER}
          style={{
            'background-color': `color-mix(in oklab, ${shades().base}, black 30%)`,
            'clip-path': clipOf(
              props.geometry.thumbWidth,
              props.geometry.thumbHeight,
              props.geometry.cell
            )
          }}
        />
        <span
          class="pointer-events-none absolute inset-px overflow-hidden"
          style={{
            'background-color': shades().base,
            'box-shadow': `inset 0 1px 0 color-mix(in oklab, ${shades().base}, white 55%)`,
            'clip-path': clipOf(
              props.geometry.thumbWidth - 2,
              props.geometry.thumbHeight - 2,
              props.geometry.cell
            )
          }}
        >
          <span class={LAYER} style={ramp('bottom', shades().dark, 0.5)} />
          <span class={LAYER} style={ramp('top', shades().light, 0.22)} />
          <span class={cn(LAYER, 'dcn-sld-lit')} style={ramp('top', shades().light, 0.7)} />
          <span class={cn(LAYER, 'dcn-sld-press')} style={ramp('top', shades().dark, 0.45, 0.5)} />
          <span
            class="pointer-events-none absolute left-1/2 -translate-x-1/2"
            style={{
              'background-color': shades().dark,
              height: `${Math.round(props.geometry.thumbHeight / props.geometry.cell / 3) * props.geometry.cell}px`,
              top: `calc(50% - ${(Math.round(props.geometry.thumbHeight / props.geometry.cell / 3) * props.geometry.cell) / 2}px)`,
              width: `${props.geometry.cell}px`
            }}
          />
        </span>
      </span>
    </>
  )
}

const tickValues = ({
  ticks,
  min,
  max,
  step
}: {
  ticks: boolean | readonly number[]
  min: number
  max: number
  step: number
}): number[] => {
  if (ticks === false) {
    return []
  }
  if (ticks === true) {
    const count = Math.floor((max - min) / step + 1e-9) + 1
    return count > MAX_TICKS || step <= 0
      ? []
      : Array.from({ length: count }, (_, index) => min + index * step)
  }
  return ticks.filter((tick) => tick >= min && tick <= max)
}

const Ticks = (props: {
  values: readonly number[]
  selected: readonly [number, number]
  ratioOf: (value: number) => number
  width: number | null
  geometry: Geometry
  color: DitherColor
}) => {
  const ink = () => cssColor(props.color)
  return (
    <div
      aria-hidden="true"
      class="relative"
      style={{
        height: `${props.geometry.cell * 2}px`,
        'margin-top': `${props.geometry.cell * 2}px`
      }}
    >
      <For each={props.values}>
        {(tick) => {
          const ratio = props.ratioOf(tick)
          const on = tick >= props.selected[0] && tick <= props.selected[1]
          const position =
            props.width === null
              ? { left: centreCss(ratio, props.geometry.thumbWidth), translate: '-50% 0' }
              : {
                  left: `${
                    Math.round(
                      (centrePx(ratio, props.width, props.geometry.thumbWidth) -
                        props.geometry.cell / 2) /
                        props.geometry.cell
                    ) * props.geometry.cell
                  }px`
                }
          return (
            <span
              class="dcn-sld-tick absolute top-0 h-full"
              style={{
                'background-color': on ? ink() : `color-mix(in oklab, ${ink()} 28%, transparent)`,
                width: `${props.geometry.cell}px`,
                ...position
              }}
            />
          )
        }}
      </For>
    </div>
  )
}

const segmentMask = (segments: number | undefined, cell: string): JSX.CSSProperties => {
  if (segments === undefined || segments < 2) {
    return {}
  }
  const image = `linear-gradient(90deg, #000 calc(100% - ${cell}), transparent 0)`
  const size = `calc((100% + ${cell}) / ${Math.round(segments)}) 100%`
  return {
    '-webkit-mask-image': image,
    '-webkit-mask-repeat': 'repeat-x',
    '-webkit-mask-size': size,
    'mask-image': image,
    'mask-repeat': 'repeat-x',
    'mask-size': size
  }
}

const FillRun = (props: {
  fill: FillVariant
  color: DitherColor
  cell: string
  cap: boolean
  matrix?: DitherMatrix
}) => (
  <>
    <div
      class="absolute inset-0"
      style={fillStyle(props.fill, {
        cell: props.cell,
        color: props.color,
        edge: 'right',
        from: 1,
        length: 36,
        matrix: props.matrix ?? 'bayer4',
        to: 5 / 16
      })}
    />
    <Show when={props.cap && props.fill !== 'solid'}>
      <div
        class="absolute inset-y-0 right-0"
        style={{
          'background-color': cssColor(props.color),
          width: props.cell
        }}
      />
    </Show>
  </>
)

const thumbLabel = ({
  index,
  count,
  label,
  thumbLabels
}: {
  index: number
  count: number
  label?: string
  thumbLabels?: readonly string[]
}) => {
  const custom = thumbLabels?.[index]
  if (custom !== undefined) {
    return custom
  }
  const base = label ?? 'Slider'
  if (count === 2) {
    return `${base}, ${index === 0 ? 'minimum' : 'maximum'}`
  }
  return count > 2 ? `${base}, ${index + 1} of ${count}` : base
}

export interface DitherSliderProps {
  /**
   * Slider style variant:
   * - `"thumb"`: Upstream dithered Bayer notched thumb with lit bevels and ticks.
   * - `"bar"`: Our original draggable progress-bar slider with seamless fill and solid leading cap.
   */
  variant?: 'thumb' | 'bar'
  label?: string
  hideLabel?: boolean
  showValue?: boolean
  showRange?: boolean
  ticks?: boolean | readonly number[]
  unit?: string
  format?: Intl.NumberFormatOptions
  thumbLabels?: readonly string[]
  color?: DitherColor
  size?: DitherSliderSize
  bloom?: Bloom
  matrix?: DitherMatrix
  cell?: number
  min?: number
  max?: number
  step?: number
  minStepsBetweenThumbs?: number
  value?: number | number[]
  defaultValue?: number | number[]
  onChange?: (value: any) => void
  onChangeEnd?: (value: any) => void
  onValueChange?: (values: number[]) => void
  disabled?: boolean
  fill?: FillVariant
  segments?: number
  thumb?: 'notched' | 'none'
  valueText?: string | ((value: number) => string)
  animate?: boolean
  class?: string
  style?: JSX.CSSProperties | string
}

export const DitherSlider = (props: DitherSliderProps) => {
  const merged = mergeProps(
    {
      animate: true,
      bloom: 'off' as Bloom,
      cell: 2,
      color: 'ink' as DitherColor,
      disabled: false,
      format: { maximumFractionDigits: 1 },
      hideLabel: false,
      matrix: 'bayer4' as DitherMatrix,
      max: 100,
      min: 0,
      minStepsBetweenThumbs: 0,
      showRange: false,
      showValue: true,
      size: 'md' as DitherSliderSize,
      step: 1,
      thumb: 'notched' as const,
      ticks: false,
      unit: '',
      variant: 'thumb' as const
    },
    props
  )

  const [local, others] = splitProps(merged, [
    'animate',
    'bloom',
    'cell',
    'class',
    'color',
    'defaultValue',
    'disabled',
    'fill',
    'format',
    'hideLabel',
    'label',
    'matrix',
    'max',
    'min',
    'minStepsBetweenThumbs',
    'onChange',
    'onChangeEnd',
    'onValueChange',
    'segments',
    'showRange',
    'showValue',
    'size',
    'step',
    'style',
    'thumb',
    'thumbLabels',
    'ticks',
    'unit',
    'value',
    'valueText',
    'variant'
  ])

  const isBar = () => local.variant === 'bar' || local.thumb === 'none'

  const labelId = createUniqueId()
  let trackEl: HTMLElement | undefined

  const [width, setWidth] = createSignal<number | null>(null)
  const [dragging, setDragging] = createSignal(false)
  const [pointer, setPointer] = createSignal(false)

  const toArray = (val: number | number[] | undefined, fallback: number[]): number[] => {
    if (val === undefined) return fallback
    return Array.isArray(val) ? val : [val]
  }

  const [inner, setInner] = createSignal<number[]>(toArray(local.defaultValue, [local.min]))

  createEffect(() => {
    if (local.value !== undefined) {
      setInner(toArray(local.value, [local.min]))
    }
  })

  onMount(() => {
    const handlePointerUp = () => {
      document.body.style.removeProperty('cursor')
    }
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    onCleanup(() => {
      document.body.style.removeProperty('cursor')
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    })

    if (!trackEl) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setWidth(entry.contentRect.width)
      }
    })
    observer.observe(trackEl)
    onCleanup(() => observer.disconnect())
  })

  const startDrag = () => {
    if (isBar() && !local.disabled) {
      document.body.style.cursor = 'grabbing'
    }
  }

  const values = () => (local.value !== undefined ? toArray(local.value, [local.min]) : inner())
  const geometry = createMemo(() => geometryOf(local.size, Math.max(1, Math.round(local.cell))))

  const span = () => Math.max(local.max - local.min, 1e-9)
  const ratioOf = (point: number) => clamp01((point - local.min) / span())
  const formatter = createMemo(() => new Intl.NumberFormat('en-US', local.format))

  const text = (point: number) => {
    if (typeof local.valueText === 'function') {
      return local.valueText(point)
    }
    if (typeof local.valueText === 'string') {
      return local.valueText
    }
    return `${formatter().format(point)}${local.unit}`
  }

  const selected = createMemo<readonly [number, number]>(() => {
    const list = values()
    const first = list[0] ?? local.min
    const last = list.at(-1) ?? first
    return list.length > 1 ? [first, last] : [local.min, first]
  })

  const marks = createMemo(() =>
    tickValues({
      max: local.max,
      min: local.min,
      step: local.step,
      ticks: local.ticks
    })
  )

  const handleValueChange = (next: number[]) => {
    if (local.value === undefined) {
      setInner(next)
    }
    local.onValueChange?.(next)
    if (local.onChange) {
      if (
        typeof local.value === 'number' ||
        (local.value === undefined && typeof local.defaultValue === 'number')
      ) {
        ;(local.onChange as any)(next[0] ?? local.min)
      } else {
        ;(local.onChange as any)(next)
      }
    }
  }

  const handleValueChangeEnd = (next: number[]) => {
    if (local.onChangeEnd) {
      if (
        typeof local.value === 'number' ||
        (local.value === undefined && typeof local.defaultValue === 'number')
      ) {
        ;(local.onChangeEnd as any)(next[0] ?? local.min)
      } else {
        ;(local.onChangeEnd as any)(next)
      }
    }
  }

  const cellStr = () => `${geometry().cell}px`

  return (
    <div
      class={cn(
        'flex w-full flex-col gap-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-45',
        local.class
      )}
      aria-disabled={local.disabled || undefined}
      dir="ltr"
      style={local.style}
    >
      <style>{STYLES}</style>
      <div
        class={cn(
          'flex items-baseline justify-between gap-4 text-sm',
          local.hideLabel && 'sr-only'
        )}
      >
        <span id={labelId} class="text-foreground min-w-0 truncate">
          {local.label ?? ''}
        </span>
        <Show when={local.showValue}>
          <span
            aria-hidden="true"
            class="text-muted-foreground shrink-0 font-mono text-xs tabular-nums"
          >
            {values().map(text).join(' – ')}
          </span>
        </Show>
      </div>

      <div>
        <SliderPrimitive
          data-slot="slider"
          dir="ltr"
          role="group"
          aria-labelledby={local.label ? labelId : undefined}
          minValue={local.min}
          maxValue={local.max}
          step={local.step}
          minStepsBetweenThumbs={local.minStepsBetweenThumbs}
          value={values()}
          disabled={local.disabled}
          onChange={handleValueChange}
          onChangeEnd={handleValueChangeEnd}
          data-dragging={dragging() ? '' : undefined}
          data-pointer={pointer() ? '' : undefined}
          onPointerDown={() => {
            setDragging(!local.disabled)
            setPointer(true)
            startDrag()
          }}
          onPointerUp={() => setDragging(false)}
          onKeyDown={() => setPointer(false)}
          onBlur={(e) => {
            const next = e.relatedTarget
            if (!(next instanceof Node && (e.currentTarget as HTMLElement).contains(next))) {
              setPointer(false)
            }
          }}
          class={cn(
            'dcn-sld relative flex w-full touch-none items-center select-none',
            'before:absolute before:inset-x-0 before:-inset-y-2.5',
            isBar() ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
            'data-disabled:pointer-events-none'
          )}
          style={{
            height: isBar()
              ? `${geometry().rows * geometry().cell + 8}px`
              : `${geometry().thumbHeight}px`
          }}
          {...others}
        >
          <SliderPrimitive.Track
            class="relative block grow"
            style={{
              height: `${geometry().rows * geometry().cell}px`,
              ...(local.segments ? segmentMask(local.segments, cellStr()) : {})
            }}
          >
            <div
              ref={(el) => {
                trackEl = el
              }}
              class="relative size-full overflow-hidden"
            >
              <Show
                when={!isBar()}
                fallback={
                  <>
                    <div
                      class="absolute inset-0"
                      style={{
                        'background-color': `color-mix(in oklab, ${cssColor(local.color)} 16%, transparent)`
                      }}
                    />
                    <SliderPrimitive.Fill
                      class={cn(
                        'absolute inset-y-0 left-0',
                        local.animate &&
                          'transition-[left,right] duration-200 ease-(--ease-out) motion-reduce:transition-none'
                      )}
                      style={{
                        filter: bloomFilter(local.color, local.bloom)
                      }}
                    >
                      <FillRun
                        fill={local.fill ?? 'gradient'}
                        color={local.color}
                        cell={cellStr()}
                        cap
                        matrix={local.matrix}
                      />
                    </SliderPrimitive.Fill>
                  </>
                }
              >
                <Show
                  when={!local.fill || local.fill === 'gradient'}
                  fallback={
                    <SliderPrimitive.Fill
                      class="absolute inset-y-0 left-0"
                      style={{
                        filter: bloomFilter(local.color, local.bloom)
                      }}
                    >
                      <FillRun
                        fill={local.fill!}
                        color={local.color}
                        cell={cellStr()}
                        cap
                        matrix={local.matrix}
                      />
                    </SliderPrimitive.Fill>
                  }
                >
                  {(() => {
                    const tint = `color-mix(in oklab, ${cssColor(local.color)} 15%, transparent)`
                    const w = width()
                    if (w === null) {
                      return (
                        <>
                          <span
                            aria-hidden="true"
                            class="absolute inset-0"
                            style={{ 'background-color': tint }}
                          />
                          <FallbackFill
                            ratios={values().map(ratioOf)}
                            geometry={geometry()}
                            color={local.color}
                          />
                        </>
                      )
                    }
                    return (
                      <>
                        <span
                          aria-hidden="true"
                          class="absolute inset-0"
                          style={{
                            'background-color': tint,
                            'clip-path': clipOf(
                              w,
                              geometry().rows * geometry().cell,
                              geometry().cell
                            )
                          }}
                        />
                        <Fill
                          runs={runsOf({
                            geometry: geometry(),
                            ratios: values().map(ratioOf),
                            width: w
                          })}
                          cols={Math.floor(w / geometry().cell)}
                          geometry={geometry()}
                          color={local.color}
                          bloom={local.bloom}
                          matrix={local.matrix}
                        />
                      </>
                    )
                  })()}
                </Show>
              </Show>
            </div>
          </SliderPrimitive.Track>

          <Index each={values()}>
            {(point, index) => (
              <Show
                when={!isBar()}
                fallback={
                  <SliderPrimitive.Thumb
                    aria-label={thumbLabel({
                      count: values().length,
                      index,
                      label: local.label,
                      thumbLabels: local.thumbLabels
                    })}
                    aria-valuetext={text(point())}
                    class="opacity-0 w-6 h-full absolute inset-y-0 -translate-x-1/2 cursor-grab active:cursor-grabbing outline-none pointer-events-auto"
                  >
                    <SliderPrimitive.Input />
                  </SliderPrimitive.Thumb>
                }
              >
                <SliderPrimitive.Thumb
                  aria-label={thumbLabel({
                    count: values().length,
                    index,
                    label: local.label,
                    thumbLabels: local.thumbLabels
                  })}
                  aria-valuetext={text(point())}
                  class="dcn-sld-thumb relative block outline-hidden cursor-grab active:cursor-grabbing"
                  style={{
                    left: centreCss(ratioOf(point()), geometry().thumbWidth),
                    height: `${geometry().thumbHeight}px`,
                    width: `${geometry().thumbWidth}px`
                  }}
                >
                  <SliderPrimitive.Input />
                  <ThumbSurface geometry={geometry()} color={local.color} bloom={local.bloom} />
                </SliderPrimitive.Thumb>
              </Show>
            )}
          </Index>
        </SliderPrimitive>

        <Show when={marks().length > 0}>
          <Ticks
            values={marks()}
            selected={selected()}
            ratioOf={ratioOf}
            width={width()}
            geometry={geometry()}
            color={local.color}
          />
        </Show>

        <Show when={local.showRange}>
          <div
            aria-hidden="true"
            class="text-muted-foreground mt-2 flex justify-between font-mono text-[0.6875rem] tabular-nums"
          >
            <span>{text(local.min)}</span>
            <span>{text(local.max)}</span>
          </div>
        </Show>
      </div>
    </div>
  )
}
