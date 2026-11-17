import { Show, createEffect, createSignal, on, onCleanup, onMount, type Component } from 'solid-js'
import { DockButton, DockDivider, DockGrip, DockSegments, MediaDock, MorphBox } from './MediaDock'
import { CheckerIcon, CodeIcon, MinusIcon, PlusIcon, RotateIcon, StudioIcon } from './icons'
import { StudioBar } from './studio/StudioBar'
import { mediaUrl } from './mediaKind'
import { isTypingTarget } from './keys'

const MIN_ZOOM = 0.02
const MAX_ZOOM = 32
const PAD = 56 // breathing room around a fitted image (dock lives in the bottom pad)
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

interface ImageViewerProps {
  path: string
  onInfo: (info: string | null) => void
  onViewSource?: () => void
}

/**
 * Pan/zoom image viewer. Wheel zooms around the cursor, drag pans, double-click
 * toggles fit ↔ 100% at the clicked point. All motion is a single transform on
 * one element, so it stays on the compositor.
 */
export const ImageViewer: Component<ImageViewerProps> = (props) => {
  let stage: HTMLDivElement | undefined
  const [natural, setNatural] = createSignal<{ w: number; h: number } | null>(null)
  const [scale, setScale] = createSignal(1)
  const [pos, setPos] = createSignal({ x: 0, y: 0 })
  const [rotation, setRotation] = createSignal(0)
  const [mode, setMode] = createSignal<'fit' | 'actual' | null>('fit')
  const [instant, setInstant] = createSignal(false) // disable easing while dragging/wheeling
  const [checker, setChecker] = createSignal(true)
  const [failed, setFailed] = createSignal(false)
  const [grabbing, setGrabbing] = createSignal(false)
  // Studio: export/convert row that unfolds above the dock
  const [studio, setStudio] = createSignal(false)
  const [studioMounted, setStudioMounted] = createSignal(false)
  const [previewUrl, setPreviewUrl] = createSignal<string | null>(null)
  const [sourceSize, setSourceSize] = createSignal<{ w: number; h: number } | null>(null)
  let unmountTimer: number | undefined
  const toggleStudio = (): void => {
    const next = !studio()
    window.clearTimeout(unmountTimer)
    if (next) setStudioMounted(true)
    else unmountTimer = window.setTimeout(() => setStudioMounted(false), 170)
    setStudio(next)
  }
  onCleanup(() => window.clearTimeout(unmountTimer))

  const rotated = () => rotation() % 180 !== 0
  const fitScale = (): number => {
    const n = natural()
    if (!n || !stage) return 1
    const w = rotated() ? n.h : n.w
    const h = rotated() ? n.w : n.h
    const sw = Math.max(1, stage.clientWidth - PAD * 2)
    const sh = Math.max(1, stage.clientHeight - PAD * 2 - 24)
    return Math.min(1, sw / w, sh / h)
  }

  const applyFit = (): void => {
    setMode('fit')
    setScale(fitScale())
    setPos({ x: 0, y: -12 })
  }
  const applyActual = (anchor?: { x: number; y: number }): void => {
    zoomTo(1, anchor)
    setMode('actual')
  }

  /** Zoom keeping the stage point `anchor` (relative to stage centre) fixed on screen. */
  const zoomTo = (next: number, anchor = { x: 0, y: 0 }): void => {
    const s = scale()
    const n = clamp(next, MIN_ZOOM, MAX_ZOOM)
    const k = n / s
    const p = pos()
    setPos({ x: anchor.x - (anchor.x - p.x) * k, y: anchor.y - (anchor.y - p.y) * k })
    setScale(n)
    setMode(Math.abs(n - 1) < 1e-3 ? 'actual' : null)
  }
  const stagePoint = (e: { clientX: number; clientY: number }): { x: number; y: number } => {
    const r = stage!.getBoundingClientRect()
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 }
  }

  // ── Input ──────────────────────────────────────────────────────────────
  let wheelTimer: number | undefined
  const onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    setInstant(true)
    window.clearTimeout(wheelTimer)
    wheelTimer = window.setTimeout(() => setInstant(false), 120)
    // Trackpad pinch arrives as ctrl+wheel with small deltas; mice send ~100.
    const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018))
    zoomTo(scale() * factor, stagePoint(e))
  }

  let drag: { id: number; x: number; y: number; px: number; py: number } | null = null
  const onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, px: pos().x, py: pos().y }
    stage!.setPointerCapture(e.pointerId)
    setInstant(true)
    setGrabbing(true)
  }
  const onPointerMove = (e: PointerEvent): void => {
    if (!drag || drag.id !== e.pointerId) return
    setPos({ x: drag.px + e.clientX - drag.x, y: drag.py + e.clientY - drag.y })
    if (mode() === 'fit') setMode(null)
  }
  const endDrag = (): void => {
    drag = null
    setGrabbing(false)
    setInstant(false)
  }
  const onDblClick = (e: MouseEvent): void => {
    if (mode() === 'fit') applyActual(stagePoint(e))
    else applyFit()
  }

  const onKey = (e: KeyboardEvent): void => {
    if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
    const k = e.key
    if (k === '+' || k === '=') zoomTo(scale() * 1.25)
    else if (k === '-' || k === '_') zoomTo(scale() / 1.25)
    else if (k === '0') applyFit()
    else if (k === '1') applyActual()
    else if (k === 'r' || k === 'R') rotate()
    else if (k === 'e' || k === 'E') toggleStudio()
    else return
    e.preventDefault()
  }

  const rotate = (): void => {
    setRotation((r) => r + 90)
    if (mode() === 'fit') queueMicrotask(applyFit)
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────
  onMount(() => {
    const ro = new ResizeObserver(() => {
      if (mode() === 'fit') {
        setInstant(true)
        applyFit()
        requestAnimationFrame(() => setInstant(false))
      }
    })
    ro.observe(stage!)
    window.addEventListener('keydown', onKey)
    onCleanup(() => {
      ro.disconnect()
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(wheelTimer)
    })
  })

  createEffect(
    on(
      () => props.path,
      () => {
        setNatural(null)
        setSourceSize(null)
        setStudio(false)
        setStudioMounted(false)
        setPreviewUrl(null)
        setFailed(false)
        setRotation(0)
        props.onInfo(null)
      }
    )
  )

  const onLoad = (e: Event): void => {
    const img = e.currentTarget as HTMLImageElement
    // SVGs without intrinsic size report 0 — give them a sensible canvas.
    const w = img.naturalWidth || 512
    const h = img.naturalHeight || 512
    const wasShowing = natural()
    setNatural({ w, h })
    // Compare previews swap the src; only the original defines the source size.
    if (!previewUrl()) {
      setSourceSize({ w, h })
      props.onInfo(`${w} × ${h}`)
    }
    if (!wasShowing || mode() === 'fit') {
      setInstant(true)
      applyFit()
      requestAnimationFrame(() => setInstant(false))
    }
  }

  const zoomLabel = () => `${Math.round(scale() * 100)}%`

  return (
    <div
      ref={stage}
      class="media-stage relative w-full h-full overflow-hidden select-none"
      classList={{ 'is-grabbing': grabbing() }}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDblClick={onDblClick}
    >
      <Show
        when={!failed()}
        fallback={
          <div class="absolute inset-0 flex items-center justify-center text-[13px] text-white/40">
            This image couldn’t be decoded.
          </div>
        }
      >
        <div
          class="media-image-frame absolute left-1/2 top-1/2"
          classList={{
            'is-instant': instant(),
            'is-ready': natural() !== null,
            'has-checker': checker()
          }}
          style={{
            width: `${natural()?.w ?? 0}px`,
            height: `${natural()?.h ?? 0}px`,
            transform: `translate(-50%, -50%) translate(${pos().x}px, ${pos().y}px) rotate(${rotation()}deg) scale(${scale()})`
          }}
        >
          <img
            src={previewUrl() ?? mediaUrl(props.path)}
            alt=""
            draggable={false}
            onLoad={onLoad}
            onError={() => setFailed(true)}
            class="block w-full h-full"
            style={{ 'image-rendering': scale() >= 3 ? 'pixelated' : 'auto' }}
          />
        </div>
      </Show>

      <div class="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none">
        <MediaDock>
          <MorphBox>
            <div class="flex flex-col items-center">
              <Show when={studioMounted() && sourceSize()}>
                <div
                  class="studio-row"
                  classList={{ 'is-open': studio(), 'is-closing': !studio() }}
                >
                  <StudioBar
                    path={props.path}
                    natural={sourceSize()!}
                    rotation={rotation()}
                    isVector={props.path.toLowerCase().endsWith('.svg')}
                    onPreview={setPreviewUrl}
                  />
                </div>
              </Show>
              <div class="flex items-center gap-0.5">
                <DockGrip />
                <DockSegments
                  value={mode()}
                  onChange={(v) => (v === 'fit' ? applyFit() : applyActual())}
                  options={[
                    { value: 'fit', label: 'Fit', title: 'Fit to view (0)' },
                    { value: 'actual', label: '100%', title: 'Actual size (1)' }
                  ]}
                />
                <DockDivider />
                <DockButton title="Zoom out (−)" onClick={() => zoomTo(scale() / 1.25)}>
                  <MinusIcon class="w-3.5 h-3.5" />
                </DockButton>
                <span class="w-12 text-center text-[12px] tabular-nums text-white/55">
                  {zoomLabel()}
                </span>
                <DockButton title="Zoom in (+)" onClick={() => zoomTo(scale() * 1.25)}>
                  <PlusIcon class="w-3.5 h-3.5" />
                </DockButton>
                <DockDivider />
                <DockButton title="Rotate (R)" onClick={rotate}>
                  <RotateIcon class="w-3.5 h-3.5" />
                </DockButton>
                <DockButton
                  title="Transparency grid"
                  active={checker()}
                  onClick={() => setChecker((v) => !v)}
                >
                  <CheckerIcon class="w-3.5 h-3.5" />
                </DockButton>
                <Show when={props.onViewSource}>
                  <DockButton title="Edit source" onClick={() => props.onViewSource?.()}>
                    <CodeIcon class="w-3.5 h-3.5" />
                  </DockButton>
                </Show>
                <DockDivider />
                <DockButton
                  title="Studio: convert & export (E)"
                  active={studio()}
                  onClick={toggleStudio}
                >
                  <StudioIcon class="w-3.5 h-3.5" />
                  <span>Studio</span>
                </DockButton>
              </div>
            </div>
          </MorphBox>
        </MediaDock>
      </div>
    </div>
  )
}

export default ImageViewer
