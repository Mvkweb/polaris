import { createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js'
import type { Component } from 'solid-js'
import Sidebar from './components/Sidebar'
import BrowserTopBar from './components/browser/BrowserTopBar'
import FolderView from './components/browser/FolderView'
import StatusBar from './components/StatusBar'
import Terminal from './components/terminal/Terminal'
import QuickOpenModal from './components/modals/QuickOpenModal'
import SettingsModal from './components/settings/SettingsModal'
import ContextMenu from './components/ui/ContextMenu'
import FileActionModal from './components/file-tree/FileActionModal'
import PropertiesModal from './components/modals/PropertiesModal'
import {
  activeTerminalId,
  addTerminal,
  closeTerminal,
  isTerminalOpen,
  setIsTerminalOpen,
  terminalHeight,
  setTerminalHeight,
  terminalSessions,
  toggleTerminal,
  toggleQuickOpen,
  setCurrentView,
  isSettingsModalOpen,
  closeSettingsModal,
  toggleSettingsModal,
  activeAccentColor,
  workspaceRoot,
  navigateTo
} from './store'
import { isModKey } from './shortcuts'

const MIN_EXPANDED_HEIGHT = 100
const DEFAULT_EXPANDED_HEIGHT = 340
const MAX_TERMINAL_HEIGHT_RATIO = 0.75
const TERMINAL_MOUNT_THRESHOLD = 20

const handleGlobalKeyDown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape' && isSettingsModalOpen()) {
    e.preventDefault()
    closeSettingsModal()
    return
  }

  if (!isModKey(e)) return

  if (e.key === '`') {
    e.preventDefault()
    toggleTerminal()
  } else if (e.key.toLowerCase() === 'p' && !e.shiftKey) {
    e.preventDefault()
    toggleQuickOpen()
  } else if (e.key.toLowerCase() === 'f' && e.shiftKey) {
    e.preventDefault()
    setCurrentView('search')
  } else if (e.key === ',') {
    e.preventDefault()
    toggleSettingsModal()
  }
}

const App: Component = () => {
  const [terminalMounted, setTerminalMounted] = createSignal(false)
  const [isDragging, setIsDragging] = createSignal(false)
  let terminalBoxRef: HTMLDivElement | undefined = undefined

  createEffect(() => {
    if (isTerminalOpen() && terminalHeight() >= TERMINAL_MOUNT_THRESHOLD) {
      setTerminalMounted(true)
    }
  })

  const startResize = (e: PointerEvent): void => {
    e.preventDefault()
    setIsDragging(true)
    const startY = e.clientY
    const startHeight = isTerminalOpen() ? terminalHeight() : 0
    const maxHeight = window.innerHeight * MAX_TERMINAL_HEIGHT_RATIO
    let currentHeight = startHeight

    const onMove = (ev: PointerEvent): void => {
      const delta = startY - ev.clientY
      const next = startHeight + delta
      currentHeight = Math.round(Math.min(maxHeight, Math.max(0, next)))

      if (currentHeight > 0) {
        if (terminalSessions().length === 0) {
          addTerminal()
        }
        setIsTerminalOpen(true)
      }
      if (isTerminalOpen()) setTerminalHeight(currentHeight)
    }

    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.userSelect = ''
      setIsDragging(false)

      if (currentHeight < MIN_EXPANDED_HEIGHT) {
        setIsTerminalOpen(false)
        setTerminalHeight(DEFAULT_EXPANDED_HEIGHT)
      }
    }

    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  createEffect(() => {
    const accent = activeAccentColor()
    const hex = accent.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16) || 255
    const g = parseInt(hex.substring(2, 4), 16) || 102
    const b = parseInt(hex.substring(4, 6), 16) || 184
    document.documentElement.style.setProperty('--accent', accent)
    document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`)
  })

  onMount(async () => {
    window.addEventListener('keydown', handleGlobalKeyDown)
    if (!workspaceRoot() && window.api?.getWorkspaceRoot) {
      try {
        const root = await window.api.getWorkspaceRoot()
        if (root) navigateTo(root)
      } catch (err) {
        console.warn('Failed to get initial workspace root:', err)
      }
    }
  })
  onCleanup(() => window.removeEventListener('keydown', handleGlobalKeyDown))

  return (
    <div class="flex h-screen w-screen overflow-hidden bg-[#050505] text-[#ececec] font-['Inter',sans-serif] selection:bg-[var(--accent)]/15 selection:text-white">
      {/* Quick Open Modal (Ctrl+P / Cmd+P) */}
      <QuickOpenModal />

      {/* Monodrive Floating Settings Modal Sheet (Ctrl+, / Cmd+,) */}
      <SettingsModal />

      {/* Global Context Menu & Modals */}
      <ContextMenu />
      <FileActionModal />
      <PropertiesModal />

      {/* Ember-style Sidebar */}
      <Sidebar />

      {/* Main Workspace Column */}
      <div class="flex-1 flex flex-col min-w-0 mb-2 mr-4 ml-2.5 mt-2.5 transition-[margin-top] duration-200">
        {/* Top Navigation Bar sitting directly on the window/workspace base above the canvas */}
        <BrowserTopBar />

        {/* Main Canvas: Monodrive-Style Folder Browser */}
        <main class="relative z-10 flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden bg-[#0a0a0a] rounded-[20px]">
          <FolderView />
        </main>

        {/* Terminal Drawer in the dark below the canvas */}
        <div class="shrink-0 flex flex-col bg-[#050505] overflow-hidden">
          <div
            ref={(el) => (terminalBoxRef = el)}
            class="relative flex flex-col overflow-hidden bg-[#050505]"
            style={{
              height: isTerminalOpen() ? `${terminalHeight()}px` : '0px',
              transition: isDragging() ? 'none' : 'height 250ms cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onTransitionEnd={(e) => {
              if (e.target === terminalBoxRef) {
                window.dispatchEvent(new Event('resize'))
              }
            }}
          >
            {/* Invisible drag handle at the top edge */}
            <div
              class="absolute top-0 left-0 right-0 h-2 z-20 cursor-row-resize"
              onPointerDown={startResize}
            />

            <Show when={terminalMounted()}>
              <div
                class="relative overflow-hidden"
                style={{
                  height: `${terminalHeight()}px`,
                  width: '100%'
                }}
              >
                <For each={terminalSessions()}>
                  {(session) => (
                    <div
                      class="h-full w-full"
                      style={{
                        display: activeTerminalId() === session.id ? 'block' : 'none'
                      }}
                    >
                      <Terminal
                        sessionId={session.id}
                        cwd={session.cwd}
                        visible={isTerminalOpen() && activeTerminalId() === session.id}
                        onExit={() => closeTerminal(session.id)}
                      />
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>

          {/* Status Bar: normal text on black, below the terminal */}
          <StatusBar onDragStart={startResize} />
        </div>
      </div>
    </div>
  )
}

export default App
