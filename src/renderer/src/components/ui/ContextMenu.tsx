import {
  Component,
  createMemo,
  createSignal,
  onMount,
  Show
} from 'solid-js'
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
  openPropertiesModal
} from '../../store'
import { isMac } from '../../shortcuts'
import { TerminalTileIcon, VsCodeTileIcon } from './Icons'
import ghosttyIcon from '../../assets/icons/ghostty.png'
import {
  DitherDropdownMenu,
  DitherDropdownMenuContent,
  DitherDropdownMenuGroup,
  DitherDropdownMenuItem,
  DitherDropdownMenuLabel,
  DitherDropdownMenuSeparator,
  DitherDropdownMenuShortcut,
  DitherDropdownMenuTrigger
} from '@/components/dithercn/dither-dropdown-menu'

const getParentDir = (p: string): string => {
  const normalized = p.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  return lastSlash > 0 ? normalized.substring(0, lastSlash) : normalized
}

export const ContextMenu: Component = () => {
  const [hasGhostty, setHasGhostty] = createSignal(false)
  const [hasCode, setHasCode] = createSignal(false)

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

    try {
      if (window.api?.isCodeInstalled) {
        const installed = await window.api.isCodeInstalled()
        setHasCode(installed)
      }
    } catch {
      setHasCode(false)
    }
  })

  const target = createMemo(() => contextMenuState().target)
  const isItem = createMemo(() => Boolean(target()?.path && target()?.name))
  const isDirectory = createMemo(() => Boolean(target()?.isDirectory))
  const targetPath = createMemo(() => target()?.path || workspaceRoot())
  const targetDir = createMemo(() => (isDirectory() ? targetPath() : getParentDir(targetPath())))

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

  const handleOpenInCode = async (): Promise<void> => {
    const p = targetPath()
    closeContextMenu()
    if (window.api?.openCode) {
      await window.api.openCode(p)
    }
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
      <DitherDropdownMenuContent class="min-w-[250px] max-w-[310px] max-h-[calc(100vh-48px)] overflow-y-auto no-scrollbar border-0 shadow-[0_16px_40px_rgba(0,0,0,0.95)] bg-[#050506]">
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

              <Show when={hasCode()}>
                <DitherDropdownMenuItem variant="dither" onSelect={handleOpenInCode}>
                  <VsCodeTileIcon class="w-4 h-4 shrink-0 shadow-sm" />
                  <span>Open in VS Code</span>
                </DitherDropdownMenuItem>
              </Show>

              <DitherDropdownMenuItem variant="dither" onSelect={handleOpenInTerminal}>
                <TerminalTileIcon class="w-4 h-4 shrink-0 text-white/90" />
                <span>Open in Terminal</span>
                <DitherDropdownMenuShortcut>{altKey}+Shift+F4</DitherDropdownMenuShortcut>
              </DitherDropdownMenuItem>

              <Show when={hasGhostty()}>
                <DitherDropdownMenuItem variant="dither" onSelect={handleOpenGhostty}>
                  <img src={ghosttyIcon} alt="" class="w-4 h-4 rounded-[3px] shrink-0 shadow-sm" />
                  <span>Open Ghostty Here</span>
                </DitherDropdownMenuItem>
              </Show>

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

            <DitherDropdownMenuItem variant="dither" onSelect={handleOpenInDefaultApp}>
              <span>{isDirectory() ? 'Open Folder' : 'Open in Default App'}</span>
            </DitherDropdownMenuItem>

            <Show when={hasCode()}>
              <DitherDropdownMenuItem variant="dither" onSelect={handleOpenInCode}>
                <VsCodeTileIcon class="w-4 h-4 shrink-0 shadow-sm" />
                <span>Open in VS Code</span>
              </DitherDropdownMenuItem>
            </Show>

            <DitherDropdownMenuItem variant="dither" onSelect={handleOpenInTerminal}>
              <TerminalTileIcon class="w-4 h-4 shrink-0 text-white/90" />
              <span>Open in Terminal</span>
            </DitherDropdownMenuItem>

            <Show when={hasGhostty()}>
              <DitherDropdownMenuItem variant="dither" onSelect={handleOpenGhostty}>
                <img src={ghosttyIcon} alt="" class="w-4 h-4 rounded-[3px] shrink-0 shadow-sm" />
                <span>Open Ghostty Here</span>
              </DitherDropdownMenuItem>
            </Show>

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

            <DitherDropdownMenuItem variant="dither" onSelect={handleProperties}>
              <span>Properties</span>
              <DitherDropdownMenuShortcut>{altKey}+Enter</DitherDropdownMenuShortcut>
            </DitherDropdownMenuItem>
          </DitherDropdownMenuGroup>
        </Show>
      </DitherDropdownMenuContent>
    </DitherDropdownMenu>
  )
}

export default ContextMenu
