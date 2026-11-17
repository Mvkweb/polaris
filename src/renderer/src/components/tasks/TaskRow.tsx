import { Match, Show, Switch, createSignal, onCleanup, type Component } from 'solid-js'
import type { TaskRecord } from '../../types'
import { FileIcon } from '../file-tree/FileIcon'
import { formatBytes } from '../media/studio/formats'
import { uploadFiles } from '../../tasks'
import { Loader } from '../dithercn/loader'
import { mediaKind, mediaUrl } from '../media/mediaKind'

/** Thumbnails only for images small enough to decode cheaply. */
const THUMB_MAX_BYTES = 20 * 1024 * 1024

const host = (url: string): string => {
  try {
    const u = new URL(url)
    return u.host + u.pathname
  } catch {
    return url
  }
}

const relative = (ms: number): string => {
  const d = ms - Date.now()
  const abs = Math.abs(d)
  const unit =
    abs < 3_570_000
      ? [Math.max(1, Math.round(abs / 60_000)), 'min']
      : abs < 86_400_000
        ? [Math.round(abs / 3_600_000), 'h']
        : [Math.round(abs / 86_400_000), 'd']
  return d > 0 ? `${unit[0]} ${unit[1]} left` : `${unit[0]} ${unit[1]} ago`
}

const clock = (ms: number): string =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

/** One task: icon, name, a quiet status line, a hairline progress rail, hover actions. */
export const TaskRow: Component<{ task: TaskRecord }> = (props) => {
  const t = () => props.task
  const [copied, setCopied] = createSignal(false)
  let copyTimer: number | undefined
  onCleanup(() => window.clearTimeout(copyTimer))

  const pct = () => (t().total > 0 ? Math.min(1, t().sent / t().total) : 0)
  const speed = () => {
    const started = t().startedAt
    if (!started) return null
    const s = (Date.now() - started) / 1000
    return s > 0.5 ? t().sent / s : null
  }
  const expired = () => Boolean(t().expiresAt && t().expiresAt! < Date.now())
  const [thumbFailed, setThumbFailed] = createSignal(false)
  const thumb = () =>
    !thumbFailed() && mediaKind(t().filePath) === 'image' && t().total <= THUMB_MAX_BYTES
      ? mediaUrl(t().filePath)
      : null

  const copy = (): void => {
    if (!t().url) return
    void navigator.clipboard.writeText(t().url!)
    setCopied(true)
    window.clearTimeout(copyTimer)
    copyTimer = window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div
      class="task-row group relative flex items-center gap-3 px-2 py-2 rounded-[10px]"
      classList={{ [`is-${t().status}`]: true, 'is-expired': expired() }}
    >
      <div class="task-icon relative w-8 h-8 shrink-0 rounded-[8px] flex items-center justify-center">
        {/* Dithered progress ring around the file while it uploads */}
        <Show when={t().status === 'running' || t().status === 'queued'}>
          <Loader
            class="task-loader"
            variant="ring"
            size="md"
            cell={2}
            progress={t().status === 'running' ? pct() : undefined}
            speed={t().status === 'queued' ? 0.6 : 1}
            label={t().status === 'queued' ? 'Queued' : 'Uploading'}
          />
        </Show>
        <Show
          when={thumb()}
          fallback={<FileIcon name={t().fileName} isDirectory={false} class="w-4 h-4" />}
        >
          {(src) => (
            <img
              src={src()}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              class="task-thumb"
              onError={() => setThumbFailed(true)}
            />
          )}
        </Show>
      </div>

      <div class="min-w-0 flex-1 flex flex-col justify-center">
        <div class="flex items-baseline gap-3 min-w-0">
          <span class="truncate text-[13px] text-white/90">{t().fileName}</span>
          {/* Top-right slot: status/time, swapped for actions on hover */}
          <span class="task-meta relative ml-auto shrink-0 flex items-center justify-end">
            <span class="task-status text-[11px] tabular-nums">
              <Switch>
                <Match when={t().status === 'running'}>{Math.round(pct() * 100)}%</Match>
                <Match when={t().status === 'queued'}>Queued</Match>
                <Match when={t().status === 'done'}>{clock(t().finishedAt ?? t().createdAt)}</Match>
                <Match when={t().status === 'error'}>Failed</Match>
                <Match when={t().status === 'canceled'}>Canceled</Match>
              </Switch>
            </span>
            <span class="task-actions absolute right-0 top-1/2 flex items-center">
              <Switch>
                <Match when={t().status === 'running' || t().status === 'queued'}>
                  <ActionButton title="Cancel" onClick={() => void window.api.cancelTask(t().id)}>
                    <path d="m4.5 4.5 7 7m0-7-7 7" />
                  </ActionButton>
                </Match>
                <Match when={t().status === 'done' && t().url}>
                  <ActionButton title="Copy link" onClick={copy}>
                    <rect x="5.5" y="5.5" width="7.5" height="7.5" rx="1.6" />
                    <path d="M10.5 5.5V4.1A1.6 1.6 0 0 0 8.9 2.5H4.1A1.6 1.6 0 0 0 2.5 4.1v4.8a1.6 1.6 0 0 0 1.6 1.6h1.4" />
                  </ActionButton>
                  <ActionButton
                    title="Open in browser"
                    onClick={() => window.open(t().url, '_blank')}
                  >
                    <path d="M9.5 2.5h4v4M13.5 2.5 8 8M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3" />
                  </ActionButton>
                </Match>
                <Match when={t().status === 'error' || t().status === 'canceled'}>
                  <ActionButton
                    title="Retry"
                    onClick={() => void uploadFiles([t().filePath], t().serviceId)}
                  >
                    <path d="M13 8a5 5 0 1 1-1.6-3.7M13 2.5v2.5h-2.5" />
                  </ActionButton>
                </Match>
              </Switch>
              <Show when={t().status !== 'running' && t().status !== 'queued'}>
                <ActionButton
                  title="Remove from history"
                  onClick={() => void window.api.removeTask(t().id)}
                >
                  <path d="m4.5 4.5 7 7m0-7-7 7" />
                </ActionButton>
              </Show>
            </span>
          </span>
        </div>

        <div class="mt-0.5 flex items-baseline gap-3 min-w-0 text-[11.5px] text-white/40">
          <Switch fallback={<span class="truncate">{t().target}</span>}>
            <Match when={t().status === 'running'}>
              <span class="truncate">
                {formatBytes(t().sent)} of {formatBytes(t().total)}
                <Show when={speed()}> · {formatBytes(speed()!)}/s</Show>
              </span>
            </Match>
            <Match when={t().status === 'done' && t().url}>
              <button
                type="button"
                class="task-link relative min-w-0 flex-1 text-left cursor-pointer"
                classList={{ 'is-copied': copied() }}
                title="Copy link"
                onClick={copy}
              >
                <span class="task-link-url block truncate">{host(t().url!)}</span>
                <span class="task-link-copied absolute inset-0 flex items-center gap-1">
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
                  Copied
                </span>
              </button>
              <Show when={t().expiresAt}>
                <span class="ml-auto shrink-0 text-[11px] text-white/25 tabular-nums">
                  {expired() ? 'expired' : relative(t().expiresAt!)}
                </span>
              </Show>
            </Match>
            <Match when={t().status === 'error'}>
              <span class="truncate text-rose-300/75" title={t().error}>
                {t().error}
              </span>
            </Match>
          </Switch>
        </div>

        <Show when={t().status === 'running' || t().status === 'queued'}>
          <div class="task-rail mt-2 h-[3px] rounded-full overflow-hidden">
            <div class="task-rail-fill h-full rounded-full" style={{ width: `${pct() * 100}%` }} />
          </div>
        </Show>
      </div>
    </div>
  )
}

const ActionButton: Component<{ title: string; onClick: () => void; children: unknown }> = (
  props
) => (
  <button
    type="button"
    title={props.title}
    aria-label={props.title}
    onClick={(e) => {
      e.stopPropagation()
      props.onClick()
    }}
    class="task-action w-5 h-5 rounded-[6px] flex items-center justify-center cursor-pointer"
  >
    <svg
      viewBox="0 0 16 16"
      class="w-3 h-3"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {props.children as never}
    </svg>
  </button>
)

export default TaskRow
