import {
  Component,
  createSignal,
  createEffect,
  createMemo,
  For,
  Show,
  onMount,
  onCleanup
} from 'solid-js'
import {
  workspaceRoot,
  navigateTo,
  navigateBack,
  selectedGridEntry,
  setSelectedGridEntry,
  explorerRefreshTrigger,
  browserSearchFilter
} from '../../store'
import {
  MonodriveFolderIcon,
  MonodriveFileIcon,
  ImageThumbnail
} from './MonodriveIcons'
import type { FsEntry, SystemDrive } from '../../types'
import emberLogo from '../../assets/ember-logo.svg'

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'ico'])

export const FolderView: Component = () => {
  const [entries, setEntries] = createSignal<FsEntry[]>([])
  const [isLoading, setIsLoading] = createSignal(false)
  const [drives, setDrives] = createSignal<SystemDrive[]>([])

  onMount(async () => {
    try {
      if (window.api?.getSystemDrives) {
        const result = await window.api.getSystemDrives()
        if (result && result.length > 0) {
          setDrives(result)
        }
      }
    } catch (err) {
      console.warn('Failed to fetch system drives for FolderView:', err)
    }
  })

  // Load directory entries reactively
  createEffect(async () => {
    const root = workspaceRoot() || '/mnt/storage/polaris'
    explorerRefreshTrigger()

    setIsLoading(true)
    try {
      if (window.api?.readDirectory) {
        const result = await window.api.readDirectory(root)
        setEntries(result || [])
      }
    } catch (err) {
      console.error('Failed to read directory in FolderView:', err)
      setEntries([])
    } finally {
      setIsLoading(false)
    }
  })

  const filteredEntries = createMemo(() => {
    const q = browserSearchFilter().trim().toLowerCase()
    const list = entries()
    if (!q) return list
    return list.filter((item) => item.name.toLowerCase().includes(q))
  })

  const currentPath = () => workspaceRoot() || '/mnt/storage/polaris'

  // Volume free space lookup
  const currentDrive = createMemo(() => {
    const list = drives()
    if (!list.length) return undefined
    const path = currentPath()
    return (
      [...list]
        .sort((a, b) => b.mountPoint.length - a.mountPoint.length)
        .find(
          (d) =>
            path === d.mountPoint ||
            path.startsWith(d.mountPoint === '/' ? '/' : `${d.mountPoint}/`)
        ) || list[0]
    )
  })

  const handleItemClick = (entry: FsEntry): void => {
    setSelectedGridEntry(entry.path)
  }

  const handleItemDoubleClick = async (entry: FsEntry): Promise<void> => {
    if (entry.isDirectory) {
      navigateTo(entry.path)
    } else {
      if (window.api?.openPath) {
        await window.api.openPath(entry.path)
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement) return

    const items = filteredEntries()
    if (items.length === 0) return

    const selected = selectedGridEntry()
    const currentIndex = items.findIndex((item) => item.path === selected)

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
      setSelectedGridEntry(items[nextIndex].path)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
      setSelectedGridEntry(items[prevIndex].path)
    } else if (e.key === 'Enter') {
      if (currentIndex >= 0) {
        e.preventDefault()
        handleItemDoubleClick(items[currentIndex])
      }
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      navigateBack()
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return (
    <div class="flex-1 flex flex-col h-full w-full select-none overflow-hidden bg-transparent text-white">
      {/* ── Monodrive Central Icon Grid Canvas ── */}
      <main class="flex-1 overflow-y-auto px-6 py-5 outline-none" tabIndex={0}>
        <Show
          when={!isLoading() && filteredEntries().length > 0}
          fallback={
            <Show
              when={!isLoading()}
              fallback={
                <div class="h-full flex items-center justify-center text-white/30 text-[13px]">
                  Loading folder...
                </div>
              }
            >
              {/* Empty Folder State */}
              <div class="h-full flex flex-col items-center justify-center text-center p-6 select-none animate-[fadeIn_200ms_ease-out]">
                <img src={emberLogo} alt="Ember" draggable={false} class="w-16 h-16 opacity-20 mb-3" />
                <span class="text-[14px] font-medium text-white/40">Empty Folder</span>
                <span class="text-[12px] text-white/25 mt-1">
                  {browserSearchFilter()
                    ? `No items match "${browserSearchFilter()}"`
                    : 'This folder contains no files or subdirectories.'}
                </span>
              </div>
            </Show>
          }
        >
          {/* Responsive Icon Grid */}
          <div class="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-4">
            <For each={filteredEntries()}>
              {(entry) => {
                const isSelected = () => selectedGridEntry() === entry.path
                const isImage = () => {
                  const ext = (entry.extension || entry.name.split('.').pop() || '').toLowerCase()
                  return !entry.isDirectory && IMAGE_EXTENSIONS.has(ext)
                }

                return (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleItemClick(entry)}
                    onDblClick={() => handleItemDoubleClick(entry)}
                    class={`group relative flex flex-col items-center pt-2 pb-2.5 px-1.5 rounded-xl transition-all duration-150 cursor-pointer select-none outline-none ${
                      isSelected()
                        ? 'bg-white/[0.12] ring-1 ring-white/20 shadow-sm'
                        : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    {/* Icon / Image Thumbnail Container */}
                    <div class="w-16 h-16 flex items-center justify-center mb-1.5 group-hover:scale-[1.03] transition-transform duration-150">
                      <Show
                        when={entry.isDirectory}
                        fallback={
                          <Show
                            when={isImage()}
                            fallback={
                              <MonodriveFileIcon
                                name={entry.name}
                                extension={entry.extension}
                              />
                            }
                          >
                            <ImageThumbnail path={entry.path} name={entry.name} />
                          </Show>
                        }
                      >
                        <MonodriveFolderIcon />
                      </Show>
                    </div>

                    {/* Filename Label (Centered, 2-line clamp with ellipsis) */}
                    <span
                      class={`w-full text-center text-[11.5px] leading-tight px-1 break-words line-clamp-2 transition-colors ${
                        isSelected() ? 'text-white font-semibold' : 'text-white/80 group-hover:text-white'
                      }`}
                      title={entry.name}
                    >
                      {entry.name}
                    </span>
                  </div>
                )
              }}
            </For>
          </div>
        </Show>
      </main>

      {/* ── Monodrive Clean Seamless Footer Status Bar ── */}
      <footer class="shrink-0 h-7 px-6 bg-transparent flex items-center justify-between text-[11px] font-mono text-white/35 select-none">
        <div class="flex items-center gap-1.5">
          <span>{filteredEntries().length} items</span>
          <Show when={currentDrive()?.freeSpace}>
            <span class="text-white/20">•</span>
            <span>{currentDrive()?.freeSpace}</span>
          </Show>
        </div>

        <div class="truncate max-w-[320px] text-white/25" title={currentPath()}>
          {currentPath()}
        </div>
      </footer>
    </div>
  )
}

export default FolderView
