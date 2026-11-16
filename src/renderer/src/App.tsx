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
import { StorageMapModal } from './components/modals/StorageMapModal'
import { MonodriveIconDefs } from './components/browser/MonodriveIcons'
import EditorPane from './components/editor/EditorPane'
import { InspectorDrawer } from './components/inspector/InspectorDrawer'
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
  toggleInspector,
  currentView,
  setCurrentView,
  isSettingsModalOpen,
  closeSettingsModal,
  toggleSettingsModal,
  workspaceRoot,
  navigateTo,
  isFilterTabActive,
  openPropertiesModal,
  activeTabPath,
  selectedGridEntry
} from './store'
import { isModKey } from './shortcuts'
import { useThemeVariables, useWallpaperTheme } from './theme'

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

  // Alt+Enter: full Properties modal for the selection (Explorer / Dolphin convention)
  if (e.key === 'Enter' && e.altKey && !e.ctrlKey && !e.metaKey && !e.defaultPrevented) {
    const el = document.activeElement as HTMLElement | null
    if (!el?.closest('input, textarea, [contenteditable="true"], .cm-editor, .xterm')) {
      const target =
        (currentView() === 'editor' ? activeTabPath() : selectedGridEntry()) || workspaceRoot()
      if (target) {
        e.preventDefault()
        openPropertiesModal(target)
        return
      }
    }
  }

  // Space peeks at the selection (Quick Look style) — only when nothing else wants
  // the key: not typing, not on a focused control, not in the editor or terminal.
  if (
    e.key === ' ' &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey &&
    !e.shiftKey &&
    !e.repeat &&
    !e.defaultPrevented
  ) {
    const el = document.activeElement as HTMLElement | null
    const busy = el?.closest(
      'input, textarea, select, button, a[href], [contenteditable="true"], [role="button"], [role="menuitem"], [role="option"], .cm-editor, .xterm'
    )
    // Grid tiles are role=button but don't use Space themselves — that's the peek target.
    if (!busy || busy.hasAttribute('data-grid-item')) {
      e.preventDefault()
      toggleInspector()
      return
    }
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

  useThemeVariables()
  useWallpaperTheme()

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
    <div class="flex h-screen w-screen overflow-hidden bg-[#050505] text-[#ececec] font-sans selection:bg-[var(--accent)]/15 selection:text-white">
      {/* Global SVG Gradients for high-performance folder/file icons */}
      <MonodriveIconDefs />

      {/* Quick Open Modal (Ctrl+P / Cmd+P) */}
      <QuickOpenModal />

      {/* Monodrive Floating Settings Modal Sheet (Ctrl+, / Cmd+,) */}
      <SettingsModal />

      {/* Global Context Menu & Modals */}
      <ContextMenu />
      <FileActionModal />
      <StorageMapModal />
      <PropertiesModal />

      {/* Ember-style Sidebar */}
      <Sidebar />

      {/* Main Workspace Column */}
      <div class="flex-1 flex flex-col min-w-0 mb-2 mr-4 ml-2.5 mt-2.5 transition-[margin-top] duration-200">
        {/* Top Navigation Bar sitting directly on the window/workspace base above the canvas */}
        <BrowserTopBar />

        {/* Canvas row: rounded canvas + inspector drawer sliding out sideways in the dark */}
        <div class="flex-1 min-h-0 min-w-0 flex flex-row">
          <main class="polaris-canvas relative z-10 flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden rounded-[20px]"
            style={{
              // Square the corner under the filter tab while it's melted in
              'border-top-right-radius': isFilterTabActive() ? '0px' : '20px',
              transition: 'border-top-right-radius 220ms cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <Show when={currentView() === 'editor'} fallback={<FolderView />}>
              <EditorPane />
            </Show>
          </main>
          <InspectorDrawer />
        </div>

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
