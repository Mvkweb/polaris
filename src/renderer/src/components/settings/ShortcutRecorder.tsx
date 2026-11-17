import {
  For,
  Show,
  createEffect,
  createSignal,
  on,
  onCleanup,
  onMount,
  type Component
} from 'solid-js'
import { Loader } from '../dithercn/loader'
import { fillStyle } from '../../lib/dither'
import {
  canonicalCombo,
  eventKeyName,
  eventModifiers,
  findShortcutUsing,
  getShortcutKeys,
  isShortcutModified,
  resetShortcut,
  shortcutKeys,
  updateShortcut
} from '../../shortcuts'

/** Holding modifiers alone this long records a modifier-only chord. */
const HOLD_MS = 900
/** A conflicting combo pressed again within this window confirms the swap. */
const SWAP_MS = 2500

/** Letters/digits/punctuation without Ctrl/Alt/⌘ would hijack typing. */
const breaksTyping = (keys: string[]): boolean => {
  const hasCommand = keys.some((k) => k === 'Mod' || k === 'Ctrl' || k === 'Alt')
  const key = keys.find((k) => !['Mod', 'Ctrl', 'Alt', 'Shift'].includes(k))
  return !hasCommand && !!key && key.length === 1
}

type Phase = 'idle' | 'recording' | 'saved'

/**
 * Click-to-record keycaps. While recording:
 * - held modifiers appear live but never confirm on their own;
 * - a normal key confirms the combo immediately;
 * - holding modifiers alone fills a ring and confirms after HOLD_MS;
 * - Esc cancels; clicking away cancels;
 * - a combo used elsewhere asks to press again to swap.
 */
export const ShortcutRecorder: Component<{ id: string; locked?: boolean }> = (props) => {
  const [phase, setPhase] = createSignal<Phase>('idle')
  const [held, setHeld] = createSignal<string[]>([])
  const [holding, setHolding] = createSignal(false)
  const [holdProgress, setHoldProgress] = createSignal(0)
  let holdRaf = 0
  const [note, setNote] = createSignal<{ text: string; tone: 'warn' | 'info' } | null>(null)
  const [shaking, setShaking] = createSignal(false)
  /** Background state: red hatching = can't use, orange = taken (swappable). */
  const [deny, setDeny] = createSignal<'none' | 'deny' | 'warn'>('none')
  let denyTimer: number | undefined
  const flashDeny = (kind: 'deny' | 'warn', ms = 1400): void => {
    setDeny(kind)
    window.clearTimeout(denyTimer)
    denyTimer = window.setTimeout(() => {
      setDeny('none')
      // Outside recording (e.g. a locked row) the message leaves with the hatching.
      if (phase() !== 'recording') setNote(null)
    }, ms)
  }

  // ── Motion (transitions.dev tokens) ────────────────────────────────────
  // Phase changes swap content like the "text states swap" recipe: the old
  // view exits up with blur (150ms), then the new one rises in from below.
  const PHASE_SWAP_MS = 150
  const [shownPhase, setShownPhase] = createSignal<Phase>('idle')
  const [swap, setSwap] = createSignal<'rest' | 'exit' | 'enter-start'>('rest')
  let swapTimer: number | undefined
  let swapRaf = 0
  createEffect(
    on(
      phase,
      (next) => {
        window.clearTimeout(swapTimer)
        cancelAnimationFrame(swapRaf)
        setSwap('exit')
        swapTimer = window.setTimeout(() => {
          setShownPhase(next)
          setSwap('enter-start')
          swapRaf = requestAnimationFrame(() => requestAnimationFrame(() => setSwap('rest')))
        }, PHASE_SWAP_MS)
      },
      { defer: true }
    )
  )
  // The field's width eases to its content instead of jumping (card resize).
  let inner: HTMLSpanElement | undefined
  const [width, setWidth] = createSignal<number | null>(null)
  onMount(() => {
    const ro = new ResizeObserver(() => inner && setWidth(inner.offsetWidth))
    ro.observe(inner!)
    onCleanup(() => ro.disconnect())
  })
  let root: HTMLDivElement | undefined
  let holdTimer: number | undefined
  let savedTimer: number | undefined
  let pending: { keys: string[]; at: number } | null = null

  const keys = () => getShortcutKeys(props.id)

  const stopHold = (): void => {
    window.clearTimeout(holdTimer)
    cancelAnimationFrame(holdRaf)
    setHolding(false)
    setHoldProgress(0)
  }
  /** Fill the dithered ring in lockstep with the hold timer. */
  const runHoldRing = (): void => {
    const start = performance.now()
    const tick = (now: number): void => {
      setHoldProgress(Math.min(1, (now - start) / HOLD_MS))
      if (now - start < HOLD_MS) holdRaf = requestAnimationFrame(tick)
    }
    holdRaf = requestAnimationFrame(tick)
  }
  const detach = (): void => {
    window.removeEventListener('keydown', onKeyDown, true)
    window.removeEventListener('keyup', onKeyUp, true)
    document.removeEventListener('pointerdown', onOutside, true)
    window.removeEventListener('blur', cancel)
  }
  const cancel = (): void => {
    stopHold()
    detach()
    setHeld([])
    pending = null
    setPhase('idle')
  }
  let shakeTimer: number | undefined
  const nudge = (): void => {
    setShaking(false)
    requestAnimationFrame(() => setShaking(true))
    window.clearTimeout(shakeTimer)
    shakeTimer = window.setTimeout(() => setShaking(false), 420)
  }
  const reject = (text: string): void => {
    setNote({ text, tone: 'warn' })
    flashDeny('deny')
    nudge()
  }

  const commit = (combo: string[]): void => {
    const next = canonicalCombo(combo)
    const clash = findShortcutUsing(next, props.id)
    if (clash) {
      if (clash.locked) return reject(`Reserved by ${clash.title}`)
      const again =
        pending && pending.keys.join('+') === next.join('+') && Date.now() - pending.at < SWAP_MS
      if (!again) {
        pending = { keys: next, at: Date.now() }
        setNote({ text: `Used by ${clash.title} — press again to swap`, tone: 'warn' })
        flashDeny('warn', SWAP_MS)
        nudge()
        return
      }
      updateShortcut(clash.id, [])
      setNote({ text: `${clash.title} is now unassigned`, tone: 'info' })
    } else {
      setNote(null)
    }
    setDeny('none')
    updateShortcut(props.id, next)
    stopHold()
    detach()
    setHeld([])
    pending = null
    setPhase('saved')
    window.clearTimeout(savedTimer)
    savedTimer = window.setTimeout(() => setPhase('idle'), 900)
  }

  const onKeyDown = (e: KeyboardEvent): void => {
    e.preventDefault()
    e.stopImmediatePropagation()
    const mods = eventModifiers(e)
    const key = eventKeyName(e)
    if (!key) {
      // Modifier pressed: show it, (re)start the hold-to-confirm ring.
      setHeld(mods)
      stopHold()
      if (mods.length >= 2 || (mods.length === 1 && mods[0] !== 'Shift')) {
        setHolding(true)
        runHoldRing()
        const snapshot = mods
        holdTimer = window.setTimeout(() => commit(snapshot), HOLD_MS)
      }
      return
    }
    stopHold()
    if (key === 'Escape' && mods.length === 0) return cancel()
    const combo = [...mods, key]
    if (breaksTyping(combo)) {
      setHeld(mods)
      return reject('Add Ctrl or Alt — a bare key would break typing')
    }
    commit(combo)
  }

  const onKeyUp = (e: KeyboardEvent): void => {
    e.preventDefault()
    e.stopImmediatePropagation()
    // Releasing before the hold completes never confirms a modifier chord.
    stopHold()
    setHeld(eventModifiers(e))
  }

  const onOutside = (e: PointerEvent): void => {
    if (root && !root.contains(e.target as Node)) cancel()
  }

  const start = (): void => {
    if (props.locked) {
      setNote({ text: 'Locked — handled inside the editor or terminal', tone: 'warn' })
      flashDeny('deny')
      nudge()
      return
    }
    if (phase() === 'recording') return
    setNote(null)
    setHeld([])
    pending = null
    setPhase('recording')
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    document.addEventListener('pointerdown', onOutside, true)
    window.addEventListener('blur', cancel)
  }

  onCleanup(() => {
    window.clearTimeout(swapTimer)
    window.clearTimeout(denyTimer)
    cancelAnimationFrame(swapRaf)
    cancel()
    window.clearTimeout(savedTimer)
    window.clearTimeout(shakeTimer)
  })

  return (
    <div ref={root} class="flex flex-col items-end gap-1">
      <div class="flex items-center gap-1.5">
        <Show when={!props.locked && isShortcutModified(props.id) && phase() === 'idle'}>
          <button
            type="button"
            class="kbd-reset"
            title="Reset to default"
            aria-label="Reset to default"
            onClick={() => {
              resetShortcut(props.id)
              setNote(null)
            }}
          >
            <svg
              viewBox="0 0 16 16"
              class="w-3 h-3"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9M2.5 2.5v3h3" />
            </svg>
          </button>
        </Show>

        <button
          type="button"
          onClick={start}
          aria-disabled={props.locked}
          title={
            props.locked ? 'Handled inside the editor/terminal' : 'Click, then press a new shortcut'
          }
          aria-label={props.locked ? 'Locked shortcut' : 'Change shortcut'}
          class="kbd-field"
          classList={{
            'is-recording': phase() === 'recording',
            'is-saved': phase() === 'saved',
            'is-locked': !!props.locked,
            'is-denied': deny() === 'deny',
            'is-warned': deny() === 'warn'
          }}
        >
          {/* Dither backgrounds from the engine; each fades in with its state */}
          <span
            class="kbd-bg kbd-bg-listen"
            style={fillStyle('gradient', {
              color: 'ink',
              edge: 'bottom',
              length: 12,
              cell: 2,
              to: 0
            })}
            aria-hidden="true"
          />
          <span
            class="kbd-bg kbd-bg-deny"
            style={fillStyle('hatched', { color: 'red', cell: 2 })}
            aria-hidden="true"
          />
          <span
            class="kbd-bg kbd-bg-warn"
            style={fillStyle('hatched', { color: 'orange', cell: 2 })}
            aria-hidden="true"
          />
          <span class="kbd-morph" style={width() === null ? undefined : { width: `${width()}px` }}>
            <span
              ref={inner}
              class="kbd-swap flex items-center"
              classList={{
                'kbd-shake': shaking(),
                'is-exit': swap() === 'exit',
                'is-enter-start': swap() === 'enter-start'
              }}
            >
              <Keys
                phase={shownPhase()}
                keys={keys()}
                held={held()}
                holding={holding()}
                hold={holdProgress()}
              />
            </span>
          </span>
          <Show when={props.locked}>
            <svg
              viewBox="0 0 16 16"
              class="w-3 h-3 text-white/30"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
              <path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7" />
            </svg>
          </Show>
        </button>
      </div>
      <Show when={note()}>
        {(n) => (
          <span class="kbd-note" classList={{ 'is-warn': n().tone === 'warn' }}>
            {n().text}
          </span>
        )}
      </Show>
    </div>
  )
}

const Keys: Component<{
  phase: Phase
  keys: string[]
  held: string[]
  holding: boolean
  /** 0–1 hold-to-set progress */
  hold: number
}> = (props) => (
  <Show
    when={props.phase === 'recording'}
    fallback={
      <Show when={props.keys.length} fallback={<span class="kbd-empty">Unassigned</span>}>
        <span class="flex items-center gap-1">
          <For each={shortcutKeys(props.keys.join('+'))}>
            {(k, i) => (
              <kbd class="kbd-cap" style={{ '--i': i() }}>
                {k}
              </kbd>
            )}
          </For>
        </span>
      </Show>
    }
  >
    <span class="flex items-center gap-1">
      <For each={shortcutKeys(props.held.join('+')).filter(Boolean)}>
        {(k) => <kbd class="kbd-cap is-live">{k}</kbd>}
      </For>
      <span class="kbd-listen">
        <Show when={props.held.length} fallback="Press keys…">
          + key
        </Show>
      </span>
      <Show when={props.holding}>
        <Loader
          class="kbd-hold"
          variant="ring"
          height={16}
          cell={1}
          progress={props.hold}
          ease={false}
          label="Hold to set modifier-only shortcut"
        />
      </Show>
    </span>
  </Show>
)

export default ShortcutRecorder
