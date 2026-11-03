import { Component, Show, Switch, Match, onMount, onCleanup } from 'solid-js'
import {
  isSettingsModalOpen,
  closeSettingsModal,
  activeSettingsPage,
  setActiveSettingsPage,
  restorePageDefaults,
  type SettingsPage
} from '../../store'
import { GeneralPage } from './pages/GeneralPage'
import { WindowPage } from './pages/WindowPage'
import { AppearancePage } from './pages/AppearancePage'
import { KeyboardPage } from './pages/KeyboardPage'
import { AgentsPage } from './pages/AgentsPage'

import slidersIcon from '../../assets/icons/sliders.svg'
import appWindowIcon from '../../assets/icons/app-window.svg'
import paletteIcon from '../../assets/icons/palette.svg'
import keyboardIcon from '../../assets/icons/keyboard.svg'
import botIcon from '../../assets/icons/bot.svg'
import rotateCcwIcon from '../../assets/icons/rotate-ccw.svg'
import cancelIcon from '../../assets/icons/cancel-01.svg'

interface NavItem {
  id: SettingsPage
  label: string
  icon: string
}

export const SettingsModal: Component = () => {
  const navItems: NavItem[] = [
    { id: 'General', label: 'General', icon: slidersIcon },
    { id: 'Window', label: 'Window', icon: appWindowIcon },
    { id: 'Appearance', label: 'Appearance', icon: paletteIcon },
    { id: 'Keyboard', label: 'Keyboard', icon: keyboardIcon },
    { id: 'Agents', label: 'Agents', icon: botIcon }
  ]

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (!isSettingsModalOpen()) return

    if (e.key === 'Escape') {
      e.preventDefault()
      closeSettingsModal()
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  const handleRestoreDefaults = (): void => {
    restorePageDefaults(activeSettingsPage())
  }

  return (
    <Show when={isSettingsModalOpen()}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm select-none"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            closeSettingsModal()
          }
        }}
      >
        {/* Floating Sheet Card: Quiet, solid, non-wireframe surface */}
        <div
          class="relative w-full max-w-[880px] h-[600px] max-h-[90vh] bg-[#131313] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.75)] flex overflow-hidden text-[#ebebeb]"
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left Navigation Sidebar */}
          <aside class="w-[200px] shrink-0 h-full flex flex-col gap-1 p-3 bg-[#101010] select-none">
            {navItems.map((item) => {
              const isActive = () => activeSettingsPage() === item.id
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive()}
                  onClick={() => setActiveSettingsPage(item.id)}
                  class={`h-8 px-3 rounded-lg flex items-center gap-2.5 text-[13px] font-normal transition-colors cursor-pointer text-left focus:outline-none ${
                    isActive()
                      ? 'bg-[#242424] text-[#ffffff] font-medium shadow-sm'
                      : 'text-[#7d7d7d] hover:bg-[#171717] hover:text-[#d1d1d1]'
                  }`}
                >
                  <img
                    src={item.icon}
                    alt=""
                    class={`w-4 h-4 transition-opacity ${
                      isActive() ? 'opacity-100' : 'opacity-45'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </aside>

          {/* Right Content Panel */}
          <section class="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-[#131313]">
            {/* Header Bar */}
            <header class="h-11 shrink-0 px-6 flex items-center gap-2 text-[13px]">
              <span class="text-[#666666]">Settings</span>
              <span class="text-[#404040]">/</span>
              <span class="flex-1 font-medium text-[#f0f0f0]">{activeSettingsPage()}</span>

              {/* Restore Defaults */}
              <button
                type="button"
                onClick={handleRestoreDefaults}
                class="h-7 px-3 rounded-full text-[12px] text-[#7d7d7d] hover:text-[#e0e0e0] hover:bg-[#1a1a1a] flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none"
                title="Restore default settings for this page"
              >
                <img src={rotateCcwIcon} alt="" class="w-3.5 h-3.5 opacity-55" />
                <span>Restore Defaults</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={closeSettingsModal}
                class="w-7 h-7 rounded-full text-[#7d7d7d] hover:text-[#e0e0e0] hover:bg-[#1a1a1a] flex items-center justify-center transition-colors cursor-pointer focus:outline-none"
                aria-label="Close"
              >
                <img src={cancelIcon} alt="" class="w-3.5 h-3.5 opacity-60" />
              </button>
            </header>

            {/* Scrollable Page Body */}
            <div class="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex justify-center">
              <div class="w-full max-w-[620px]">
                <Switch>
                  <Match when={activeSettingsPage() === 'General'}>
                    <GeneralPage />
                  </Match>
                  <Match when={activeSettingsPage() === 'Window'}>
                    <WindowPage />
                  </Match>
                  <Match when={activeSettingsPage() === 'Appearance'}>
                    <AppearancePage />
                  </Match>
                  <Match when={activeSettingsPage() === 'Keyboard'}>
                    <KeyboardPage />
                  </Match>
                  <Match when={activeSettingsPage() === 'Agents'}>
                    <AgentsPage />
                  </Match>
                </Switch>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Show>
  )
}
export default SettingsModal
