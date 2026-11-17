import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
  type Component
} from 'solid-js'
import { openFileInEditor, refreshFileExplorer } from '../../../store'
import { DockSelect } from '../DockSelect'
import { DitherSlider } from '../../dithercn/dither-slider'
import { DockButton, DockDivider } from '../MediaDock'
import { mediaUrl } from '../mediaKind'
import { canEncodeAvif, StudioEncoder } from './encoder'
import {
  FORMATS,
  SCALES,
  formatBytes,
  formatInfo,
  type EncodeOptions,
  type EncodeResult,
  type ExportFormat
} from './formats'

interface StudioBarProps {
  path: string
  natural: { w: number; h: number }
  rotation: number
  isVector: boolean
  /** object URL of the encoded output while "Compare" is on, else null */
  onPreview: (url: string | null) => void
}

const ESTIMATE_DEBOUNCE = 140

/**
 * The studio row that rides above the viewer dock: format, quality, size,
 * flips, live output size and export. Every change re-encodes in a worker
 * (debounced), so the size readout and the Compare preview are the real file.
 */
export const StudioBar: Component<StudioBarProps> = (props) => {
  const encoder = new StudioEncoder()
  const [format, setFormat] = createSignal<ExportFormat>('webp')
  const [quality, setQuality] = createSignal(0.86)
  const [lossless, setLossless] = createSignal(false)
  const [dither, setDither] = createSignal(true)
  const [scale, setScale] = createSignal(1)
  const [flipH, setFlipH] = createSignal(false)
  const [flipV, setFlipV] = createSignal(false)
  const [compare, setCompare] = createSignal(false)
  const [avif, setAvif] = createSignal(false)
  const [ready, setReady] = createSignal(false)
  const [busy, setBusy] = createSignal(false)
  const [result, setResult] = createSignal<{ key: string; value: EncodeResult } | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  const [originalSize, setOriginalSize] = createSignal<number | null>(null)
  const [saved, setSaved] = createSignal<string | null>(null)
  const [exporting, setExporting] = createSignal(false)

  const info = () => formatInfo(format())
  const options = createMemo<EncodeOptions>(() => ({
    format: format(),
    quality: quality(),
    lossless: lossless(),
    dither: dither(),
    scale: scale(),
    rotation: props.rotation,
    flipH: flipH(),
    flipV: flipV()
  }))
  const optionsKey = createMemo(() => JSON.stringify(options()))

  // ── Source: decode once (raster) or re-rasterise at the export size (SVG) ──
  // Own decode of the original — independent of what the stage is showing.
  let sourceImg: HTMLImageElement | null = null
  const loadSource = async (): Promise<void> => {
    try {
      if (!sourceImg) {
        sourceImg = new Image()
        sourceImg.crossOrigin = 'anonymous'
        sourceImg.src = mediaUrl(props.path)
        await sourceImg.decode()
      }
      const img = sourceImg
      const k = props.isVector ? Math.max(1, scale()) : 1
      const bitmap = props.isVector
        ? await createImageBitmap(img, {
            resizeWidth: Math.round(props.natural.w * k),
            resizeHeight: Math.round(props.natural.h * k),
            resizeQuality: 'high'
          })
        : await createImageBitmap(img)
      encoder.load(bitmap)
      setReady(true)
    } catch {
      setError('Couldn’t read this image')
    }
  }

  onMount(() => {
    void loadSource()
    void canEncodeAvif().then(setAvif)
    // Original size via a 1-byte range request (Content-Range carries the total).
    void fetch(mediaUrl(props.path), { headers: { Range: 'bytes=0-0' } })
      .then((r) => {
        const total = r.headers.get('content-range')?.split('/')[1]
        setOriginalSize(total ? Number(total) : null)
        return r.body?.cancel()
      })
      .catch(() => setOriginalSize(null))
  })
  // SVG: a bigger export needs a sharper raster, not an upscaled one.
  createEffect(on(scale, () => props.isVector && void loadSource(), { defer: true }))

  // ── Live encode (debounced) ────────────────────────────────────────────
  let timer: number | undefined
  createEffect(
    on([optionsKey, ready], () => {
      if (!ready()) return
      setSaved(null)
      window.clearTimeout(timer)
      setBusy(true)
      const key = optionsKey()
      timer = window.setTimeout(() => {
        encoder
          .encode(options())
          .then((value) => {
            setResult({ key, value })
            setError(null)
            setBusy(false)
          })
          .catch((e: Error) => {
            if (e.message === 'superseded') return
            setError(e.message)
            setBusy(false)
          })
      }, ESTIMATE_DEBOUNCE)
    })
  )

  // ── Compare: show the encoded file in the stage ─────────────────────────
  let previewUrl: string | null = null
  createEffect(() => {
    const r = result()
    const on = compare()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    previewUrl =
      on && r
        ? URL.createObjectURL(new Blob([r.value.bytes as BlobPart], { type: r.value.mime }))
        : null
    props.onPreview(previewUrl)
  })

  onCleanup(() => {
    window.clearTimeout(timer)
    encoder.dispose()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    props.onPreview(null)
  })

  // ── Export ─────────────────────────────────────────────────────────────
  const stem = (): string => {
    const name = props.path.slice(props.path.lastIndexOf('/') + 1)
    const dot = name.lastIndexOf('.')
    const base = dot > 0 ? name.slice(0, dot) : name
    const r = result()?.value
    return scale() !== 1 && r && format() !== 'ico' ? `${base}-${r.width}x${r.height}` : base
  }
  const doExport = async (): Promise<void> => {
    if (exporting()) return
    setExporting(true)
    try {
      let r = result()
      if (!r || r.key !== optionsKey()) {
        const key = optionsKey()
        r = { key, value: await encoder.encode(options()) }
        setResult(r)
      }
      const target = await window.api.exportImage(props.path, stem(), format(), r.value.bytes)
      setSaved(target)
      refreshFileExplorer()
    } catch (e) {
      setError((e as Error).message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  // ── Readouts ───────────────────────────────────────────────────────────
  const sizeLabel = () => {
    const r = result()?.value
    return r ? formatBytes(r.bytes.byteLength) : '—'
  }
  const delta = () => {
    const r = result()?.value
    const o = originalSize()
    if (!r || !o) return null
    const d = Math.round((r.bytes.byteLength / o - 1) * 100)
    return d === 0 ? '±0%' : `${d > 0 ? '+' : '−'}${Math.abs(d)}%`
  }
  const outDims = () => {
    const turned = props.rotation % 180 !== 0
    const w = Math.round(props.natural.w * scale())
    const h = Math.round(props.natural.h * scale())
    return turned ? `${h}×${w}` : `${w}×${h}`
  }
  const savedName = () => saved()?.slice(saved()!.lastIndexOf('/') + 1)

  return (
    <div class="studio-bar flex items-center gap-0.5">
      <DockSelect
        title="Format"
        value={format()}
        onChange={(v) => setFormat(v)}
        menuWidth={232}
        options={FORMATS.map((f) => ({
          value: f.id,
          label: f.label,
          hint: f.id === 'avif' && !avif() ? 'Not supported here' : f.hint,
          disabled: f.id === 'avif' && !avif()
        }))}
        trigger={<span class="text-white/90 font-medium">{info().label}</span>}
      />

      <Show when={info().lossy && !(format() === 'webp' && lossless())}>
        <div class="studio-control flex items-center gap-2.5 h-8 pl-2 pr-1.5" title="Quality">
          <span class="text-[11px] text-white/35">Quality</span>
          <DitherSlider
            variant="bar"
            size="sm"
            color="ink"
            label="Quality"
            hideLabel
            min={30}
            max={100}
            step={1}
            value={Math.round(quality() * 100)}
            onValueChange={(v) => setQuality(v[0] / 100)}
            class="w-24"
          />
          <span class="w-6 text-right text-[12px] tabular-nums text-white/75">
            {Math.round(quality() * 100)}
          </span>
        </div>
      </Show>
      <Show when={format() === 'webp'}>
        <DockButton
          title="Lossless WebP"
          active={lossless()}
          onClick={() => setLossless((v) => !v)}
        >
          Lossless
        </DockButton>
      </Show>
      <Show when={format() === 'gif'}>
        <DockButton title="Dither gradients" active={dither()} onClick={() => setDither((v) => !v)}>
          Dither
        </DockButton>
      </Show>

      <DockDivider />
      <div class="studio-control flex items-center gap-2.5 h-8 pl-2 pr-1.5" title="Output size">
        <span class="text-[11px] text-white/35">Size</span>
        <DitherSlider
          variant="bar"
          size="sm"
          color="ink"
          label="Output size"
          hideLabel
          ticks
          min={0}
          max={SCALES.length - 1}
          step={1}
          value={Math.max(0, SCALES.indexOf(scale() as (typeof SCALES)[number]))}
          onValueChange={(v) => setScale(SCALES[v[0]] ?? 1)}
          valueText={(i) => `${Math.round((SCALES[i] ?? 1) * 100)}%`}
          class="w-[104px]"
        />
        <span class="min-w-[64px] text-[12px] tabular-nums text-white/75">
          {outDims()}
          <span class="ml-1 text-white/30">{Math.round(scale() * 100)}%</span>
        </span>
      </div>
      <DockButton title="Flip horizontally" active={flipH()} onClick={() => setFlipH((v) => !v)}>
        <svg
          viewBox="0 0 16 16"
          class="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M8 2v12" stroke-dasharray="1.5 1.8" stroke-linecap="round" />
          <path d="M6 4.5 2 12h4zM10 4.5l4 7.5h-4z" />
        </svg>
      </DockButton>
      <DockButton title="Flip vertically" active={flipV()} onClick={() => setFlipV((v) => !v)}>
        <svg
          viewBox="0 0 16 16"
          class="w-3.5 h-3.5 rotate-90"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M8 2v12" stroke-dasharray="1.5 1.8" stroke-linecap="round" />
          <path d="M6 4.5 2 12h4zM10 4.5l4 7.5h-4z" />
        </svg>
      </DockButton>
      <DockButton
        title="Compare: show the exported result"
        active={compare()}
        onClick={() => setCompare((v) => !v)}
      >
        Compare
      </DockButton>

      <DockDivider />
      <div
        class="studio-readout flex flex-col justify-center px-2 min-w-[92px] h-8 leading-tight"
        aria-live="polite"
      >
        <span class="text-[12px] tabular-nums text-white/85" classList={{ 'studio-busy': busy() }}>
          <Show when={!error()} fallback={<span class="text-rose-300/80">{error()}</span>}>
            {sizeLabel()}
            <Show when={delta()}>
              <span class="ml-1.5 text-white/35">{delta()}</span>
            </Show>
          </Show>
        </span>
        <span class="text-[10.5px] text-white/30 truncate max-w-[150px]">
          {result()?.value.note ?? (originalSize() ? `from ${formatBytes(originalSize()!)}` : ' ')}
        </span>
      </div>

      <Show
        when={!saved()}
        fallback={
          <button
            type="button"
            class="studio-export is-saved h-8 px-3 rounded-[10px] flex items-center gap-1.5 text-[12.5px]"
            title="Open the exported file"
            onClick={() => saved() && openFileInEditor(saved()!, savedName()!)}
          >
            <svg
              viewBox="0 0 12 12"
              class="w-3 h-3"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M2.5 6.2 5 8.5l4.5-5" />
            </svg>
            <span class="truncate max-w-[140px]">{savedName()}</span>
          </button>
        }
      >
        <button
          type="button"
          class="studio-export h-8 px-3.5 rounded-[10px] flex items-center gap-1.5 text-[12.5px] font-medium"
          disabled={!ready() || exporting() || Boolean(error())}
          onClick={doExport}
        >
          <Show when={!exporting()} fallback="Saving…">
            Export
          </Show>
        </button>
      </Show>
    </div>
  )
}

export default StudioBar
