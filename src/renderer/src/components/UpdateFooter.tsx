import { For, Show, createSignal, onCleanup, type Component, type JSX } from 'solid-js'
import { Portal } from 'solid-js/web'
import { Aurora } from './dithercn/aurora'
import { Loader } from './dithercn/loader'
import { DitherButton } from './dithercn/dither-button'
import { DirtyMark } from './ui/DirtyMark'
import { UiIcon } from './ui/AppIcons'
import { updateTrack } from '../store'
import { checkNow, restartToUpdate, runUpdate, timeAgo, updateInfo } from '../updates'
import './update-footer.css'

const STATUS_LABEL = {
  restart: 'Restart to update',
  available: 'Update available',
  checking: 'Checking…',
  latest: 'Up to date',
  unknown: 'Couldn’t check for updates',
  none: 'Polaris'
} as const

const OPEN_DELAY = 140
const CLOSE_DELAY = 220

/**
 * Sidebar footer: a contained status row (update available / up to date /
 * checking) with the real version. Hovering raises a black card with a still
 * aurora that comes alive, plus the git story: how far behind, the newest
 * commits, and what you're on now.
 */
export const UpdateFooter: Component = () => {
  let row: HTMLDivElement | undefined
  const [open, setOpen] = createSignal(false)
  const [anchor, setAnchor] = createSignal<DOMRect | null>(null)
  let timer: number | undefined

  const show = (): void => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      if (row) setAnchor(row.getBoundingClientRect())
      setOpen(true)
    }, OPEN_DELAY)
  }
  const hide = (): void => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => setOpen(false), CLOSE_DELAY)
  }
  onCleanup(() => window.clearTimeout(timer))

  const info = updateInfo
  const status = (): keyof typeof STATUS_LABEL => {
    const i = info()
    if (!i) return 'checking'
    if (i.restartReady) return 'restart'
    if (i.available) return 'available'
    if (i.checking && !i.checkedAt) return 'checking'
    if (i.source === 'none') return 'none'
    // Never claim "up to date" when the remote couldn't be reached.
    return i.error ? 'unknown' : 'latest'
  }

  const cardStyle = (): JSX.CSSProperties => {
    const r = anchor()!
    return {
      left: `${r.left}px`,
      bottom: `${innerHeight - r.top + 8}px`,
      width: '320px'
    }
  }

  return (
    <div class="shrink-0 px-2.5 pb-2.5 pt-1.5 mt-auto">
      <div
        ref={row}
        class="update-row"
        classList={{
          'is-available': status() === 'available' || status() === 'restart',
          'is-open': open()
        }}
        onPointerEnter={show}
        onPointerLeave={hide}
        tabIndex={0}
        onFocus={show}
        onBlur={hide}
      >
        <span class="flex items-center gap-2 min-w-0">
          {/* Channel glyph (moon = Nightly, sun = Stable); a dithered badge
              sits on its corner when an update is waiting. */}
          <Show
            when={status() !== 'checking'}
            fallback={<Loader variant="ring" height={14} cell={1} label="Checking for updates" />}
          >
            <span class="update-channel" title={`${updateTrack()} channel`}>
              <UiIcon name={updateTrack() === 'Nightly' ? 'nightly' : 'stable'} size={14} />
              <Show when={status() === 'available' || status() === 'restart'}>
                <DirtyMark class="update-badge" title="Update available" />
              </Show>
            </span>
          </Show>
          <span class="truncate">{STATUS_LABEL[status()]}</span>
        </span>
        <span class="update-version">v{info()?.version ?? '…'}</span>
      </div>

      <Show when={open() && anchor()}>
        <Portal>
          <div
            class="update-card fixed z-[70]"
            style={cardStyle()}
            onPointerEnter={() => window.clearTimeout(timer)}
            onPointerLeave={hide}
            role="dialog"
            aria-label="Updates"
          >
            <div class="update-aurora" aria-hidden="true">
              <Aurora
                class="size-full"
                color="ink"
                tipColor="ink"
                background="transparent"
                curtains={3}
                height={0.55}
                spread={0.14}
                direction="down"
                intensity={0.9}
                glow={0.9}
                rays={9}
                sway={1}
                drift={0.25}
                shimmer={0.3}
                matrix="bayer8"
                cell={2}
              />
            </div>

            <div class="relative px-4 pt-[58px] pb-4">
              <div class="flex items-baseline gap-2">
                <span class="text-[15px] font-medium text-white">
                  {info()?.restartReady
                    ? 'Update installed'
                    : info()?.available
                      ? 'Update available'
                      : info()?.error
                        ? 'Couldn’t check for updates'
                        : 'You’re up to date'}
                </span>
                <Show when={info()?.available && info()!.behind > 0}>
                  <span class="text-[12px] text-white/45 tabular-nums">
                    {info()!.behind} new {info()!.behind === 1 ? 'commit' : 'commits'}
                  </span>
                </Show>
              </div>
              <div class="mt-0.5 text-[12px] text-white/40">
                <Show
                  when={info()?.source !== 'none'}
                  fallback="Updates will arrive through paru once packaged."
                >
                  on <span class="text-white/60">{info()?.branch}</span>
                  <Show when={info()?.checkedAt}> · checked {timeAgo(info()!.checkedAt!)}</Show>
                </Show>
              </div>

              <Show when={info()?.commits.length}>
                <div class="update-commits">
                  <For each={info()!.commits.slice(0, 5)}>
                    {(c, i) => (
                      <div class="update-commit" style={{ '--i': i() }}>
                        <span class="update-hash">{c.hash}</span>
                        <span class="truncate text-white/80">{c.subject}</span>
                        <span class="ml-auto shrink-0 text-white/30 tabular-nums">
                          {timeAgo(c.date)}
                        </span>
                      </div>
                    )}
                  </For>
                  <Show when={info()!.behind > 5}>
                    <div class="pl-[52px] pt-0.5 text-[11.5px] text-white/30">
                      and {info()!.behind - 5} more
                    </div>
                  </Show>
                </div>
              </Show>

              <Show when={info()?.current}>
                {(cur) => (
                  <div class="update-current">
                    <span class="shrink-0 whitespace-nowrap text-white/35">You’re on</span>
                    <span class="update-hash">{cur().hash}</span>
                    <span class="truncate text-white/55">{cur().subject}</span>
                  </div>
                )}
              </Show>

              <Show when={info()?.error}>
                <div class="mt-2 text-[11.5px] text-amber-300/80 truncate" title={info()!.error!}>
                  Couldn’t reach the remote — showing the last known state
                </div>
              </Show>

              <Show when={info()?.restartReady}>
                <div class="mt-2 text-[11.5px] text-white/45">
                  The new version is installed. Restart Polaris to use it.
                </div>
              </Show>

              <div class="mt-3 flex flex-wrap items-center gap-2">
                <Show
                  when={info()?.restartReady}
                  fallback={
                    <Show when={info()?.available && info()?.updateCommand}>
                      <DitherButton
                        size="sm"
                        color="ink"
                        onClick={() => {
                          runUpdate()
                          setOpen(false)
                        }}
                      >
                        Update now
                      </DitherButton>
                    </Show>
                  }
                >
                  <DitherButton size="sm" color="ink" onClick={restartToUpdate}>
                    Restart now
                  </DitherButton>
                </Show>
                <DitherButton
                  size="sm"
                  variant="outline"
                  color="ink"
                  onClick={checkNow}
                  disabled={info()?.checking}
                >
                  {info()?.checking ? 'Checking…' : 'Check now'}
                </DitherButton>
                <Show when={info()?.compareUrl}>
                  <DitherButton
                    size="sm"
                    variant="outline"
                    color="ink"
                    onClick={() => window.open(info()!.compareUrl!, '_blank')}
                  >
                    View changes
                  </DitherButton>
                </Show>
              </div>
            </div>
          </div>
        </Portal>
      </Show>
    </div>
  )
}

export default UpdateFooter
