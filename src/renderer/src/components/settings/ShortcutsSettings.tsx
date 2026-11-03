import {
  Component,
  JSX,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  For,
  Show
} from 'solid-js'
import { Dynamic } from 'solid-js/web'
import {
  SolarAltArrowDownLinear as ArrowDown,
  SolarAltArrowLeftLinear as ArrowLeft,
  SolarAltArrowRightLinear as ArrowRight,
  SolarAltArrowUpLinear as ArrowUp,
  SolarCornerDownLeftLinear as CornerDownLeft,
  SolarBackspaceLinear as Delete,
  SolarRotateCcwLinear as RotateCcw,
  SolarMagniferLinear
} from '../ui/SolarIcons'
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_GROUPS,
  ShortcutItem,
  getShortcutKeys,
  updateShortcut,
  resetShortcut,
  isShortcutModified,
  isMac
} from '../../shortcuts'

// ── Key definitions ──────────────────────────────────────────────────────────
// glyph → single symbol (mac modifiers), icon → lucide icon, otherwise plain label.
// `label` is always set so the filter box can still match "up", "ctrl", "cmd"…

interface KeyDef {
  label: string
  glyph?: string
  icon?: typeof ArrowUp
}

function resolveKey(key: string, mac: boolean): KeyDef {
  switch (key) {
    case 'Mod':
      return mac ? { label: 'Cmd', glyph: '⌘' } : { label: 'Ctrl' }
    case 'Control':
      // On non-mac this token is produced by the Meta (Windows) key.
      return mac ? { label: 'Ctrl', glyph: '⌃' } : { label: 'Win' }
    case 'Alt':
      return mac ? { label: 'Opt', glyph: '⌥' } : { label: 'Alt' }
    case 'Shift':
      return mac ? { label: 'Shift', glyph: '⇧' } : { label: 'Shift' }
    case 'ArrowUp':
      return { label: 'Up', icon: ArrowUp }
    case 'ArrowDown':
      return { label: 'Down', icon: ArrowDown }
    case 'ArrowLeft':
      return { label: 'Left', icon: ArrowLeft }
    case 'ArrowRight':
      return { label: 'Right', icon: ArrowRight }
    case 'Enter':
      return { label: 'Enter', icon: CornerDownLeft }
    case 'Backspace':
      return { label: 'Backspace', icon: Delete }
    case 'Escape':
    case 'Esc':
      return { label: 'Esc' }
    default:
      return { label: key.length === 1 ? key.toUpperCase() : key }
  }
}

// ── Keycap ───────────────────────────────────────────────────────────────────

type KeyTone = 'idle' | 'active' | 'ghost'

interface KeycapProps {
  name?: string
  tone?: KeyTone
  index?: number
  /** Play the blurred pop-in when this keycap is created. Read once, on purpose. */
  pop?: boolean
  class?: string
}

const Keycap: Component<KeycapProps> = (props) => {
  // Components run once in Solid, so these are captured at creation time.
  // That's what keeps already-visible keys from replaying the animation.
  const pop = props.pop
  const def = props.name ? resolveKey(props.name, isMac()) : null

  return (
    <kbd
      class={`kb-key ${props.class ?? ''}`}
      data-tone={props.tone ?? 'idle'}
      data-pop={pop ? '' : undefined}
      aria-label={def?.label}
      style={{ '--i': props.index ?? 0 } as JSX.CSSProperties}
    >
      {!def ? (
        <span class="kb-ghost-dot" />
      ) : def.icon ? (
        <Dynamic component={def.icon} class="kb-key-icon" />
      ) : (
        <span class={def.glyph ? 'kb-key-glyph' : undefined}>{def.glyph ?? def.label}</span>
      )}
    </kbd>
  )
}

const AssistiveWaveIcon: Component = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M11 3a7 7 0 0 0-7 7a1 1 0 0 0 2 0a5 5 0 0 1 10 0a5.07 5.07 0 0 1-.71 2.57L11.73 20A2 2 0 0 1 10 21a2 2 0 0 1-2-2a1 1 0 0 0-2 0a4 4 0 0 0 4 4a4 4 0 0 0 3.5-2.07l3.56-7.43A6.93 6.93 0 0 0 18 10a7 7 0 0 0-7-7M4 15a1 1 0 1 0 1 1a1 1 0 0 0-1-1M17.59 1.2a1 1 0 1 0-1.2 1.6A9 9 0 0 1 20 10a1 1 0 0 0 2 0a11.06 11.06 0 0 0-4.41-8.8M11 9a1 1 0 0 1 1 1a1 1 0 0 0 2 0a3 3 0 0 0-6 0a3 3 0 0 0 .51 1.68a3.5 3.5 0 0 0 .47.54l.2.22a1 1 0 0 1 0 1.11a1 1 0 0 0 .25 1.39a1 1 0 0 0 .57.18a1 1 0 0 0 .82-.43a3 3 0 0 0 0-3.39a3.4 3.4 0 0 0-.35-.42l-.14-.14a1.4 1.4 0 0 1-.16-.18A1 1 0 0 1 10 10a1 1 0 0 1 1-1m-4 6a1 1 0 1 0-1-1a1 1 0 0 0 1 1" />
  </svg>
)

// ── State layer (text-states-swap) ───────────────────────────────────────────

type Phase = 'idle' | 'listening' | 'modifiers'
type LayerState = 'before' | 'active' | 'after'

const PHASE_ORDER: Record<Phase, number> = { idle: 0, listening: 1, modifiers: 2 }
const CONTROL_PADDING = 3 // px, each side

const Layer: Component<{
  state: LayerState
  innerRef: (el: HTMLDivElement) => void
  children: JSX.Element
}> = (props) => (
  <div class="kb-layer" data-state={props.state} aria-hidden={props.state !== 'active'}>
    <div class="kb-layer-inner" ref={props.innerRef}>
      {props.children}
    </div>
  </div>
)

// ── Shortcut row ─────────────────────────────────────────────────────────────

interface ShortcutRowProps {
  item: ShortcutItem
  recordingAction: () => string | null
  setRecordingAction: (action: string | null) => void
  activeModifiers: () => string[]
  setActiveModifiers: (mods: string[]) => void
}

const ShortcutRow: Component<ShortcutRowProps> = (props) => {
  const isRecording = () => props.recordingAction() === props.item.id
  const currentKeys = () => getShortcutKeys(props.item.id)
  const isModified = () => isShortcutModified(props.item.id)

  const phase = (): Phase =>
    !isRecording() ? 'idle' : props.activeModifiers().length === 0 ? 'listening' : 'modifiers'

  const layerState = (p: Phase): LayerState => {
    const active = PHASE_ORDER[phase()]
    const mine = PHASE_ORDER[p]
    return mine === active ? 'active' : mine < active ? 'before' : 'after'
  }

  // ── Width tween (card-resize) ──
  const refs: Partial<Record<Phase, HTMLDivElement>> = {}
  const [width, setWidth] = createSignal<number | null>(null)
  const [settled, setSettled] = createSignal(false)
  // Keycaps created after first paint get the pop-in; the initial list doesn't.
  const [mounted, setMounted] = createSignal(false)

  const measure = () => {
    const el = refs[phase()]
    if (el && el.offsetWidth > 0) setWidth(el.offsetWidth + CONTROL_PADDING * 2)
  }

  onMount(() => {
    measure() // first width is written without a transition
    const ro = new ResizeObserver(measure)
    Object.values(refs).forEach((el) => el && ro.observe(el))
    requestAnimationFrame(() => {
      setSettled(true)
      setMounted(true)
    })
    onCleanup(() => ro.disconnect())
  })

  createEffect(() => {
    phase()
    measure()
  })

  const toggleRecording = () => {
    if (isRecording()) {
      props.setRecordingAction(null)
    } else {
      props.setRecordingAction(props.item.id)
    }
    props.setActiveModifiers([])
  }

  return (
    <div
      role="button"
      tabindex="0"
      aria-pressed={isRecording()}
      data-kb-row={props.item.id}
      data-recording={isRecording() ? 'true' : 'false'}
      class="kb-row group relative px-3 py-3 rounded-xl flex items-center justify-between gap-4 cursor-pointer select-none outline-none transition-colors duration-150 hover:bg-white/[0.03] focus-visible:bg-white/[0.05] data-[recording=true]:bg-white/[0.05]"
      onClick={toggleRecording}
      onKeyDown={(e) => {
        if (isRecording()) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggleRecording()
        }
      }}
    >
      {/* Title & description */}
      <div class="flex flex-col min-w-0">
        <span class="text-[13.5px] font-medium text-white/90 group-hover:text-white transition-colors truncate">
          {props.item.title}
        </span>
        <Show when={props.item.description}>
          <span class="text-[12px] text-white/40 group-hover:text-white/55 transition-colors truncate mt-0.5">
            {props.item.description}
          </span>
        </Show>
      </div>

      {/* Reset + recorder */}
      <div class="flex items-center shrink-0">
        <div class="kb-reset" data-visible={isModified() ? 'true' : 'false'}>
          <div class="kb-reset-clip">
            <button
              type="button"
              class="kb-reset-btn"
              title="Reset to default"
              aria-label="Reset to default"
              tabindex={isModified() ? 0 : -1}
              onClick={(e) => {
                e.stopPropagation()
                resetShortcut(props.item.id)
              }}
            >
              <RotateCcw />
            </button>
          </div>
        </div>

        <div
          class="kb-control"
          data-recording={isRecording() ? 'true' : 'false'}
          data-settled={settled() ? 'true' : 'false'}
          style={{ width: width() !== null ? `${width()}px` : undefined }}
        >
          {/* Idle: current keys */}
          <Layer state={layerState('idle')} innerRef={(el) => (refs.idle = el)}>
            <For each={currentKeys()}>
              {(key, i) => <Keycap name={key} index={i()} pop={mounted()} />}
            </For>
          </Layer>

          {/* Listening: nothing held yet */}
          <Layer state={layerState('listening')} innerRef={(el) => (refs.listening = el)}>
            <span class="kb-listening">
              <AssistiveWaveIcon />
              <span>Listening…</span>
            </span>
          </Layer>

          {/* Modifiers held: live keycaps + a ghost slot for the next key */}
          <Layer state={layerState('modifiers')} innerRef={(el) => (refs.modifiers = el)}>
            <For each={props.activeModifiers()}>
              {(key, i) => <Keycap name={key} tone="active" index={i()} pop />}
            </For>
            <Keycap tone="ghost" />
          </Layer>
        </div>
      </div>
    </div>
  )
}

// ── Search & normalization helpers ───────────────────────────────────────────

const filterMatches = (item: ShortcutItem, q: string): boolean => {
  if (!q) return true
  const mac = isMac()
  return (
    item.title.toLowerCase().includes(q) ||
    Boolean(item.description && item.description.toLowerCase().includes(q)) ||
    item.group.toLowerCase().includes(q) ||
    getShortcutKeys(item.id).some((k) => {
      const def = resolveKey(k, mac)
      return k.toLowerCase().includes(q) || def.label.toLowerCase().includes(q)
    })
  )
}

function normalizeKeyName(e: KeyboardEvent): string {
  if (e.key === ' ') return 'Space'
  if (e.key.length === 1) return e.key.toUpperCase()
  return e.key
}

function readModifiers(e: KeyboardEvent): string[] {
  const mac = isMac()
  const keys: string[] = []
  if (mac ? e.metaKey : e.ctrlKey) keys.push('Mod')
  if (mac ? e.ctrlKey : e.metaKey) keys.push('Control')
  if (e.altKey) keys.push('Alt')
  if (e.shiftKey) keys.push('Shift')
  return keys
}

// ── Main view ────────────────────────────────────────────────────────────────

export const ShortcutsSettings: Component = () => {
  const [query, setQuery] = createSignal('')
  const [recordingAction, setRecordingAction] = createSignal<string | null>(null)
  const [activeModifiers, setActiveModifiers] = createSignal<string[]>([])
  let searchInputRef: HTMLInputElement | undefined = undefined

  const stopRecording = () => {
    setRecordingAction(null)
    setActiveModifiers([])
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const action = recordingAction()
    if (!action) return

    e.preventDefault()
    e.stopPropagation()

    if (e.key === 'Escape') {
      stopRecording()
      return
    }

    const keys = readModifiers(e)
    setActiveModifiers([...keys])

    if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) return

    keys.push(normalizeKeyName(e))
    updateShortcut(action, keys)
    stopRecording()
  }

  const handleKeyUp = (e: KeyboardEvent) => {
    if (!recordingAction()) return
    setActiveModifiers(readModifiers(e))
  }

  // Clicking anywhere that isn't the recording row cancels recording.
  const handlePointerDown = (e: PointerEvent) => {
    const action = recordingAction()
    if (!action) return
    const row = (e.target as HTMLElement | null)?.closest('[data-kb-row]')
    if (row?.getAttribute('data-kb-row') === action) return // the row's own click toggles
    stopRecording()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    window.addEventListener('keyup', handleKeyUp, { capture: true })
    window.addEventListener('pointerdown', handlePointerDown, { capture: true })
    onCleanup(() => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
      window.removeEventListener('keyup', handleKeyUp, { capture: true })
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true })
    })
  }

  const q = () => query().trim().toLowerCase()

  // Groups are keyed by their (stable) name and items by object identity, so
  // typing in the filter never remounts rows or replays their animations.
  const groupItems = (group: string) =>
    DEFAULT_SHORTCUTS.filter((s) => s.group === group && filterMatches(s, q()))

  const totalMatches = createMemo(() =>
    SHORTCUT_GROUPS.reduce((acc, g) => acc + groupItems(g).length, 0)
  )

  return (
    <div class="flex flex-col gap-8 w-full pb-12">
      {/* Title & intro */}
      <div class="flex flex-col gap-1 px-3">
        <h1 class="text-[20px] font-semibold text-white/95 tracking-tight">Shortcuts</h1>
        <p class="text-[13.5px] text-white/40 leading-relaxed">
          Click a shortcut to record a new key combination. Press{' '}
          <Keycap name="Esc" class="mx-0.5 align-middle" /> to cancel.
        </p>
      </div>

      {/* Filter */}
      <div class="mx-3 relative flex items-center bg-white/[0.04] hover:bg-white/[0.06] focus-within:bg-white/[0.06] rounded-xl px-3.5 py-2.5 gap-2.5 transition-colors">
        <SolarMagniferLinear class="w-4 h-4 text-white/40 shrink-0" />
        <input
          ref={(el) => (searchInputRef = el)}
          type="text"
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && query()) {
              e.preventDefault()
              setQuery('')
            }
          }}
          placeholder="Filter shortcuts by name or key..."
          class="w-full bg-transparent text-[13px] text-white/90 placeholder:text-white/30 focus:outline-none"
        />
        <Show when={query()}>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              searchInputRef?.focus()
            }}
            class="text-[11px] text-white/40 hover:text-white/80 transition-colors cursor-pointer"
          >
            Clear
          </button>
        </Show>
      </div>

      {/* Groups */}
      <Show
        when={totalMatches() > 0}
        fallback={
          <div class="py-16 text-center text-[13px] text-white/35 select-none">
            No shortcuts matching "{query()}"
          </div>
        }
      >
        <div class="flex flex-col gap-7">
          <For each={SHORTCUT_GROUPS}>
            {(group) => {
              const items = createMemo(() => groupItems(group))
              return (
                <Show when={items().length > 0}>
                  <section class="flex flex-col gap-1">
                    <h2 class="text-[12px] font-medium text-white/40 tracking-tight px-3 select-none">
                      {group}
                    </h2>
                    <div class="flex flex-col">
                      <For each={items()}>
                        {(item) => (
                          <ShortcutRow
                            item={item}
                            recordingAction={recordingAction}
                            setRecordingAction={setRecordingAction}
                            activeModifiers={activeModifiers}
                            setActiveModifiers={setActiveModifiers}
                          />
                        )}
                      </For>
                    </div>
                  </section>
                </Show>
              )
            }}
          </For>
        </div>
      </Show>
    </div>
  )
}

export default ShortcutsSettings
