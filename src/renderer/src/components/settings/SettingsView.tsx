import {
  Component,
  For,
  JSX,
  Match,
  Switch,
  createEffect,
  createSignal,
  onMount,
  onCleanup,
  Show
} from 'solid-js'
import { LightRays } from 'solid-thinking-orbs'
import {
  SolarAltArrowLeftLinear,
  SolarGitForkLinear,
  SolarKeyboardLinear,
  SolarLayersLinear,
  SolarPaletteLinear,
  SolarProgrammingLinear,
  SolarRestartLinear,
  SolarTuningLinear,
  SolarWindowFrameLinear
} from '../ui/SolarIcons'
import ShortcutsSettings from './ShortcutsSettings'
import GeneralSettings from './GeneralSettings'
import AppearanceSettings from './AppearanceSettings'
import EditorSettings from './EditorSettings'
import ProjectsSettings from './ProjectsSettings'
import { hasAnyShortcutModified, resetAllShortcuts } from '../../shortcuts'
import { showSunrays } from '../../store'

interface SettingsViewProps {
  onClose: () => void
}

type TabId = 'general' | 'appearance' | 'editor' | 'shortcuts' | 'projects'

interface TabItem {
  id: TabId
  label: string
  icon: (props: JSX.IntrinsicElements['svg']) => JSX.Element
}

const SETTINGS_TABS: TabItem[] = [
  { id: 'general', label: 'General', icon: SolarTuningLinear },
  { id: 'appearance', label: 'Appearance', icon: SolarPaletteLinear },
  { id: 'editor', label: 'Editor', icon: SolarProgrammingLinear },
  { id: 'shortcuts', label: 'Shortcuts', icon: SolarKeyboardLinear }
]

const CODE_TABS: TabItem[] = [{ id: 'projects', label: 'Projects', icon: SolarWindowFrameLinear }]

const ALL_NAV_TABS: TabItem[] = [...SETTINGS_TABS, ...CODE_TABS]

export const SettingsView: Component<SettingsViewProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal<TabId>('general')
  let scrollRef: HTMLDivElement | undefined = undefined

  createEffect(() => {
    activeTab()
    scrollRef?.scrollTo({ top: 0 })
  })

  // Up/Down arrow navigation for switching tabs (matching Grimmoire PetsTab)
  const handleKeyDown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const currentIndex = ALL_NAV_TABS.findIndex((t) => t.id === activeTab())
      const delta = e.key === 'ArrowDown' ? 1 : -1
      const nextIndex = (currentIndex + delta + ALL_NAV_TABS.length) % ALL_NAV_TABS.length
      setActiveTab(ALL_NAV_TABS[nextIndex].id)
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown)
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown))
  })

  return (
    <div class="relative flex-1 min-w-0 h-full overflow-hidden flex bg-[#050506] select-none">
      {/* Volumetric sunrays: matching sidebar top banner color (#FF66B8) */}
      <Show when={showSunrays()}>
        <div
          class="absolute inset-0 z-0 pointer-events-none opacity-20 [mask-image:radial-gradient(ellipse_80%_70%_at_50%_35%,black_25%,transparent_90%)]"
          style={{ transform: 'rotate(180deg)' }}
        >
          <LightRays
            position={50}
            intensity={16}
            reach={36}
            rays={36}
            raysColor={{ mode: 'single', color: '#FF66B8' }}
            backgroundColor="transparent"
            animation={{ animate: true, speed: 7 }}
            class="w-full h-full"
          />
        </div>
      </Show>

      {/* ── Left Bare-Text Navigation Rail (inspired by Grimmoire PetsTab) ── */}
      <div class="relative z-20 w-[210px] shrink-0 h-full flex flex-col py-8 pl-8 pr-6">
        {/* Back button */}
        <button
          type="button"
          onClick={props.onClose}
          class="shrink-0 flex items-center gap-2.5 text-[13px] font-medium text-white/35 hover:text-white/80 transition-colors cursor-pointer outline-none mb-8 px-1 group"
        >
          <SolarAltArrowLeftLinear class="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
          <span>Back</span>
          <kbd class="ml-auto text-[11px] font-mono text-white/20 group-hover:text-white/40 transition-colors">
            Esc
          </kbd>
        </button>

        {/* ── Category: SETTINGS ── */}
        <div class="shrink-0 text-[11.5px] font-semibold uppercase tracking-wider text-white/20 px-2 mb-2.5">
          Settings
        </div>

        <div class="flex flex-col gap-1">
          <For each={SETTINGS_TABS}>
            {(tab) => {
              const isActive = () => activeTab() === tab.id
              return (
                <button
                  type="button"
                  data-tab={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  class={`group shrink-0 h-8 px-2 rounded-md flex items-center gap-2.5 text-left text-[13.5px] leading-none transition-colors duration-150 cursor-pointer outline-none ${
                    isActive()
                      ? 'text-white font-semibold'
                      : 'text-white/35 hover:text-white/75 font-normal'
                  }`}
                >
                  <tab.icon
                    class={`w-4 h-4 shrink-0 transition-colors ${
                      isActive() ? 'text-white' : 'text-white/35 group-hover:text-white/70'
                    }`}
                  />
                  <span class="truncate">{tab.label}</span>
                </button>
              )
            }}
          </For>
        </div>

        {/* ── Category: CODE ── */}
        <div class="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-white/20 px-2 mt-6 mb-2.5">
          CODE
        </div>

        <div class="flex flex-col gap-1">
          <For each={CODE_TABS}>
            {(tab) => {
              const isActive = () => activeTab() === tab.id
              return (
                <button
                  type="button"
                  data-tab={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  class={`group shrink-0 h-8 px-2 rounded-md flex items-center gap-2.5 text-left text-[13.5px] leading-none transition-colors duration-150 cursor-pointer outline-none ${
                    isActive()
                      ? 'text-white font-semibold'
                      : 'text-white/35 hover:text-white/75 font-normal'
                  }`}
                >
                  <tab.icon
                    class={`w-4 h-4 shrink-0 transition-colors ${
                      isActive() ? 'text-white' : 'text-white/35 group-hover:text-white/70'
                    }`}
                  />
                  <span class="truncate">{tab.label}</span>
                </button>
              )
            }}
          </For>

          {/* Muted Code Category indicators matching reference */}
          <div
            title="Source control"
            class="group shrink-0 h-8 px-2 flex items-center gap-2.5 text-left text-[13.5px] leading-none text-white/20 select-none cursor-default"
          >
            <SolarGitForkLinear class="w-4 h-4 shrink-0 text-white/20" />
            <span class="truncate">Source control</span>
          </div>

          <div
            title="Worktrees"
            class="group shrink-0 h-8 px-2 flex items-center gap-2.5 text-left text-[13.5px] leading-none text-white/20 select-none cursor-default"
          >
            <SolarLayersLinear class="w-4 h-4 shrink-0 text-white/20" />
            <span class="truncate">Worktrees</span>
          </div>
        </div>

        {/* Navigation hints & actions placed directly below menu items */}
        <div class="mt-6 shrink-0 flex flex-col gap-2 px-2">
          <Show when={activeTab() === 'shortcuts' && hasAnyShortcutModified()}>
            <button
              type="button"
              onClick={resetAllShortcuts}
              class="flex items-center gap-1.5 text-[12px] text-white/35 hover:text-white transition-colors cursor-pointer outline-none"
            >
              <SolarRestartLinear class="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </Show>
          <div class="text-[11.5px] text-white/25 pointer-events-none select-none">
            ↑ ↓ to switch
          </div>
        </div>
      </div>

      {/* ── Main Settings Content Stage (centered, balanced spacing) ── */}
      <div
        ref={(el) => (scrollRef = el)}
        class="relative z-10 flex-1 min-w-0 h-full overflow-y-auto no-scrollbar py-8 px-8 sm:px-12 [scrollbar-gutter:stable]"
      >
        <div class="w-full max-w-[740px] mx-auto flex flex-col">
          <Switch>
            <Match when={activeTab() === 'general'}>
              <GeneralSettings />
            </Match>
            <Match when={activeTab() === 'appearance'}>
              <AppearanceSettings />
            </Match>
            <Match when={activeTab() === 'editor'}>
              <EditorSettings />
            </Match>
            <Match when={activeTab() === 'shortcuts'}>
              <ShortcutsSettings />
            </Match>
            <Match when={activeTab() === 'projects'}>
              <ProjectsSettings />
            </Match>
          </Switch>
        </div>
      </div>
    </div>
  )
}

export default SettingsView
