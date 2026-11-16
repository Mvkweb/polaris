import { Component, createSignal, createEffect, on, onMount, onCleanup, For, Show } from 'solid-js'
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
  refreshFileExplorer,
  activeTabPath
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

/** Horizontal step per depth level, and where a row's 16px icon slot starts. */
const INDENT = 14
const ROW_PAD = 6
const guideLeft = (depth: number): number => depth * INDENT + ROW_PAD + 7.5

/** Folder whose children hold the active file — its indent guide lights up (Zed's active scope). */
const activeScopeDir = (): string | null => {
  const p = selectedFilePath() ?? activeTabPath()
  return p ? getParentDir(p) : null
}

const ChevronIcon = (props: { open: boolean }) => (
  <svg
    viewBox="0 0 16 16"
    aria-hidden="true"
    class="ft-chevron w-3.5 h-3.5"
    classList={{ 'ft-chevron-open': props.open }}
  >
    <use href="#file-tree-icon-chevron" />
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
    setSelectedFilePath(props.entry.path)
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

  const isActiveScope = () => props.entry.isDirectory && activeScopeDir() === props.entry.path

  return (
    <div class="ft-item flex flex-col select-none">
      {/* Row */}
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        class={`group relative flex items-center h-[26px] rounded-md cursor-pointer text-[13px] transition-colors duration-100 pr-2 ${
          isSelected()
            ? 'ft-row-selected text-white'
            : 'text-white/70 hover:text-white hover:bg-white/[0.045]'
        }`}
        style={{ 'padding-left': `${props.depth * INDENT + ROW_PAD}px` }}
        title={props.entry.path}
      >
        {/* Icon slot: chevron for folders (Pierre/T3 style), file-type icon for files */}
        <Show
          when={props.entry.isDirectory}
          fallback={<FileIcon name={props.entry.name} isDirectory={false} class="mr-2" />}
        >
          <span
            class={`w-4 h-4 mr-2 flex items-center justify-center shrink-0 transition-colors ${
              isOpen() ? 'text-white/70' : 'text-white/35 group-hover:text-white/70'
            }`}
          >
            <ChevronIcon open={isOpen()} />
          </span>
        </Show>

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

      {/* Children: stay mounted once loaded so expand/collapse can animate */}
      <Show when={props.entry.isDirectory && children()}>
        <div class="ft-collapse" classList={{ 'ft-open': isOpen() }}>
          <div class="ft-collapse-inner">
            <span
              class="ft-guide"
              classList={{ 'ft-guide-active': isActiveScope() }}
              style={{ left: `${guideLeft(props.depth)}px` }}
            />
            <For each={children()}>
              {(child) => (
                <FileTreeItem entry={child} depth={props.depth + 1} onFileClick={props.onFileClick} />
              )}
            </For>
          </div>
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

  // Re-root when the workspace changes elsewhere (browser navigation, project switch)
  createEffect(on(workspaceRoot, () => refreshWorkspace(), { defer: true }))

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
        .ft-chevron { transform: rotate(-90deg); transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1); }
        .ft-chevron-open { transform: rotate(0deg); }
        .ft-row-selected {
          background: color-mix(in oklab, var(--accent, #fff) 14%, rgb(255 255 255 / 0.05));
          box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--accent, #fff) 22%, transparent);
        }
        .ft-collapse {
          display: grid;
          grid-template-rows: 0fr;
          opacity: 0;
          transition: grid-template-rows 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 160ms ease;
        }
        .ft-collapse.ft-open { grid-template-rows: 1fr; opacity: 1; }
        .ft-collapse-inner { position: relative; min-height: 0; overflow: hidden; display: flex; flex-direction: column; }
        .ft-guide {
          position: absolute; top: 0; bottom: 3px; width: 1px; pointer-events: none; z-index: 1;
          background: rgb(255 255 255 / 0.07);
          transform-origin: top;
          transition: background-color 180ms ease;
        }
        .ft-open > .ft-collapse-inner > .ft-guide { animation: ft-guide-in 380ms cubic-bezier(0.16, 1, 0.3, 1) 30ms both; }
        @keyframes ft-guide-in { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        .ft-guide.ft-guide-active { background: color-mix(in oklab, var(--accent, #fff) 60%, transparent); }
        .ft-open > .ft-collapse-inner > .ft-item { animation: ft-item-in 240ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        .ft-open > .ft-collapse-inner > .ft-item:nth-child(2) { animation-delay: 0ms; }
        .ft-open > .ft-collapse-inner > .ft-item:nth-child(3) { animation-delay: 14ms; }
        .ft-open > .ft-collapse-inner > .ft-item:nth-child(4) { animation-delay: 28ms; }
        .ft-open > .ft-collapse-inner > .ft-item:nth-child(5) { animation-delay: 42ms; }
        .ft-open > .ft-collapse-inner > .ft-item:nth-child(6) { animation-delay: 56ms; }
        .ft-open > .ft-collapse-inner > .ft-item:nth-child(n + 7) { animation-delay: 70ms; }
        @keyframes ft-item-in {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: none; }
        }
        .ft-root-in > .ft-item { animation: ft-item-in 260ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .ft-chevron, .ft-collapse, .ft-guide { transition: none; }
          .ft-item, .ft-guide { animation: none !important; }
        }
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
      <div class="px-2.5 py-1 flex items-center justify-between text-white/40 text-[12px] font-semibold">
        <div class="flex items-center gap-1.5 min-w-0">
          <Show
            when={isSearchActive()}
            fallback={
              <>
                <span class="truncate text-white/70">{rootFolderTitle()}</span>
              </>
            }
          >
            <span class="text-white/70">Results</span>
            <span class="text-white/30 font-normal tabular-nums">{searchResults().length}</span>
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
        class="flex flex-col px-0.5 pt-0.5 pb-6 min-h-0"
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
              <div class="ft-root-in flex flex-col">
                <For each={rootEntries()}>
                  {(entry) => (
                    <FileTreeItem entry={entry} depth={0} onFileClick={handleFileSelect} />
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </Show>
      </div>
    </div>
  )
}

export default FileTree
