import {
  Component,
  createEffect,
  createSignal,
  on,
  onCleanup,
  onMount,
  Show
} from 'solid-js'
import { storageMapModalState, closeStorageMapModal } from '../../store'
import { Loader } from '../dithercn/loader'
import { StorageMap, type StorageMapItem } from '../dithercn/storage-map'

interface BreakdownData {
  target: string
  capacity_gb: number
  used_gb: number
  free_gb: number
  items: StorageMapItem[]
}

/** How long the loader takes to fade once the scan finishes. */
const LOADER_FADE_MS = 150

/**
 * Dev-only override for trying other fade speeds without editing this
 * file: `window.__polarisLoaderFadeMs = 150` in the devtools console
 * (`delete window.__polarisLoaderFadeMs` to go back to the default).
 */
const loaderFadeMs = (): number => {
  if (!import.meta.env.DEV) return LOADER_FADE_MS
  const custom = (window as unknown as { __polarisLoaderFadeMs?: number })
    .__polarisLoaderFadeMs
  return typeof custom === 'number' && custom >= 0 ? custom : LOADER_FADE_MS
}

export const StorageMapModal: Component = () => {
  const [data, setData] = createSignal<BreakdownData | null>(null)
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const [driveStats, setDriveStats] = createSignal<{
    used: number
    free: number
    capacity: number
  } | null>(null)
  const [popupPos, setPopupPos] = createSignal({ left: 300, top: 120 })
  // The loader stays mounted while it fades out, then unmounts.
  const [loaderMounted, setLoaderMounted] = createSignal(false)
  const [loaderLeaving, setLoaderLeaving] = createSignal(false)

  createEffect(
    on(loading, (isLoading) => {
      if (isLoading) {
        setLoaderMounted(true)
        setLoaderLeaving(false)
        return
      }
      setLoaderLeaving(true)
      const timer = setTimeout(() => {
        setLoaderMounted(false)
        setLoaderLeaving(false)
      }, loaderFadeMs())
      onCleanup(() => clearTimeout(timer))
    })
  )

  let cardRef: HTMLDivElement | undefined

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && storageMapModalState().isOpen) {
      closeStorageMapModal()
    }
  }

  const handlePointerDown = (e: MouseEvent): void => {
    if (!storageMapModalState().isOpen) return
    if (cardRef && !cardRef.contains(e.target as Node)) {
      closeStorageMapModal()
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointerdown', handlePointerDown)
  })

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('pointerdown', handlePointerDown)
  })

  createEffect(() => {
    const state = storageMapModalState()
    if (!state.isOpen) {
      setData(null)
      setError(null)
      setDriveStats(null)
      return
    }

    // Position popover cleanly beside click coordinates without full-screen dimming
    const width = 640
    const height = 440
    const pad = 16

    let left = state.x ? state.x + 12 : 280
    let top = state.y ? state.y - 40 : 140

    if (left + width > window.innerWidth - pad) {
      left = Math.max(pad, (state.x ? state.x - width - 12 : window.innerWidth - width - pad))
    }
    if (top + height > window.innerHeight - pad) {
      top = Math.max(pad, window.innerHeight - height - pad)
    }
    if (top < pad) top = pad

    setPopupPos({ left, top })

    const fetchBreakdown = async (): Promise<void> => {
      setLoading(true)
      setError(null)
      setDriveStats(null)
      // Fetch storage breakdown directly from EmberCore native sidecar

      try {
        const res = await window.api?.getStorageBreakdown?.(state.targetPath)
        if (res && res.items?.length) {
          setData(res)
          return
        }
        setError('Breakdown unavailable')
      } catch (err) {
        console.error('Storage breakdown error:', err)
        setError('Breakdown unavailable')
      } finally {
        setLoading(false)
      }

      // Only when the scan failed: show the real used/free numbers from
      // statfs. Categories are never guessed.
      try {
        const drives = await window.api?.getSystemDrives?.()
        const mountedDrives = (drives ?? []).filter(
          (d) => d.isMounted !== false && Boolean(d.mountPoint)
        )
        const matched =
          mountedDrives.find((d) => d.mountPoint === state.targetPath) ||
          mountedDrives
            .filter((d) => state.targetPath.startsWith(d.mountPoint))
            .sort((a, b) => b.mountPoint.length - a.mountPoint.length)[0]
        if (matched && matched.bytesTotal > 0) {
          const gb = 1024 * 1024 * 1024
          const capacity = matched.bytesTotal / gb
          const free = matched.bytesFree / gb
          setDriveStats({
            used: Math.round(Math.max(0, capacity - free) * 10) / 10,
            free: Math.round(free * 10) / 10,
            capacity: Math.round(capacity * 10) / 10
          })
        }
      } catch (err) {
        console.error('Drive stats error:', err)
      }
    }

    fetchBreakdown()
  })

  return (
    <Show when={storageMapModalState().isOpen}>
      {/* Floating Popup Card - Pure OLED black container showing only the clean dither treemap */}
      <div
        ref={(el) => (cardRef = el)}
        class="fixed z-[130] w-[600px] max-w-[calc(100vw-32px)] bg-[#050506] border-0 shadow-[0_16px_40px_rgba(0,0,0,0.95)] rounded-xl p-2.5 select-none animate-[fadeIn_100ms_ease-out] flex flex-col font-sans"
        style={{
          left: `${popupPos().left}px`,
          top: `${popupPos().top}px`
        }}
      >
        {/* Content: fixed frame so the loader and treemap share one height */}
        <div class="relative h-64 sm:h-72">
          <Show when={!loading() ? data() : null}>
            {(res) => (
              <StorageMap
                target={res().target}
                capacity={res().capacity_gb}
                unit=" GB"
                items={res().items}
                duration={800}
                spotlight="blur"
                blurRadius={2}
                bloom="low"
                animate={true}
                interactive={true}
                header={false}
                footer={false}
                class="border-0 bg-transparent p-0 shadow-none"
              />
            )}
          </Show>

          {/* Honest failure state: real used/free only, no guessed categories */}
          <Show when={!loading() && error()}>
            <div class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <span class="text-sm text-white/90">{error()}</span>
              <Show when={driveStats()}>
                {(stats) => (
                  <div class="w-full max-w-[280px]">
                    <div class="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        class="h-full bg-sky-400"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (stats().used / Math.max(1, stats().capacity)) * 100
                            )
                          )}%`
                        }}
                      />
                    </div>
                    <div class="mt-1.5 font-mono text-[11px] text-white/50">
                      {stats().used} GB used · {stats().free} GB free
                    </div>
                  </div>
                )}
              </Show>
              <span class="text-[11px] text-white/35">
                The scan failed or returned no data. Nothing is guessed.
              </span>
            </div>
          </Show>

          <Show when={loaderMounted()}>
            <div
              class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#050506] transition-opacity ease-out motion-reduce:transition-none"
              style={{
                opacity: loaderLeaving() ? 0 : 1,
                'transition-duration': `${loaderFadeMs()}ms`,
                'pointer-events': loaderLeaving() ? 'none' : 'auto'
              }}
            >
              <Loader
                variant="pulse"
                size="lg"
                color="blue"
                bloom="low"
                label="Scanning filesystem"
              />
              <span class="mt-3 text-sm font-medium text-white/90">Scanning filesystem</span>
              <span class="mt-1 text-xs text-white/40">Mapping storage allocations</span>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  )
}
