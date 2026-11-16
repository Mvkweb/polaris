import { Component, createMemo, createSignal, For, onMount, Show } from 'solid-js'
import {
  contextMenuState,
  closeContextMenu,
  workspaceRoot,
  fileClipboard,
  setFileClipboard,
  openFileActionModal,
  startInlineRename,
  closeEditorTab,
  renameOpenFile,
  refreshFileExplorer,
  collapseAllFolders,
  addTerminal,
  setCurrentView,
  openPropertiesModal,
  openInspector,
  openStorageMapModal,
  openNewTab,
  navigateTo,
  openFileInEditor
} from '../../store'
import { isMac } from '../../shortcuts'
import { TerminalTileIcon } from './Icons'
import { EditorGlyph } from './EditorGlyph'
import { installedEditors, preferredEditor, rememberEditor, BUILTIN_EDITOR_ID } from '../../editors'
import type { ExternalEditor } from '../../types'
import ghosttyIcon from '../../assets/icons/ghostty.png'
import {
  DitherDropdownMenu,
  DitherDropdownMenuContent,
  DitherDropdownMenuGroup,
  DitherDropdownMenuItem,
  DitherDropdownMenuLabel,
  DitherDropdownMenuSeparator,
  DitherDropdownMenuShortcut,
  DitherDropdownMenuSub,
  DitherDropdownMenuSubContent,
  DitherDropdownMenuSubTrigger,
  DitherDropdownMenuTrigger
} from '@/components/dithercn/dither-dropdown-menu'

const getParentDir = (p: string): string => {
  const normalized = p.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  return lastSlash > 0 ? normalized.substring(0, lastSlash) : normalized
}

export const ContextMenu: Component = () => {
  const [hasGhostty, setHasGhostty] = createSignal(false)

  const isApple = isMac()
  const modKey = isApple ? 'Cmd' : 'Ctrl'
  const altKey = isApple ? 'Opt' : 'Alt'

  onMount(async () => {
    try {
      if (window.api?.isGhosttyInstalled) {
        const installed = await window.api.isGhosttyInstalled()
        setHasGhostty(installed)
      }
    } catch {
      setHasGhostty(false)
    }

  })

  const target = createMemo(() => contextMenuState().target)
  const isDrive = createMemo(() => Boolean(target()?.isDrive))
  const drive = createMemo(() => target()?.drive)
  const isItem = createMemo(() => Boolean(target()?.path && target()?.name))
  const isDirectory = createMemo(() => Boolean(target()?.isDirectory))
  const targetPath = createMemo(() => target()?.path || workspaceRoot())
  const targetDir = createMemo(() => (isDirectory() ? targetPath() : getParentDir(targetPath())))

  // ── Drive Actions ──
  const handleOpenDrive = (): void => {
    const p = targetPath()
    closeContextMenu()
    navigateTo(p)
  }

  const handleOpenDriveNewTab = (): void => {
    const p = targetPath()
    closeContextMenu()
    openNewTab(p)
  }

  const handleOpenDriveTerminal = (): void => {
    const p = targetPath()
    closeContextMenu()
    addTerminal(p)
  }

  const handleOpenStorageMap = (): void => {
    const p = targetPath()
    const name = drive()?.name || target()?.name || 'Drive'
    const x = contextMenuState().x
    const y = contextMenuState().y
    closeContextMenu()
    openStorageMapModal(p, name, x, y)
  }

  // ── Actions ──
  const handleNewFile = (): void => {
    const dir = targetDir()
    closeContextMenu()
    openFileActionModal('newFile', dir, '')
  }

  const handleNewFolder = (): void => {
    const dir = targetDir()
    closeContextMenu()
    openFileActionModal('newFolder', dir, '')
  }

  // Open the target with an external editor, or the built-in one when `editor` is null.
  const handleOpenWith = (editor: ExternalEditor | null): void => {
    const p = targetPath()
    const name = target()?.name || 'file'
    const dir = isDirectory() || !isItem()
    closeContextMenu()
    rememberEditor(editor?.id ?? BUILTIN_EDITOR_ID)
    if (editor) void window.api?.openInEditor(editor.id, p)
    else if (dir) navigateTo(p)
    else openFileInEditor(p, name)
  }

  const handleOpenInEditor = (): void => {
    const p = targetPath()
    const name = target()?.name || 'file'
    closeContextMenu()
    openFileInEditor(p, name)
  }

  const handleOpenInDefaultApp = (): void => {
    const p = targetPath()
    closeContextMenu()
    if (window.api?.openPath) {
      window.api.openPath(p)
    }
  }

  const handleOpenInTerminal = (): void => {
    const dir = targetDir()
    closeContextMenu()
    addTerminal(dir)
  }

  const handleOpenGhostty = async (): Promise<void> => {
    const dir = targetDir()
    closeContextMenu()
    if (window.api?.openGhostty) {
      await window.api.openGhostty(dir)
    }
  }

  const handleFindInFolder = (): void => {
    closeContextMenu()
    setCurrentView('search')
  }

  const handleCut = (): void => {
    const p = targetPath()
    closeContextMenu()
    setFileClipboard({ path: p, action: 'cut' })
  }

  const handleCopy = (): void => {
    const p = targetPath()
    closeContextMenu()
    setFileClipboard({ path: p, action: 'copy' })
  }

  const handleDuplicate = async (): Promise<void> => {
    const p = targetPath()
    closeContextMenu()
    const dir = getParentDir(p)
    const baseName = target()?.name || 'file'
    const dotIdx = baseName.lastIndexOf('.')
    const nameNoExt = dotIdx > 0 ? baseName.slice(0, dotIdx) : baseName
    const ext = dotIdx > 0 ? baseName.slice(dotIdx) : ''
    const newName = `${nameNoExt} copy${ext}`
    const dest = `${dir}/${newName}`

    if (window.api?.copyPath) {
      await window.api.copyPath(p, dest)
      refreshFileExplorer()
    }
  }

  const handlePaste = async (): Promise<void> => {
    const clip = fileClipboard()
    if (!clip) return
    const p = targetPath()
    const destDir = isDirectory() ? p : getParentDir(p)
    const src = clip.path
    const srcName =
      src
        .replace(/[/\\]+$/, '')
        .split(/[/\\]/)
        .pop() || 'item'
    const dest = `${destDir}/${srcName}`

    closeContextMenu()

    if (clip.action === 'cut') {
      if (window.api?.renamePath) {
        await window.api.renamePath(src, dest)
        renameOpenFile(src, dest, srcName)
        setFileClipboard(null)
        refreshFileExplorer()
      }
    } else if (clip.action === 'copy') {
      if (window.api?.copyPath) {
        await window.api.copyPath(src, dest)
        refreshFileExplorer()
      }
    }
  }

  const handleCopyPath = (): void => {
    const p = targetPath()
    closeContextMenu()
    navigator.clipboard?.writeText(p)
  }

  const handleCopyRelativePath = (): void => {
    const p = targetPath()
    const root = workspaceRoot()
    closeContextMenu()
    const rel = root && p.startsWith(root) ? p.slice(root.length).replace(/^[/\\]/, '') : p
    navigator.clipboard?.writeText(rel || '.')
  }

  const handleShowDetails = (): void => {
    const p = targetPath()
    closeContextMenu()
    openInspector(p)
  }

  const handleProperties = (): void => {
    const p = targetPath()
    closeContextMenu()
    openPropertiesModal(p)
  }

  const handleRename = (): void => {
    const p = targetPath()
    const name = target()?.name || ''
    closeContextMenu()
    if (p && name) {
      startInlineRename(p, name)
    }
  }

  const handleTrash = async (): Promise<void> => {
    const p = targetPath()
    closeContextMenu()
    if (window.api?.trashPath) {
      const ok = await window.api.trashPath(p)
      if (ok) {
        closeEditorTab(p)
        refreshFileExplorer()
      }
    }
  }

  const handleRefresh = (): void => {
    closeContextMenu()
    refreshFileExplorer()
  }

  const handleCollapseAll = (): void => {
    closeContextMenu()
    collapseAllFolders()
  }

  /** "Open With ›" — slides out to the side with every detected editor + terminals. */
  const OpenWithMenu = (props: { terminalShortcut?: string }) => (
    <DitherDropdownMenuSub>
      <DitherDropdownMenuSubTrigger variant="dither">
        <EditorGlyph editor={preferredEditor()} />
        <span>Open With</span>
      </DitherDropdownMenuSubTrigger>
      <DitherDropdownMenuSubContent class="min-w-[210px] border-0 shadow-[0_4px_16px_rgba(0,0,0,0.45)] bg-[#050506]">
        <DitherDropdownMenuLabel>Editors</DitherDropdownMenuLabel>
        <For each={installedEditors()}>
          {(editor) => (
            <DitherDropdownMenuItem variant="dither" onSelect={() => handleOpenWith(editor)}>
              <EditorGlyph editor={editor} />
              <span>{editor.name}</span>
              <Show when={preferredEditor()?.id === editor.id}>
                <DitherDropdownMenuShortcut>default</DitherDropdownMenuShortcut>
              </Show>
            </DitherDropdownMenuItem>
          )}
        </For>
        <DitherDropdownMenuItem variant="dither" onSelect={() => handleOpenWith(null)}>
          <EditorGlyph editor={null} />
          <span>Polaris</span>
          <DitherDropdownMenuShortcut>
            {preferredEditor() === null ? 'default' : 'built-in'}
          </DitherDropdownMenuShortcut>
        </DitherDropdownMenuItem>

        <DitherDropdownMenuSeparator />
        <DitherDropdownMenuLabel>Terminal</DitherDropdownMenuLabel>
        <DitherDropdownMenuItem variant="dither" onSelect={handleOpenInTerminal}>
          <TerminalTileIcon class="w-4 h-4 shrink-0 text-white/90" />
          <span>Polaris Terminal</span>
          <Show when={props.terminalShortcut}>
            <DitherDropdownMenuShortcut>{props.terminalShortcut}</DitherDropdownMenuShortcut>
          </Show>
        </DitherDropdownMenuItem>
        <Show when={hasGhostty()}>
          <DitherDropdownMenuItem variant="dither" onSelect={handleOpenGhostty}>
            <img src={ghosttyIcon} alt="" class="w-4 h-4 rounded-[3px] shrink-0 shadow-sm" />
            <span>Ghostty</span>
          </DitherDropdownMenuItem>
        </Show>

        <DitherDropdownMenuSeparator />
        <DitherDropdownMenuItem variant="dither" onSelect={handleOpenInDefaultApp}>
          <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4 text-white/70 shrink-0" stroke="currentColor" stroke-width="1.8">
            <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
          </svg>
          <span>System Default</span>
        </DitherDropdownMenuItem>
      </DitherDropdownMenuSubContent>
    </DitherDropdownMenuSub>
  )

  return (
    <DitherDropdownMenu
      open={contextMenuState().isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) closeContextMenu()
      }}
      variant="dither"
      menuVariant="card"
    >
      <DitherDropdownMenuTrigger
        as="div"
        class="fixed pointer-events-none opacity-0 w-0 h-0"
        style={{
          left: `${contextMenuState().x}px`,
          top: `${contextMenuState().y}px`
        }}
      />
      <DitherDropdownMenuContent class="min-w-[250px] max-w-[310px] max-h-[calc(100vh-48px)] overflow-y-auto no-scrollbar border-0 shadow-[0_4px_16px_rgba(0,0,0,0.45)] bg-[#050506]">
        <Show
          when={isDrive()}
          fallback={
            <Show
              when={isItem()}
              fallback={
            <DitherDropdownMenuGroup>
              <DitherDropdownMenuLabel>Workspace Actions</DitherDropdownMenuLabel>
              <DitherDropdownMenuItem variant="dither" onSelect={handleNewFile}>
                <span>New File</span>
                <DitherDropdownMenuShortcut>{modKey}+N</DitherDropdownMenuShortcut>
              </DitherDropdownMenuItem>

              <DitherDropdownMenuItem variant="dither" onSelect={handleNewFolder}>
                <span>New Folder</span>
                <DitherDropdownMenuShortcut>{modKey}+{altKey}+N</DitherDropdownMenuShortcut>
              </DitherDropdownMenuItem>

              <DitherDropdownMenuSeparator />

              <OpenWithMenu terminalShortcut={`${altKey}+Shift+F4`} />

              <DitherDropdownMenuSeparator />

              <DitherDropdownMenuItem
                variant="dither"
                disabled={!fileClipboard()}
                onSelect={handlePaste}
              >
                <span>Paste</span>
                <DitherDropdownMenuShortcut>{modKey}+V</DitherDropdownMenuShortcut>
              </DitherDropdownMenuItem>

              <DitherDropdownMenuSeparator />

              <DitherDropdownMenuItem variant="dither" onSelect={handleCopyPath}>
                <span>Copy Path</span>
              </DitherDropdownMenuItem>

              <DitherDropdownMenuSeparator />

              <DitherDropdownMenuItem variant="dither" onSelect={handleRefresh}>
                <span>Refresh Explorer</span>
              </DitherDropdownMenuItem>

              <DitherDropdownMenuItem variant="dither" onSelect={handleCollapseAll}>
                <span>Collapse All</span>
              </DitherDropdownMenuItem>

              <DitherDropdownMenuSeparator />

              <DitherDropdownMenuItem variant="dither" onSelect={handleShowDetails}>
                <span>Show Details</span>
                <DitherDropdownMenuShortcut>Space</DitherDropdownMenuShortcut>
              </DitherDropdownMenuItem>

              <DitherDropdownMenuItem variant="dither" onSelect={handleProperties}>
                <span>Properties</span>
                <DitherDropdownMenuShortcut>{altKey}+Enter</DitherDropdownMenuShortcut>
              </DitherDropdownMenuItem>
            </DitherDropdownMenuGroup>
          }
        >
          <DitherDropdownMenuGroup>
            <DitherDropdownMenuLabel>
              {isDirectory() ? 'Directory Actions' : 'File Operations'}
            </DitherDropdownMenuLabel>

            <Show when={isDirectory()}>
              <DitherDropdownMenuItem variant="dither" onSelect={handleNewFile}>
                <span>New File</span>
                <DitherDropdownMenuShortcut>{modKey}+N</DitherDropdownMenuShortcut>
              </DitherDropdownMenuItem>

              <DitherDropdownMenuItem variant="dither" onSelect={handleNewFolder}>
                <span>New Folder</span>
                <DitherDropdownMenuShortcut>{modKey}+{altKey}+N</DitherDropdownMenuShortcut>
              </DitherDropdownMenuItem>

              <DitherDropdownMenuSeparator />
            </Show>

            <Show when={!isDirectory()}>
              <DitherDropdownMenuItem variant="dither" onSelect={handleOpenInEditor}>
                <span>Open in Editor</span>
              </DitherDropdownMenuItem>
            </Show>

            <DitherDropdownMenuItem variant="dither" onSelect={handleOpenInDefaultApp}>
              <span>{isDirectory() ? 'Open Folder' : 'Open in Default App'}</span>
            </DitherDropdownMenuItem>

            <OpenWithMenu />

            <Show when={isDirectory()}>
              <DitherDropdownMenuItem variant="dither" onSelect={handleFindInFolder}>
                <span>Find in Folder...</span>
              </DitherDropdownMenuItem>
            </Show>

            <DitherDropdownMenuSeparator />

            <DitherDropdownMenuItem variant="dither" onSelect={handleCut}>
              <span>Cut</span>
              <DitherDropdownMenuShortcut>{modKey}+X</DitherDropdownMenuShortcut>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuItem variant="dither" onSelect={handleCopy}>
              <span>Copy</span>
              <DitherDropdownMenuShortcut>{modKey}+C</DitherDropdownMenuShortcut>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuItem variant="dither" onSelect={handleDuplicate}>
              <span>Duplicate</span>
              <DitherDropdownMenuShortcut>{modKey}+D</DitherDropdownMenuShortcut>
            </DitherDropdownMenuItem>

            <Show when={isDirectory()}>
              <DitherDropdownMenuItem
                variant="dither"
                disabled={!fileClipboard()}
                onSelect={handlePaste}
              >
                <span>Paste</span>
                <DitherDropdownMenuShortcut>{modKey}+V</DitherDropdownMenuShortcut>
              </DitherDropdownMenuItem>
            </Show>

            <DitherDropdownMenuSeparator />

            <DitherDropdownMenuItem variant="dither" onSelect={handleCopyPath}>
              <span>Copy Path</span>
              <DitherDropdownMenuShortcut>{modKey}+{altKey}+C</DitherDropdownMenuShortcut>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuItem variant="dither" onSelect={handleCopyRelativePath}>
              <span>Copy Relative Path</span>
              <DitherDropdownMenuShortcut>{modKey}+Shift+C</DitherDropdownMenuShortcut>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuSeparator />

            <DitherDropdownMenuItem variant="dither" onSelect={handleRename}>
              <span>Rename</span>
              <DitherDropdownMenuShortcut>F2</DitherDropdownMenuShortcut>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuItem
              variant="dither"
              destructive
              onSelect={handleTrash}
            >
              <span>Move to Trash</span>
              <DitherDropdownMenuShortcut>Del</DitherDropdownMenuShortcut>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuSeparator />

            <DitherDropdownMenuItem variant="dither" onSelect={handleShowDetails}>
              <span>Show Details</span>
              <DitherDropdownMenuShortcut>Space</DitherDropdownMenuShortcut>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuItem variant="dither" onSelect={handleProperties}>
              <span>Properties</span>
              <DitherDropdownMenuShortcut>{altKey}+Enter</DitherDropdownMenuShortcut>
            </DitherDropdownMenuItem>
          </DitherDropdownMenuGroup>
        </Show>
          }
        >
          <DitherDropdownMenuGroup>
            <DitherDropdownMenuLabel>{drive()?.name || 'Device Operations'}</DitherDropdownMenuLabel>

            <DitherDropdownMenuItem variant="dither" onSelect={handleOpenDrive}>
              <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4 text-white/80 shrink-0" stroke="currentColor" stroke-width="1.8">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span>Open</span>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuItem variant="dither" onSelect={handleOpenDriveNewTab}>
              <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4 text-white/80 shrink-0" stroke="currentColor" stroke-width="1.8">
                <path d="M19 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6M12 3h9v9M21 3l-10 10" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span>Open in New Tab</span>
              <DitherDropdownMenuShortcut>{modKey}+T</DitherDropdownMenuShortcut>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuItem variant="dither" onSelect={handleOpenDriveNewTab}>
              <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4 text-white/80 shrink-0" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M3 9h18M9 21V9" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span>Open in New Window</span>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuItem variant="dither" onSelect={handleOpenDriveNewTab}>
              <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4 text-white/80 shrink-0" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M12 3v18" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span>Open in Split View</span>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuItem variant="dither" onSelect={handleOpenDriveTerminal}>
              <TerminalTileIcon class="w-4 h-4 shrink-0 text-white/90" />
              <span>Open in Terminal</span>
              <DitherDropdownMenuShortcut>{altKey}+Shift+F4</DitherDropdownMenuShortcut>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuSeparator />

            <DitherDropdownMenuItem variant="dither" onSelect={handleOpenStorageMap} class="text-sky-300 group-hover:text-sky-200">
              <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4 text-sky-400 shrink-0" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="3" width="7" height="9" rx="1.5" stroke-linecap="round" stroke-linejoin="round" />
                <rect x="14" y="3" width="7" height="5" rx="1.5" stroke-linecap="round" stroke-linejoin="round" />
                <rect x="14" y="12" width="7" height="9" rx="1.5" stroke-linecap="round" stroke-linejoin="round" />
                <rect x="3" y="16" width="7" height="5" rx="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span class="font-medium">Inspect Storage Map</span>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 ml-auto">Zig</span>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuSeparator />

            <DitherDropdownMenuItem variant="dither" onSelect={() => closeContextMenu()} class="text-rose-400/90 group-hover:text-rose-300">
              <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4 text-rose-400 shrink-0" stroke="currentColor" stroke-width="1.8">
                <path d="M12 3l8 12H4l8-12zM4 19h16" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span>Unmount</span>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuItem variant="dither" onSelect={() => closeContextMenu()}>
              <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4 text-white/60 shrink-0" stroke="currentColor" stroke-width="1.8">
                <path d="M18.36 6.64a9 9 0 11-12.73 0M12 2v10" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span>Eject & Power Off</span>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuSeparator />

            <DitherDropdownMenuItem variant="dither" onSelect={() => closeContextMenu()}>
              <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4 text-white/60 shrink-0" stroke="currentColor" stroke-width="1.8">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span>Hide from Sidebar</span>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuItem variant="dither" onSelect={() => closeContextMenu()}>
              <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4 text-white/60 shrink-0" stroke="currentColor" stroke-width="1.8">
                <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span>Manage Places & Devices...</span>
            </DitherDropdownMenuItem>
          </DitherDropdownMenuGroup>
        </Show>
      </DitherDropdownMenuContent>
    </DitherDropdownMenu>
  )
}

export default ContextMenu
