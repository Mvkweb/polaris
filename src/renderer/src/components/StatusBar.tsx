import { For, Show } from 'solid-js'
import type { Component } from 'solid-js'
import {
  activeTerminalId,
  addTerminal,
  closeTerminal,
  closingTerminalIds,
  isTerminalOpen,
  setActiveTerminalId,
  setIsTerminalOpen,
  terminalProcessMap,
  terminalSessions,
  toggleTerminal
} from '../store'
import { formatShortcut } from '../shortcuts'
import { SolarProgrammingLinear } from './ui/SolarIcons'

interface StatusBarProps {
  onDragStart?: (e: PointerEvent) => void
}

const StatusBar: Component<StatusBarProps> = (props) => {
  return (
    <div
      class="h-8 shrink-0 flex items-center justify-between px-4 select-none bg-[#050505] text-white/70"
      onPointerDown={(e) => {
        if (!(e.target as HTMLElement).closest('button')) {
          props.onDragStart?.(e)
        }
      }}
    >
      <div class="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTerminal}
          title={`Toggle Terminal (${formatShortcut('Mod+`')})`}
          class={`flex items-center gap-2 text-[13px] font-medium transition-colors cursor-pointer hover:text-white focus:outline-none ${
            isTerminalOpen() ? 'text-white' : 'text-white/60'
          }`}
        >
          <SolarProgrammingLinear class="w-4 h-4" />
          <span>Terminal</span>
        </button>

        {/* Multi-terminal tabs: plain text on dark background, animated on add & close */}
        <div class="flex items-center gap-1">
          <For each={terminalSessions()}>
            {(session) => {
              const isActive = () => activeTerminalId() === session.id && isTerminalOpen()
              const isClosing = () => closingTerminalIds().includes(session.id)
              const processName = () => terminalProcessMap()[session.id] || 'fish'
              return (
                <div
                  class={`group flex items-center h-5 transition-colors ${
                    isClosing() ? 'animate-tab-close' : 'animate-tab-slide'
                  }`}
                >
                  <button
                    type="button"
                    disabled={isClosing()}
                    onClick={() => {
                      if (isClosing()) return
                      setActiveTerminalId(session.id)
                      if (!isTerminalOpen()) setIsTerminalOpen(true)
                    }}
                    title={`Switch to Terminal ${session.title} (${processName()})`}
                    class={`flex items-center gap-1.5 h-5 px-1.5 text-[12px] font-medium transition-colors cursor-pointer focus:outline-none ${
                      isActive() ? 'text-white' : 'text-white/45 hover:text-white/80'
                    }`}
                  >
                    <span>{session.title}</span>
                    <Show when={processName()}>
                      <span class="text-white/25 text-[10px] select-none">·</span>
                      <span
                        class={`max-w-[130px] truncate text-[12px] font-normal transition-colors ${
                          isActive() ? 'text-white/70' : 'text-white/40'
                        }`}
                      >
                        {processName()}
                      </span>
                    </Show>
                  </button>

                  {/* Close button: available on every tab (even single terminal), with comfortable spacing */}
                  <button
                    type="button"
                    disabled={isClosing()}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isClosing()) return
                      closeTerminal(session.id)
                    }}
                    title={`Close Terminal ${session.title}`}
                    class={`h-5 w-4 flex items-center justify-center cursor-pointer transition-opacity text-white/40 hover:text-white -ml-0.5 mr-0.5 ${
                      isActive()
                        ? 'opacity-60 hover:opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <svg
                      class="w-2.5 h-2.5"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.75"
                      stroke-linecap="round"
                    >
                      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
                    </svg>
                  </button>
                </div>
              )
            }}
          </For>

          {/* Plus sign to add a new terminal */}
          <button
            type="button"
            onClick={addTerminal}
            title="New Terminal"
            class="flex items-center justify-center w-5 h-5 text-white/45 hover:text-white transition-colors cursor-pointer focus:outline-none"
          >
            <svg
              class="w-3 h-3"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
            >
              <path d="M8 3.5v9M3.5 8h9" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default StatusBar
