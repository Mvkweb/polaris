import { Component, createSignal, createEffect, onMount, onCleanup, For, Show } from 'solid-js'
import type { FsEntry } from '../../types'
import {
  workspaceRoot,
  setWorkspaceRoot,
  selectedFilePath,
  setSelectedFilePath,
  openFileInEditor,
  isFileDirty,
  hasDirtyDescendant,
  lastSavedPath,
  openContextMenu,
  explorerRefreshTrigger,
  collapseAllFoldersTrigger,
  inlineRenameState,
  startInlineRename,
  cancelInlineRename,
  renameOpenFile,
  refreshFileExplorer
} from '../../store'
import { FileIcon } from './FileIcon'

interface FileTreeItemProps {
  entry: FsEntry
  depth: number
  onFileClick: (entry: FsEntry) => void
}

const INVALID_CHARS_REGEX = /[<>:"/\\|?*]/

const getParentDir = (p: string): string => {
  const sep = p.includes('\\') ? '\\' : '/'
  const parts = p.replace(/[/\\]+$/, '').split(/[/\\]/)
  parts.pop()
  return parts.join(sep) || sep
}

const getBasename = (p: string): string => {
  const parts = p.replace(/[/\\]+$/, '').split(/[/\\]/)
  return parts.at(-1) || ''
}

const handleTreeKeyDown = (e: KeyboardEvent): void => {
  if (e.key === 'F2') {
    const target = e.target as HTMLElement | null
    const isEditing =
      target?.tagName === 'INPUT' ||
      target?.tagName === 'TEXTAREA' ||
      Boolean(target?.closest('.cm-editor')) ||
      Boolean(document.activeElement?.closest('.cm-editor'))

    if (isEditing) return

    const sel = selectedFilePath()
    if (sel && !inlineRenameState()) {
      const name = getBasename(sel)
      if (name) {
        e.preventDefault()
        e.stopPropagation()
        startInlineRename(sel, name)
      }
    }
  }
}

const ChevronRightIcon = (props: { class?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    class={`w-3 h-3 transition-transform duration-150 ${props.class || ''}`}
  >
    <path
      fill-rule="evenodd"
      d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z"
      clip-rule="evenodd"
    />
  </svg>
)

const FileTreeItem: Component<FileTreeItemProps> = (props) => {
  let renameInputRef: HTMLInputElement | undefined = undefined
  const [isOpen, setIsOpen] = createSignal(false)
  const [children, setChildren] = createSignal<FsEntry[] | null>(null)
  const [isLoading, setIsLoading] = createSignal(false)
  const [renameValue, setRenameValue] = createSignal('')

  const isRenaming = () => inlineRenameState()?.path === props.entry.path

  createEffect(() => {
    if (isRenaming()) {
      setRenameValue(props.entry.name)
      setTimeout(() => {
        if (!renameInputRef) return
        renameInputRef.focus()
        const dotIdx = props.entry.name.lastIndexOf('.')
        if (dotIdx > 0 && !props.entry.isDirectory) {
          renameInputRef.setSelectionRange(0, dotIdx)
        } else {
          renameInputRef.select()
        }
      }, 30)
    }
  })

  const handleRenameSubmit = async (): Promise<void> => {
    const raw = renameValue().trim()
    const oldPath = props.entry.path
    const oldName = props.entry.name

    if (!raw || raw === oldName || INVALID_CHARS_REGEX.test(raw)) {
      cancelInlineRename()
      return
    }

    const dir = getParentDir(oldPath)
    const newFullPath = `${dir}/${raw}`

    cancelInlineRename()

    if (window.api?.renamePath) {
      try {
        const ok = await window.api.renamePath(oldPath, newFullPath)
        if (ok) {
          renameOpenFile(oldPath, newFullPath, raw)
          refreshFileExplorer()
        }
      } catch (err) {
        console.error('Rename failed:', err)
      }
    }
  }

  const handleRenameKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      handleRenameSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      cancelInlineRename()
    }
  }

  const handleRenameBlur = (): void => {
    if (isRenaming()) {
      handleRenameSubmit()
    }
  }

  const loadChildren = async (): Promise<void> => {
    if (children() !== null || isLoading()) return
    setIsLoading(true)
    try {
      if (window.api?.readDirectory) {
        const result = await window.api.readDirectory(props.entry.path)
        setChildren(result)
      } else {
        setChildren([])
      }
    } catch (err) {
      console.error('Failed to load folder children:', err)
      setChildren([])
    } finally {
      setIsLoading(false)
    }
  }

  const toggleOpen = (): void => {
    if (!props.entry.isDirectory) return
    const nextState = !isOpen()
    setIsOpen(nextState)
    if (nextState && children() === null) {
      loadChildren()
    }
  }

  const handleClick = (e: MouseEvent): void => {
    e.stopPropagation()
    if (isRenaming()) return
    if (props.entry.isDirectory) {
      toggleOpen()
    } else {
      props.onFileClick(props.entry)
    }
  }

  const handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    if (isRenaming()) return
    setSelectedFilePath(props.entry.path)
    openContextMenu(e.clientX, e.clientY, {
      path: props.entry.path,
      isDirectory: props.entry.isDirectory,
      name: props.entry.name
    })
  }

  createEffect(() => {
    if (collapseAllFoldersTrigger() > 0 && props.entry.isDirectory) {
      setIsOpen(false)
    }
  })

  createEffect(() => {
    if (explorerRefreshTrigger() > 0 && isOpen() && props.entry.isDirectory) {
      if (window.api?.readDirectory) {
        window.api
          .readDirectory(props.entry.path)
          .then((result) => {
            setChildren(result)
          })
          .catch(console.error)
      }
    }
  })

  const isSelected = () => selectedFilePath() === props.entry.path

  return (
    <div class="flex flex-col select-none">
      {/* Row */}
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        class={`group relative flex items-center h-[27px] rounded-md cursor-pointer text-[12.5px] transition-colors pr-2 ${
          isSelected()
            ? 'bg-white/[0.12] text-white font-medium shadow-xs'
            : 'text-white/75 hover:text-white hover:bg-white/[0.05]'
        }`}
        style={{
          'padding-left': `${props.depth * 13 + 6}px`
        }}
        title={props.entry.path}
      >
        {/* Indent Guide Line */}
        <Show when={props.depth > 0}>
          <div
            class="absolute top-0 bottom-0 pointer-events-none border-l border-white/[0.06]"
            style={{
              left: `${(props.depth - 1) * 13 + 12}px`
            }}
          />
        </Show>

        {/* Directory Chevron or Spacer */}
        <Show when={props.entry.isDirectory} fallback={<span class="w-3.5 h-3.5 mr-1 shrink-0" />}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleOpen()
            }}
            class="w-3.5 h-3.5 mr-1 flex items-center justify-center text-white/40 group-hover:text-white/80 shrink-0 hover:scale-110 transition-transform"
          >
            <ChevronRightIcon class={isOpen() ? 'rotate-90 text-white/70' : ''} />
          </button>
        </Show>

        {/* JetBrains Icon */}
        <FileIcon
          name={props.entry.name}
          isDirectory={props.entry.isDirectory}
          isExpanded={isOpen()}
          class="mr-2"
        />

        {/* File/Folder Name or Inline Rename Input */}
        <div class="relative flex-1 min-w-0 flex items-center h-full">
          <Show
            when={isRenaming()}
            fallback={<span class="truncate tracking-[-0.01em]">{props.entry.name}</span>}
          >
            <input
              ref={(el) => (renameInputRef = el)}
              type="text"
              value={renameValue()}
              onInput={(e) => setRenameValue(e.currentTarget.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={handleRenameBlur}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              class="w-full h-[22px] px-1.5 -ml-1.5 text-[12.5px] font-medium leading-none text-white bg-white/[0.08] border border-white/25 focus:border-white/40 focus:bg-black/80 rounded-[4px] outline-none font-sans tracking-[-0.01em] selection:bg-white/20 selection:text-white shadow-xs animate-[renameIn_120ms_cubic-bezier(0.16,1,0.3,1)]"
            />
          </Show>
        </div>

        {/* Unsaved / Saved Status Indicator */}
        <Show
          when={
            !props.entry.isDirectory &&
            isFileDirty(props.entry.path) &&
            lastSavedPath() !== props.entry.path
          }
        >
          <span
            class="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0"
            title="Unsaved changes"
          />
        </Show>

        {/* Recently Saved Pulse */}
        <Show when={!props.entry.isDirectory && lastSavedPath() === props.entry.path}>
          <span class="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Saved" />
        </Show>

        {/* Collapsed Directory Containing Dirty Descendant */}
        <Show when={props.entry.isDirectory && !isOpen() && hasDirtyDescendant(props.entry.path)}>
          <span
            class="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent)]/60 shrink-0"
            title="Contains unsaved files"
          />
        </Show>

        {/* Loading Spinner */}
        <Show when={isLoading()}>
          <span class="ml-auto w-2.5 h-2.5 border border-white/20 border-t-white/80 rounded-full animate-spin shrink-0" />
        </Show>
      </div>

      {/* Children list */}
      <Show when={props.entry.isDirectory && isOpen() && children()}>
        <div class="relative flex flex-col">
          <For each={children()}>
            {(child) => (
              <FileTreeItem entry={child} depth={props.depth + 1} onFileClick={props.onFileClick} />
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

const handleFileSelect = (entry: { path: string; name: string }): void => {
  openFileInEditor(entry.path, entry.name)
}

interface SearchResultItem {
  name: string
  path: string
  relativePath: string
}

interface SearchResultRowProps {
  res: SearchResultItem
  onFileClick: (entry: { path: string; name: string }) => void
}

const SearchResultRow: Component<SearchResultRowProps> = (props) => {
  let renameInputRef: HTMLInputElement | undefined = undefined
  const [renameValue, setRenameValue] = createSignal('')

  const isRenaming = () => inlineRenameState()?.path === props.res.path
  const isSelected = () => selectedFilePath() === props.res.path

  createEffect(() => {
    if (isRenaming()) {
      setRenameValue(props.res.name)
      setTimeout(() => {
        if (!renameInputRef) return
        renameInputRef.focus()
        const dotIdx = props.res.name.lastIndexOf('.')
        if (dotIdx > 0) {
          renameInputRef.setSelectionRange(0, dotIdx)
        } else {
          renameInputRef.select()
        }
      }, 30)
    }
  })

  const handleRenameSubmit = async (): Promise<void> => {
    const raw = renameValue().trim()
    const oldPath = props.res.path
    const oldName = props.res.name

    if (!raw || raw === oldName || INVALID_CHARS_REGEX.test(raw)) {
      cancelInlineRename()
      return
    }

    const dir = getParentDir(oldPath)
    const newFullPath = `${dir}/${raw}`

    cancelInlineRename()

    if (window.api?.renamePath) {
      try {
        const ok = await window.api.renamePath(oldPath, newFullPath)
        if (ok) {
          renameOpenFile(oldPath, newFullPath, raw)
          refreshFileExplorer()
        }
      } catch (err) {
        console.error('Rename failed:', err)
      }
    }
  }

  const handleRenameKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      handleRenameSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      cancelInlineRename()
    }
  }

  const handleRenameBlur = (): void => {
    if (isRenaming()) {
      handleRenameSubmit()
    }
  }

  return (
    <div
      onClick={() => props.onFileClick(props.res)}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (isRenaming()) return
        setSelectedFilePath(props.res.path)
        openContextMenu(e.clientX, e.clientY, {
          path: props.res.path,
          isDirectory: false,
          name: props.res.name
        })
      }}
      class={`group flex items-center h-[28px] px-2 rounded-md cursor-pointer text-[12.5px] transition-colors gap-2 ${
        isSelected()
          ? 'bg-white/[0.12] text-white font-medium'
          : 'text-white/75 hover:text-white hover:bg-white/[0.05]'
      }`}
      title={props.res.path}
    >
      <FileIcon name={props.res.name} isDirectory={false} class="shrink-0" />
      <div class="relative flex-1 min-w-0 flex items-center h-full">
        <Show
          when={isRenaming()}
          fallback={<span class="truncate font-medium text-white/90">{props.res.name}</span>}
        >
          <input
            ref={(el) => (renameInputRef = el)}
            type="text"
            value={renameValue()}
            onInput={(e) => setRenameValue(e.currentTarget.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameBlur}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            class="w-full h-[22px] px-1.5 -ml-1.5 text-[12.5px] font-medium leading-none text-white bg-white/[0.08] border border-white/25 focus:border-white/40 focus:bg-black/80 rounded-[4px] outline-none font-sans tracking-[-0.01em] selection:bg-white/20 selection:text-white shadow-xs animate-[renameIn_120ms_cubic-bezier(0.16,1,0.3,1)]"
          />
        </Show>
      </div>
      <Show when={isFileDirty(props.res.path) && lastSavedPath() !== props.res.path}>
        <span
          class="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0"
          title="Unsaved changes"
        />
      </Show>
      <Show when={lastSavedPath() === props.res.path}>
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Saved" />
      </Show>
      <span class="ml-auto text-[10.5px] text-white/30 truncate max-w-[110px] font-mono group-hover:text-white/50">
        {props.res.relativePath}
      </span>
    </div>
  )
}

interface FileTreeProps {
  searchQuery?: string
}

export const FileTree: Component<FileTreeProps> = (props) => {
  const [rootEntries, setRootEntries] = createSignal<FsEntry[]>([])
  const [isLoading, setIsLoading] = createSignal(false)
  const [rootFolderTitle, setRootFolderTitle] = createSignal<string>('PROJECT')

  // Fast workspace search results
  const [searchResults, setSearchResults] = createSignal<SearchResultItem[]>([])
  const [isSearching, setIsSearching] = createSignal(false)

  const refreshWorkspace = async (): Promise<void> => {
    setIsLoading(true)
    try {
      let root = workspaceRoot()
      if (!root && window.api?.getWorkspaceRoot) {
        root = await window.api.getWorkspaceRoot()
        if (root) {
          setWorkspaceRoot(root)
        }
      }

      if (root) {
        const parts = root.replace(/\\/g, '/').split('/')
        const folderName = parts.findLast(Boolean) || 'PROJECT'
        setRootFolderTitle(folderName)

        if (window.api?.readDirectory) {
          const entries = await window.api.readDirectory(root)
          setRootEntries(entries)
        }
      }
    } catch (err) {
      console.error('Failed to load workspace file tree:', err)
    } finally {
      setIsLoading(false)
    }
  }

  onMount(() => {
    refreshWorkspace()
    window.addEventListener('keydown', handleTreeKeyDown)
    onCleanup(() => {
      window.removeEventListener('keydown', handleTreeKeyDown)
    })
  })

  // Watch for external explorer refresh triggers (new file, rename, trash, paste, etc.)
  createEffect(() => {
    if (explorerRefreshTrigger() > 0) {
      refreshWorkspace()
    }
  })

  const handleBackgroundContextMenu = (e: MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    openContextMenu(e.clientX, e.clientY, {
      path: workspaceRoot(),
      isDirectory: true,
      name: rootFolderTitle()
    })
  }

  // Debounced, ultra-fast backend search without touching folder trees
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  createEffect(() => {
    const q = props.searchQuery?.trim() || ''

    if (searchTimer) clearTimeout(searchTimer)

    if (!q) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    searchTimer = setTimeout(async () => {
      try {
        if (window.api?.searchFiles) {
          const results = await window.api.searchFiles(q)
          setSearchResults(results)
        } else {
          setSearchResults([])
        }
      } catch (err) {
        console.error('Search failed:', err)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 30)
  })

  onCleanup(() => {
    if (searchTimer) clearTimeout(searchTimer)
  })

  const isSearchActive = () => Boolean(props.searchQuery?.trim())

  return (
    <div
      class="w-full flex flex-col min-h-0 select-none"
      onContextMenu={handleBackgroundContextMenu}
    >
      <style>{`
        @keyframes renameIn {
          from {
            opacity: 0.5;
            transform: scale(0.98);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
      {/* Workspace Root Header */}
      <div class="px-3 py-1.5 flex items-center justify-between text-white/50 text-[11px] font-semibold tracking-wider uppercase">
        <div class="flex items-center gap-1.5 min-w-0">
          <Show
            when={isSearchActive()}
            fallback={
              <>
                <span class="truncate text-white/80 font-bold">{rootFolderTitle()}</span>
                <span class="text-[10px] text-white/35 font-normal">WORKSPACE</span>
              </>
            }
          >
            <span class="text-white/80 font-bold">SEARCH RESULTS</span>
            <span class="text-[10px] text-white/35 font-normal">({searchResults().length})</span>
          </Show>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={refreshWorkspace}
            title="Refresh File Explorer"
            class="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-white/40"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              class={`w-3 h-3 ${isLoading() ? 'animate-spin' : ''}`}
            >
              <path
                d="M13.5 8c0 3.038-2.462 5.5-5.5 5.5S2.5 11.038 2.5 8 4.962 2.5 8 2.5c1.88 0 3.535.94 4.53 2.378"
                stroke-linecap="round"
              />
              <path d="M13.5 2.5v3h-3" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content Container */}
      <div
        class="flex flex-col px-2 pb-6 min-h-0 overflow-y-auto no-scrollbar"
        onContextMenu={handleBackgroundContextMenu}
      >
        {/* ── Search Mode (Instant flat list with relative paths) ── */}
        <Show when={isSearchActive()}>
          <Show
            when={!isSearching()}
            fallback={
              <div class="py-6 text-center text-white/30 text-[12px] flex items-center justify-center gap-2">
                <span class="w-3 h-3 border border-white/20 border-t-white/80 rounded-full animate-spin" />
                <span>Searching files...</span>
              </div>
            }
          >
            <Show
              when={searchResults().length > 0}
              fallback={
                <div class="py-8 px-3 text-center text-white/30 text-[12px]">
                  No matching files found
                </div>
              }
            >
              <For each={searchResults()}>
                {(res) => <SearchResultRow res={res} onFileClick={handleFileSelect} />}
              </For>
            </Show>
          </Show>
        </Show>

        {/* ── Normal Hierarchical File Tree (Never uncollapses on search) ── */}
        <Show when={!isSearchActive()}>
          <Show
            when={!isLoading() || rootEntries().length > 0}
            fallback={
              <div class="py-8 text-center text-white/30 text-[12px]">Loading project files...</div>
            }
          >
            <Show
              when={rootEntries().length > 0}
              fallback={
                <div class="py-8 px-3 text-center text-white/30 text-[12px]">No files found</div>
              }
            >
              <For each={rootEntries()}>
                {(entry) => <FileTreeItem entry={entry} depth={0} onFileClick={handleFileSelect} />}
              </For>
            </Show>
          </Show>
        </Show>
      </div>
    </div>
  )
}

export default FileTree
