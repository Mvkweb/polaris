import { Show, createEffect, createSignal, on, onCleanup, onMount, type Component } from 'solid-js'
import { DockButton, DockDivider, DockGrip, MediaDock } from './MediaDock'
import { Scrubber } from './Scrubber'
import { ExpandIcon, LoopIcon, PauseIcon, PlayIcon, VolumeIcon } from './icons'
import { formatTime, mediaUrl } from './mediaKind'
import { isTypingTarget } from './keys'

const SPEEDS = [0.5, 1, 1.25, 1.5, 2] as const
const IDLE_MS = 2200

interface MediaPlayerProps {
  path: string
  kind: 'video' | 'audio'
  onInfo: (info: string | null) => void
}

/** Video and audio share one player: same element API, same dock. */
export const MediaPlayer: Component<MediaPlayerProps> = (props) => {
  let stage: HTMLDivElement | undefined
  let el: HTMLMediaElement | undefined
  const [playing, setPlaying] = createSignal(false)
  const [current, setCurrent] = createSignal(0)
  const [duration, setDuration] = createSignal(0)
  const [buffered, setBuffered] = createSignal(0)
  const [volume, setVolume] = createSignal(1)
  const [muted, setMuted] = createSignal(false)
  const [speed, setSpeed] = createSignal(1)
  const [loop, setLoop] = createSignal(false)
  const [idle, setIdle] = createSignal(false)
  const [failed, setFailed] = createSignal(false)

  const fileName = () => props.path.slice(props.path.lastIndexOf('/') + 1)

  // ── Element sync ───────────────────────────────────────────────────────
  const toggle = (): void => {
    if (!el) return
    if (el.paused || el.ended) void el.play().catch(() => setFailed(true))
    else el.pause()
  }
  const seek = (t: number): void => {
    if (!el || !duration()) return
    el.currentTime = Math.min(duration(), Math.max(0, t))
    setCurrent(el.currentTime)
  }
  const setVol = (v: number): void => {
    if (!el) return
    el.volume = Math.min(1, Math.max(0, v))
    el.muted = el.volume === 0
  }
  const cycleSpeed = (): void => {
    const i = SPEEDS.indexOf(speed() as (typeof SPEEDS)[number])
    const next = SPEEDS[(i + 1) % SPEEDS.length]
    if (el) el.playbackRate = next
    setSpeed(next)
  }
  const fullscreen = (): void => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void stage?.requestFullscreen()
  }

  const bind = (media: HTMLMediaElement): void => {
    el = media
    media.ontimeupdate = () => setCurrent(media.currentTime)
    media.ondurationchange = () => setDuration(media.duration || 0)
    media.onplay = () => setPlaying(true)
    media.onpause = () => setPlaying(false)
    media.onended = () => setPlaying(false)
    media.onerror = () => setFailed(true)
    media.onvolumechange = () => {
      setVolume(media.volume)
      setMuted(media.muted)
    }
    media.onprogress = () => {
      const b = media.buffered
      setBuffered(b.length ? b.end(b.length - 1) : 0)
    }
    media.onloadedmetadata = () => {
      setDuration(media.duration || 0)
      const v = media as HTMLVideoElement
      const len = formatTime(media.duration)
      props.onInfo(
        props.kind === 'video' && v.videoWidth ? `${v.videoWidth} × ${v.videoHeight} · ${len}` : len
      )
    }
  }

  createEffect(
    on(
      () => props.path,
      () => {
        setFailed(false)
        setCurrent(0)
        setDuration(0)
        setBuffered(0)
        props.onInfo(null)
      }
    )
  )
  createEffect(() => {
    if (el) el.loop = loop()
  })

  // ── Auto-hide the dock while a video plays and the pointer rests ───────
  let idleTimer: number | undefined
  const wake = (): void => {
    setIdle(false)
    window.clearTimeout(idleTimer)
    idleTimer = window.setTimeout(() => setIdle(true), IDLE_MS)
  }
  const dockHidden = () => props.kind === 'video' && playing() && idle()

  // ── Keys (capture phase: Space here means play, not the global inspector) ─
  const onKey = (e: KeyboardEvent): void => {
    if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
    const handled = (() => {
      switch (e.key) {
        case ' ':
        case 'k':
          toggle()
          return true
        case 'ArrowLeft':
          seek(current() - 5)
          return true
        case 'ArrowRight':
          seek(current() + 5)
          return true
        case 'ArrowUp':
          setVol(volume() + 0.1)
          return true
        case 'ArrowDown':
          setVol(volume() - 0.1)
          return true
        case 'm':
          if (el) el.muted = !el.muted
          return true
        case 'l':
          setLoop((v) => !v)
          return true
        case 'f':
          if (props.kind === 'video') fullscreen()
          return props.kind === 'video'
        default:
          return false
      }
    })()
    if (!handled) return
    e.preventDefault()
    e.stopImmediatePropagation()
    wake()
  }

  onMount(() => {
    window.addEventListener('keydown', onKey, true)
    onCleanup(() => {
      window.removeEventListener('keydown', onKey, true)
      window.clearTimeout(idleTimer)
      el?.pause()
    })
  })

  return (
    <div
      ref={stage}
      class="media-stage relative w-full h-full overflow-hidden select-none"
      classList={{ 'is-idle': dockHidden() }}
      onPointerMove={wake}
      onPointerDown={wake}
    >
      <Show
        when={props.kind === 'video'}
        fallback={
          <div class="absolute inset-0 flex flex-col items-center justify-center gap-6 pb-16">
            <div class="media-disc" classList={{ 'is-playing': playing() }} onClick={toggle}>
              <span class="media-disc-core" />
            </div>
            <div class="flex flex-col items-center gap-1 max-w-[70%]">
              <span class="text-[15px] font-medium text-white/90 truncate max-w-full">
                {fileName()}
              </span>
              <span class="text-[12px] text-white/35 tabular-nums">{formatTime(duration())}</span>
            </div>
            <audio ref={bind} src={mediaUrl(props.path)} preload="metadata" />
          </div>
        }
      >
        <video
          ref={bind}
          src={mediaUrl(props.path)}
          preload="metadata"
          playsinline
          class="media-video absolute inset-0 m-auto max-w-[calc(100%-48px)] max-h-[calc(100%-104px)] -translate-y-6 rounded-xl"
          onClick={toggle}
          onDblClick={fullscreen}
        />
        <button
          type="button"
          aria-label="Play"
          class="media-big-play absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[calc(50%+24px)] w-16 h-16 rounded-full flex items-center justify-center"
          classList={{ 'is-shown': !playing() && !failed() }}
          onClick={toggle}
        >
          <PlayIcon class="w-6 h-6 translate-x-[1px]" />
        </button>
      </Show>

      <Show when={failed()}>
        <div class="absolute inset-x-0 top-1/3 text-center text-[13px] text-white/40">
          This format can’t be played here.
        </div>
      </Show>

      <div class="absolute inset-x-0 bottom-4 flex justify-center px-6 pointer-events-none">
        <MediaDock hidden={dockHidden()} class="w-full max-w-[720px]">
          <DockGrip />
          <DockButton title={playing() ? 'Pause (Space)' : 'Play (Space)'} onClick={toggle}>
            <Show when={playing()} fallback={<PlayIcon class="w-3.5 h-3.5" />}>
              <PauseIcon class="w-3.5 h-3.5" />
            </Show>
          </DockButton>
          <span class="pl-1 pr-2.5 text-[12px] tabular-nums text-white/70 shrink-0">
            {formatTime(current())}
          </span>
          <Scrubber current={current()} duration={duration()} buffered={buffered()} onSeek={seek} />
          <span class="pl-2.5 pr-1 text-[12px] tabular-nums text-white/35 shrink-0">
            {formatTime(duration())}
          </span>
          <DockDivider />
          <div class="media-volume group/vol flex items-center">
            <DockButton
              title={muted() ? 'Unmute (M)' : 'Mute (M)'}
              onClick={() => el && (el.muted = !el.muted)}
            >
              <VolumeIcon class="w-4 h-4" level={volume()} muted={muted()} />
            </DockButton>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={muted() ? 0 : volume()}
              onInput={(e) => setVol(Number(e.currentTarget.value))}
              aria-label="Volume"
              class="media-volume-range"
              style={{ '--v': `${(muted() ? 0 : volume()) * 100}%` }}
            />
          </div>
          <DockButton title="Playback speed" onClick={cycleSpeed} class="w-12 tabular-nums">
            <span classList={{ 'text-white': speed() !== 1 }}>{speed()}×</span>
          </DockButton>
          <DockButton title="Loop (L)" active={loop()} onClick={() => setLoop((v) => !v)}>
            <LoopIcon class="w-3.5 h-3.5" />
          </DockButton>
          <Show when={props.kind === 'video'}>
            <DockButton title="Fullscreen (F)" onClick={fullscreen}>
              <ExpandIcon class="w-3.5 h-3.5" />
            </DockButton>
          </Show>
        </MediaDock>
      </div>
    </div>
  )
}

export default MediaPlayer
