import { Component, JSX, createSignal, onCleanup, onMount, Show } from 'solid-js'
import MockupBadge from '../ui/MockupBadge'

// ── Easing & Transitions ──────────────────────────────────────────────────────
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'

// ── Row Shell ────────────────────────────────────────────────────────────────

interface SettingRowProps {
  title: string
  description: string
  children: JSX.Element
  badge?: JSX.Element
  clickable?: boolean
  onClick?: () => void
}

const SettingRow: Component<SettingRowProps> = (props) => (
  <div
    class={`group relative px-3 py-3 rounded-xl flex items-center justify-between gap-4 transition-colors duration-150 hover:bg-white/[0.03] select-none ${
      props.clickable ? 'cursor-pointer' : ''
    }`}
    onClick={() => props.onClick?.()}
  >
    <div class="flex flex-col min-w-0 pr-4">
      <div class="flex items-center gap-2">
        <span class="text-[13.5px] font-medium text-white/90 group-hover:text-white transition-colors">
          {props.title}
        </span>
        <Show when={props.badge}>{props.badge}</Show>
      </div>
      <span class="text-[12px] text-white/40 group-hover:text-white/55 transition-colors mt-0.5">
        {props.description}
      </span>
    </div>
    <div class="shrink-0">{props.children}</div>
  </div>
)

const Section: Component<{ title: string; children: JSX.Element }> = (props) => (
  <section class="flex flex-col gap-0.5">
    <h2 class="text-[12px] font-medium text-white/40 tracking-tight px-3 pb-1 select-none">
      {props.title}
    </h2>
    <div class="flex flex-col">{props.children}</div>
  </section>
)

// ── Compact Fast Toggle Switch ───────────────────────────────────────────────
// Responsive 130ms magnetic slide with tactile squish on press

interface ToggleRowProps {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  badge?: JSX.Element
}

const ToggleRow: Component<ToggleRowProps> = (props) => {
  const [pressed, setPressed] = createSignal(false)

  const release = () => {
    setPressed(false)
    window.removeEventListener('pointerup', release)
    window.removeEventListener('pointercancel', release)
  }
  onCleanup(release)

  return (
    <SettingRow
      title={props.title}
      description={props.description}
      badge={props.badge}
      clickable
      onClick={() => props.onChange(!props.checked)}
    >
      <button
        type="button"
        role="switch"
        aria-checked={props.checked}
        aria-label={props.title}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          setPressed(true)
          window.addEventListener('pointerup', release)
          window.addEventListener('pointercancel', release)
        }}
        class={`relative inline-flex items-center h-[19px] w-[33px] rounded-full p-[2px] outline-none cursor-pointer select-none transition-colors duration-130 ${
          props.checked ? 'bg-white/30 hover:bg-white/35' : 'bg-white/[0.08] hover:bg-white/[0.12]'
        }`}
        style={{
          transition: `background-color 130ms ${EASE_OUT}`
        }}
      >
        <span
          class={`block rounded-full transition-all ${
            props.checked
              ? 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.6)]'
              : 'bg-white/60 shadow-[0_1px_2px_rgba(0,0,0,0.4)]'
          }`}
          style={{
            height: '15px',
            width: pressed() ? '18px' : '15px',
            transform: props.checked ? `translateX(${pressed() ? 11 : 14}px)` : 'translateX(0px)',
            transition: `transform 130ms ${EASE_OUT}, width 90ms ${EASE_OUT}, background-color 130ms ${EASE_OUT}`
          }}
        />
      </button>
    </SettingRow>
  )
}

// ── Desktop Sidecar Status Badge ─────────────────────────────────────────────
// Grimmoire-style rounded-md badge with emerald dot and zero outline

const SidecarStatus: Component<{ running: boolean }> = (props) => (
  <Show
    when={props.running}
    fallback={
      <div class="inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-white/[0.03] text-white/35 text-[11.5px] font-mono select-none">
        <span class="w-1.5 h-1.5 rounded-full bg-white/20" />
        <span>Inactive</span>
      </div>
    }
  >
    <div class="inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-white/[0.04] text-white/80 text-[11.5px] font-mono select-none">
      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      <span>Running (Zig 0.17)</span>
    </div>
  </Show>
)

// ── General Settings Page ────────────────────────────────────────────────────

export const GeneralSettings: Component = () => {
  const [autoSave, setAutoSave] = createSignal(true)
  const [confirmDelete, setConfirmDelete] = createSignal(true)
  const [restoreWorkspace, setRestoreWorkspace] = createSignal(true)
  const [coreStatus, setCoreStatus] = createSignal<{ available: boolean; running: boolean } | null>(
    null
  )

  onMount(async () => {
    try {
      const status = await window.api.getCoreStatus()
      setCoreStatus(status)
    } catch {
      setCoreStatus({ available: false, running: false })
    }
  })

  return (
    <div class="flex flex-col gap-7 w-full pb-12 select-none">
      <div class="flex flex-col gap-1 px-3">
        <h1 class="text-[20px] font-semibold text-white/95 tracking-tight">General settings</h1>
        <p class="text-[13.5px] text-white/40 leading-relaxed">
          Configure application appearance, search engine, and behavior.
        </p>
      </div>

      <div class="flex flex-col gap-6">
        <Section title="Native Engine & Window">
          <SettingRow
            title="Search Engine Sidecar"
            description="High-throughput parallel text and fuzzy search powered by Zig 0.17"
          >
            <SidecarStatus running={Boolean(coreStatus()?.running)} />
          </SettingRow>

          <SettingRow
            title="Window Frame Style"
            description="Seamless frameless titlebar with integrated drag region"
          >
            <span class="inline-flex items-center h-6 px-2 rounded-md bg-white/[0.04] text-[11.5px] font-mono text-white/60 select-none">
              Frameless
            </span>
          </SettingRow>
        </Section>

        <Section title="Files & Workspace">
          {/* [MOCKUP] Auto save not yet wired to Editor saving */}
          <ToggleRow
            title="Auto Save Changes"
            description="Automatically persist modified files to disk after editing"
            badge={<MockupBadge />}
            checked={autoSave()}
            onChange={setAutoSave}
          />
          {/* [MOCKUP] Confirm deletion not yet wired to FileTree */}
          <ToggleRow
            title="Confirm File Deletion"
            description="Prompt for confirmation before moving files or folders to trash"
            badge={<MockupBadge />}
            checked={confirmDelete()}
            onChange={setConfirmDelete}
          />
          {/* [MOCKUP] Session restore not yet wired to app launch */}
          <ToggleRow
            title="Restore Previous Session"
            description="Reopen previously active tabs and editor state on launch"
            badge={<MockupBadge />}
            checked={restoreWorkspace()}
            onChange={setRestoreWorkspace}
          />
        </Section>
      </div>
    </div>
  )
}

export default GeneralSettings
