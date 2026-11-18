import { createSignal, onCleanup, onMount, Show, type Component } from 'solid-js'
import {
  activeAccentColor,
  currentView,
  explorerMode,
  isSidebarPinned,
  openContextMenu,
  refreshGitData,
  selectedCommitHash,
  setCurrentNote,
  setCurrentView,
  setIsSidebarPinned,
  setSelectedCommitHash,
  workspaceRoot
} from '../store'
import { initialFiles } from '../fixtures/sidebar'
import { isModKey, matchesShortcut } from '../shortcuts'
import type { FileNode } from '../types'
import { AnimatedGradient } from './dithercn/animated-gradient'
import FileTree from './file-tree/FileTree'
import SearchPanel from './search/SearchPanel'
import { createSidebarDrives } from './sidebar/Drives'
import { createGitActivity } from './sidebar/GitActivity'
import { createSidebarPlaces } from './sidebar/Places'
import { activeSidebarView, createSidebarHeader, cycleScopeView } from './sidebar/SidebarHeader'
import { UpdateFooter } from './UpdateFooter'

const Sidebar: Component = () => {
  const [isHovered, setIsHovered] = createSignal(false)
  const [isNewNoteModalOpen, setIsNewNoteModalOpen] = createSignal(false)
  const [newNoteName, setNewNoteName] = createSignal('')
  const [searchQuery, setSearchQuery] = createSignal('')
  const [_files, setFiles] = createSignal<FileNode[]>(initialFiles)

  const { Places, activePlaceId, clearActivePlace } = createSidebarPlaces()
  const Drives = createSidebarDrives(activePlaceId, clearActivePlace)
  const { GitActivity, filteredCommits } = createGitActivity(searchQuery)

  const handleNewAction = (): void => {
    if (currentView() === 'tasks') {
      refreshGitData()
    } else {
      setIsNewNoteModalOpen(true)
    }
  }

  const handleCreateNote = (): void => {
    if (!newNoteName().trim()) return
    const name = newNoteName().trim().endsWith('.md')
      ? newNoteName().trim()
      : `${newNoteName().trim()}.md`
    const newFile: FileNode = {
      name,
      is_dir: false,
      last_modified: Date.now()
    }
    setFiles((prev) => [newFile, ...prev])
    setNewNoteName('')
    setIsNewNoteModalOpen(false)
    setCurrentNote(name.replace('.md', ''))
    setCurrentView('editor')
  }

  const isVisible = (): boolean => isSidebarPinned() || isHovered()

  const { Header, openSearch } = createSidebarHeader(searchQuery, setSearchQuery, handleNewAction)

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (matchesShortcut(e, 'toggle_sidebar')) {
      e.preventDefault()
      setIsSidebarPinned(!isSidebarPinned())
      return
    }

    if (matchesShortcut(e, 'cycle_scope')) {
      e.preventDefault()
      cycleScopeView()
      return
    }

    if (
      currentView() === 'tasks' &&
      e.type === 'keydown' &&
      isModKey(e) &&
      e.shiftKey &&
      (e.key === 'ArrowUp' || e.key === 'ArrowDown')
    ) {
      const list = filteredCommits()
      if (list.length === 0) return
      e.preventDefault()
      const currentIdx = list.findIndex((c) => c.hash === selectedCommitHash())
      const delta = e.key === 'ArrowDown' ? 1 : -1
      const nextIdx = currentIdx === -1 ? 0 : (currentIdx + delta + list.length) % list.length
      setSelectedCommitHash(list[nextIdx].hash)
      return
    }

    if (matchesShortcut(e, 'new_item')) {
      const target = e.target as HTMLElement | null
      const isInsideEditor =
        Boolean(target?.closest('main')) || Boolean(document.activeElement?.closest('main'))
      if (isInsideEditor) return

      e.preventDefault()
      handleNewAction()
      return
    }

    if (matchesShortcut(e, 'find_in_files')) {
      e.preventDefault()
      openSearch()
      return
    }

    if (matchesShortcut(e, 'sidebar_search')) {
      const target = e.target as HTMLElement | null
      const isInsideEditor =
        Boolean(target?.closest('main')) ||
        Boolean(document.activeElement?.closest('main')) ||
        Boolean(document.activeElement?.closest('.cm-editor'))

      if (isInsideEditor) {
        return
      }

      e.preventDefault()
      openSearch()
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyDown)
    refreshGitData()
    window.addEventListener('focus', refreshGitData)

    onCleanup(() => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyDown)
      window.removeEventListener('focus', refreshGitData)
    })
  })

  return (
    <>
      <div
        class="fixed left-0 top-0 bottom-0 w-3 z-[60]"
        style={{ 'pointer-events': isSidebarPinned() ? 'none' : 'auto' }}
        onMouseEnter={() => setIsHovered(true)}
      />

      <div
        class="shrink-0 h-full relative z-20"
        style={{
          width: isVisible() ? '260px' : '0px',
          overflow: 'hidden',
          transition: 'width 350ms cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <aside
          class="absolute left-0 top-0 bottom-0 w-[260px] bg-[#050505] border-r border-white/[0.06] flex flex-col overflow-hidden z-20 will-change-transform select-none"
          style={{
            transform: isVisible() ? 'translate3d(0,0,0)' : 'translate3d(-100%,0,0)',
            transition: 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div class="w-[260px] h-full flex flex-col text-white relative">
            <div class="absolute top-0 left-0 right-0 h-[120px] pointer-events-none select-none overflow-hidden opacity-50 [mask-image:linear-gradient(to_bottom,black_30%,transparent_100%)]">
              <AnimatedGradient
                preset="Mist"
                color1="#050505"
                color2={activeAccentColor()}
                color3="#050505"
                speed={8}
                softness={100}
                distortion={4}
                swirl={55}
                scale={0.5}
                class="w-full h-full"
              />
            </div>

            <Header />

            <div
              onContextMenu={(e) => {
                if (activeSidebarView() === 'files' || activeSidebarView() === 'editor') {
                  e.preventDefault()
                  openContextMenu(e.clientX, e.clientY, {
                    path: workspaceRoot(),
                    isDirectory: true
                  })
                }
              }}
              class="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-px pb-3 pl-2 pr-1.5"
            >
              <Show when={activeSidebarView() === 'search'}>
                <SearchPanel />
              </Show>
              <Show when={activeSidebarView() === 'files' || activeSidebarView() === 'editor'}>
                <Show
                  when={!searchQuery() && explorerMode() === 'places'}
                  fallback={
                    <div class="flex flex-col animate-[explorer-mode-in_220ms_cubic-bezier(0.16,1,0.3,1)]">
                      <FileTree searchQuery={searchQuery()} />
                    </div>
                  }
                >
                  <Places />
                  <Drives />
                </Show>
              </Show>

              <Show when={activeSidebarView() === 'tasks'}>
                <GitActivity />
              </Show>
            </div>
            <UpdateFooter />
          </div>
        </aside>
      </div>
      <Show when={isNewNoteModalOpen()}>
        <div class="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            class="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
            onClick={() => setIsNewNoteModalOpen(false)}
          />

          <div class="relative w-[400px] bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.08)] overflow-hidden flex flex-col animate-[scaleUp_300ms_cubic-bezier(0.16,1,0.3,1)]">
            <div class="px-5 pt-5 pb-4 border-b border-white/[0.06]">
              <h2 class="text-[16px] font-bold text-white/90">Create New Note</h2>
              <p class="text-[13px] text-white/40 mt-1">
                Enter a title for your new markdown file.
              </p>
            </div>

            <div class="p-5">
              <input
                type="text"
                value={newNoteName()}
                onInput={(e) => setNewNoteName(e.currentTarget.value)}
                placeholder="e.g. Brainstorming Session"
                class="w-full h-[40px] bg-black/40 border border-white/10 rounded-lg px-3 text-[14px] text-white placeholder:text-white/20 outline-none focus:border-[var(--accent)] focus:bg-white/[0.02] transition-colors shadow-inner"
                autofocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNote()
                  if (e.key === 'Escape') {
                    setIsNewNoteModalOpen(false)
                    setNewNoteName('')
                  }
                }}
              />
            </div>

            <div class="px-5 py-4 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsNewNoteModalOpen(false)
                  setNewNoteName('')
                }}
                class="px-4 h-[32px] rounded-md text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNote}
                class="px-4 h-[32px] rounded-md text-[13px] font-medium text-black bg-white hover:bg-white/90 transition-colors cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </Show>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  )
}

export default Sidebar
