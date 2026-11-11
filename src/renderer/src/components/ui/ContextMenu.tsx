import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
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

const getParentDir = (p: string): string => {
  const normalized = p.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  return lastSlash > 0 ? normalized.substring(0, lastSlash) : normalized
}

const handleKeyDown = (e: KeyboardEvent): void => {
  if (!contextMenuState().isOpen) return
  if (e.key === 'Escape') {
    e.preventDefault()
    closeContextMenu()
  }
}

const handleFindInFolder = (): void => {
  closeContextMenu()
  setCurrentView('search')
}

const handleRefresh = (): void => {
  closeContextMenu()
  refreshFileExplorer()
}

const handleCollapseAll = (): void => {
  closeContextMenu()
  collapseAllFolders()
}

const VIEWPORT_MARGIN = 24

const calculateMenuPosition = (
  rawX: number,
  rawY: number,
  menuWidth: number,
  menuHeight: number,
  screenW: number,
  screenH: number
): { x: number; y: number } => {
  const anchorY = Math.round(menuHeight * 0.33)

  let x = rawX + 6
  if (x + menuWidth > screenW - VIEWPORT_MARGIN) {
    x = Math.max(VIEWPORT_MARGIN, screenW - menuWidth - VIEWPORT_MARGIN)
  }
  if (x < VIEWPORT_MARGIN) {
    x = VIEWPORT_MARGIN
  }

  let y = rawY - anchorY
  if (y + menuHeight > screenH - VIEWPORT_MARGIN) {
    y = Math.max(VIEWPORT_MARGIN, screenH - menuHeight - VIEWPORT_MARGIN)
  }
  if (y < VIEWPORT_MARGIN) {
    y = VIEWPORT_MARGIN
  }

  return { x, y }
}

export const ContextMenu: Component = () => {
  let menuRef: HTMLDivElement | undefined = undefined
  const [coords, setCoords] = createSignal<{ x: number; y: number }>({ x: 0, y: 0 })
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

  const transformOrigin = (): string => {
    const rawX = contextMenuState().x
    const rawY = contextMenuState().y
    const relX = Math.max(0, Math.min(270, rawX - coords().x))
    const relY = Math.max(0, Math.min(520, rawY - coords().y))
    return `${relX}px ${relY}px`
  }

  createEffect(() => {
    if (contextMenuState().isOpen) {
      const { x: rawX, y: rawY, target } = contextMenuState()
      const isItemTarget = Boolean(target?.path && target?.name)
      const isDir = Boolean(target?.isDirectory)
      const estimatedHeight = isItemTarget
        ? isDir
          ? 510
          : 470
        : 310
      const estimatedWidth = 250
      const screenW = window.innerWidth
      const screenH = window.innerHeight

      const initial = calculateMenuPosition(
        rawX,
        rawY,
        estimatedWidth,
        estimatedHeight,
        screenW,
        screenH
      )
      setCoords(initial)

      requestAnimationFrame(() => {
        if (!menuRef) return
        const actualWidth = menuRef.offsetWidth || estimatedWidth
        const actualHeight = menuRef.offsetHeight || estimatedHeight
        const adjusted = calculateMenuPosition(
          rawX,
          rawY,
          actualWidth,
          actualHeight,
          screenW,
          screenH
        )
        setCoords(adjusted)
      })
    }
  })

  // Close when clicking outside
  const handlePointerDown = (e: PointerEvent): void => {
    if (!contextMenuState().isOpen) return
    if (menuRef && !menuRef.contains(e.target as Node)) {
      closeContextMenu()
    }
  }

  onMount(() => {
    window.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('resize', closeContextMenu)
  })

  onCleanup(() => {
    window.removeEventListener('pointerdown', handlePointerDown, true)
    window.removeEventListener('keydown', handleKeyDown, true)
    window.removeEventListener('resize', closeContextMenu)
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

  return (
    <Show when={contextMenuState().isOpen}>
      <style>{`
        @keyframes contextMenuIn {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .context-menu-item {
          position: relative;
          isolation: isolate;
          transition: color 100ms ease;
        }
        .context-menu-item::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background-color: var(--dither-ink);
          -webkit-mask-image: var(--dither-pat-25);
          mask-image: var(--dither-pat-25);
          -webkit-mask-repeat: repeat;
          mask-repeat: repeat;
          -webkit-mask-size: 4px 4px;
          mask-size: 4px 4px;
          opacity: 0;
          transition: opacity 100ms ease;
          pointer-events: none;
          z-index: 0;
        }
        .context-menu-item::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background-color: color-mix(in srgb, var(--dither-ink) 13%, transparent);
          opacity: 0;
          transition: opacity 100ms ease;
          pointer-events: none;
          z-index: 0;
        }
        .context-menu-item:hover::before {
          opacity: 0.55;
        }
        .context-menu-item:hover::after {
          opacity: 1;
        }
        .context-menu-item-danger::before {
          background-color: #f43f5e;
          -webkit-mask-image: var(--dither-pat-50);
          mask-image: var(--dither-pat-50);
        }
        .context-menu-item-danger::after {
          background-color: rgba(244, 63, 94, 0.1);
        }
        .context-menu-item-danger:hover::before {
          opacity: 0.32;
        }
        .context-menu-item > * {
          position: relative;
          z-index: 1;
        }
      `}</style>

      {/* Authentic Dithercn OLED Dropdown Menu Card */}
      <div
        ref={(el) => (menuRef = el)}
        class="fixed z-[100] min-w-[250px] max-w-[310px] max-h-[calc(100vh-48px)] overflow-y-auto no-scrollbar bg-[#050506]/[0.97] rounded-[8px] p-1.5 select-none shadow-[0_18px_44px_rgba(0,0,0,0.82)] outline-none animate-[contextMenuIn_120ms_cubic-bezier(0.16,1,0.3,1)] font-sans antialiased"
        style={{
          left: `${coords().x}px`,
          top: `${coords().y}px`,
          'transform-origin': transformOrigin()
        }}
      >
        {/* ── Item Context Menu (File or Directory) ── */}
        <Show
          when={isItem()}
          fallback={
            <div class="flex flex-col">
              <div class="px-2.5 pt-2 pb-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-white/35 select-none">
                Workspace Actions
              </div>
              <button
                type="button"
                onClick={handleNewFile}
                class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
              >
                <span>New File</span>
                <span class="ml-auto pl-4 font-mono text-[11px] text-white/40 group-hover:text-white/70 tabular-nums">
                  {modKey}+N
                </span>
              </button>

              <button
                type="button"
                onClick={handleNewFolder}
                class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
              >
                <span>New Folder</span>
                <span class="ml-auto pl-4 font-mono text-[11px] text-white/40 group-hover:text-white/70 tabular-nums">
                  {modKey}+{altKey}+N
                </span>
              </button>

              <div class="h-px bg-white/[0.07] my-1 mx-1.5" />

              <Show when={hasCode()}>
                <button
                  type="button"
                  onClick={handleOpenInCode}
                  class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
                >
                  <span class="flex items-center gap-2.5">
                    <VsCodeTileIcon class="w-4 h-4 shrink-0 shadow-sm" />
                    <span>Open in VS Code</span>
                  </span>
                </button>
              </Show>

              <button
                type="button"
                onClick={handleOpenInTerminal}
                class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
              >
                <span class="flex items-center gap-2.5">
                  <TerminalTileIcon class="w-4 h-4 shrink-0 text-white/90" />
                  <span>Open in Terminal</span>
                </span>
                <span class="ml-auto pl-4 font-mono text-[11px] text-white/40 group-hover:text-white/70 tabular-nums">
                  {altKey}+Shift+F4
                </span>
              </button>

              <Show when={hasGhostty()}>
                <button
                  type="button"
                  onClick={handleOpenGhostty}
                  class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
                >
                  <span class="flex items-center gap-2.5">
                    <img src={ghosttyIcon} alt="" class="w-4 h-4 rounded-[3px] shrink-0 shadow-sm" />
                    <span>Open Ghostty Here</span>
                  </span>
                </button>
              </Show>

              <div class="h-px bg-white/[0.07] my-1 mx-1.5" />

              <button
                type="button"
                onClick={handlePaste}
                disabled={!fileClipboard()}
                class={`w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] transition-colors outline-none group ${
                  fileClipboard()
                    ? 'text-white/90 hover:text-white context-menu-item cursor-pointer'
                    : 'text-white/25 cursor-not-allowed'
                }`}
              >
                <span>Paste</span>
                <span class="ml-auto pl-4 font-mono text-[11px] text-white/40 group-hover:text-white/70 tabular-nums">
                  {modKey}+V
                </span>
              </button>

              <div class="h-px bg-white/[0.07] my-1 mx-1.5" />

              <button
                type="button"
                onClick={handleCopyPath}
                class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
              >
                <span>Copy Path</span>
              </button>

              <div class="h-px bg-white/[0.07] my-1 mx-1.5" />

              <button
                type="button"
                onClick={handleRefresh}
                class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
              >
                <span>Refresh Explorer</span>
              </button>

              <button
                type="button"
                onClick={handleCollapseAll}
                class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
              >
                <span>Collapse All</span>
              </button>

              <div class="h-px bg-white/[0.07] my-1 mx-1.5" />

              <button
                type="button"
                onClick={handleProperties}
                class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
              >
                <span>Properties</span>
                <span class="ml-auto pl-4 font-mono text-[11px] text-white/40 group-hover:text-white/70 tabular-nums">
                  {altKey}+Enter
                </span>
              </button>
            </div>
          }
        >
          <div class="flex flex-col">
            <div class="px-2.5 pt-2 pb-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-white/35 select-none">
              {isDirectory() ? 'Directory Actions' : 'File Operations'}
            </div>
            {/* Folder-specific New File / Folder */}
            <Show when={isDirectory()}>
              <button
                type="button"
                onClick={handleNewFile}
                class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
              >
                <span>New File</span>
                <span class="ml-auto pl-4 font-mono text-[11px] text-white/40 group-hover:text-white/70 tabular-nums">
                  {modKey}+N
                </span>
              </button>

              <button
                type="button"
                onClick={handleNewFolder}
                class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
              >
                <span>New Folder</span>
                <span class="ml-auto pl-4 font-mono text-[11px] text-white/40 group-hover:text-white/70 tabular-nums">
                  {modKey}+{altKey}+N
                </span>
              </button>

              <div class="h-px bg-white/[0.07] my-1 mx-1.5" />
            </Show>

            {/* Open Actions */}
            <button
              type="button"
              onClick={handleOpenInDefaultApp}
              class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
            >
              <span>{isDirectory() ? 'Open Folder' : 'Open in Default App'}</span>
            </button>

            <Show when={hasCode()}>
              <button
                type="button"
                onClick={handleOpenInCode}
                class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
              >
                <span class="flex items-center gap-2.5">
                  <VsCodeTileIcon class="w-4 h-4 shrink-0 shadow-sm" />
                  <span>Open in VS Code</span>
                </span>
              </button>
            </Show>

            <button
              type="button"
              onClick={handleOpenInTerminal}
              class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
            >
              <span class="flex items-center gap-2.5">
                <TerminalTileIcon class="w-4 h-4 shrink-0 text-white/90" />
                <span>Open in Terminal</span>
              </span>
            </button>

            <Show when={hasGhostty()}>
              <button
                type="button"
                onClick={handleOpenGhostty}
                class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
              >
                <span class="flex items-center gap-2.5">
                  <img src={ghosttyIcon} alt="" class="w-4 h-4 rounded-[3px] shrink-0 shadow-sm" />
                  <span>Open Ghostty Here</span>
                </span>
              </button>
            </Show>

            <Show when={isDirectory()}>
              <button
                type="button"
                onClick={handleFindInFolder}
                class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
              >
                <span>Find in Folder...</span>
              </button>
            </Show>

            <div class="h-px bg-white/[0.06] my-1.5 mx-1" />

            {/* Clipboard Operations */}
            <button
              type="button"
              onClick={handleCut}
              class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
            >
              <span>Cut</span>
              <span class="ml-auto pl-4 font-mono text-[11px] text-white/40 group-hover:text-white/70 tabular-nums">
                {modKey}+X
              </span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
            >
              <span>Copy</span>
              <span class="ml-auto pl-4 font-mono text-[11px] text-white/40 group-hover:text-white/70 tabular-nums">
                {modKey}+C
              </span>
            </button>

            <button
              type="button"
              onClick={handleDuplicate}
              class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
            >
              <span>Duplicate</span>
              <span class="ml-auto pl-4 font-mono text-[11px] text-white/40 group-hover:text-white/70 tabular-nums">
                {modKey}+D
              </span>
            </button>

            <Show when={isDirectory()}>
              <button
                type="button"
                onClick={handlePaste}
                disabled={!fileClipboard()}
                class={`w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] transition-colors outline-none group ${
                  fileClipboard()
                    ? 'text-white/90 hover:text-white context-menu-item cursor-pointer'
                    : 'text-white/25 cursor-not-allowed'
                }`}
              >
                <span>Paste</span>
                <span class="ml-auto pl-4 font-mono text-[11px] text-white/40 group-hover:text-white/70 tabular-nums">
                  {modKey}+V
                </span>
              </button>
            </Show>

            <div class="h-px bg-white/[0.06] my-1.5 mx-1" />

            {/* Path Copying */}
            <button
              type="button"
              onClick={handleCopyPath}
              class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
            >
              <span>Copy Path</span>
              <span class="ml-auto pl-4 font-mono text-[11px] text-white/40 group-hover:text-white/70 tabular-nums">
                {modKey}+{altKey}+C
              </span>
            </button>

            <button
              type="button"
              onClick={handleCopyRelativePath}
              class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
            >
              <span>Copy Relative Path</span>
              <span class="ml-auto pl-4 font-mono text-[11px] text-white/40 group-hover:text-white/70 tabular-nums">
                {modKey}+Shift+C
              </span>
            </button>

            <div class="h-px bg-white/[0.06] my-1.5 mx-1" />

            {/* Rename & Trash */}
            <button
              type="button"
              onClick={handleRename}
              class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
            >
              <span>Rename</span>
              <span class="ml-auto pl-4 font-mono text-[11px] text-white/40 group-hover:text-white/70 tabular-nums">
                F2
              </span>
            </button>

            <button
              type="button"
              onClick={handleTrash}
              class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-rose-400/90 hover:text-rose-200 context-menu-item context-menu-item-danger transition-colors cursor-pointer outline-none group"
            >
              <span>Move to Trash</span>
              <span class="ml-auto pl-2 font-mono text-[11px] text-rose-400/75 group-hover:text-rose-100 tabular-nums">
                Del
              </span>
            </button>

            <div class="h-px bg-white/[0.06] my-1.5 mx-1" />

            {/* Properties */}
            <button
              type="button"
              onClick={handleProperties}
              class="w-full h-[30px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] text-white/85 hover:text-white context-menu-item transition-colors cursor-pointer outline-none group"
            >
              <span>Properties</span>
              <span class="ml-auto pl-4 font-mono text-[11px] text-white/40 group-hover:text-white/70 tabular-nums">
                {altKey}+Enter
              </span>
            </button>
          </div>
        </Show>
      </div>
    </Show>
  )
}

export default ContextMenu
