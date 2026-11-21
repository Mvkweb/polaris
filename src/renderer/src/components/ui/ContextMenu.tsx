import { Component, createMemo, createSignal, For, onMount, Show } from 'solid-js'
import {
  contextMenuState,
  closeContextMenu,
  workspaceRoot,
  fileClipboard,
  setFileClipboard,
  openFileActionModal,
  startInlineRename,
  renameOpenFile,
  refreshFileExplorer,
  collapseAllFolders,
  addTerminal,
  setCurrentView,
  openPropertiesModal,
  openInspector,
  openCompressModal,
  openStorageMapModal,
  openNewTab,
  navigateTo,
  openFileInEditor,
  setSort,
  sortField,
  sortDescending,
  foldersFirst,
  setFoldersFirst,
  openTrashModal,
  isTrashPath,
  SORT_LABELS
} from '../../store'
import { isMac } from '../../shortcuts'
import { TerminalTileIcon } from './Icons'
import { EditorGlyph } from './EditorGlyph'
import { installedEditors, preferredEditor, rememberEditor, BUILTIN_EDITOR_ID } from '../../editors'
import type { ExternalEditor } from '../../types'
import ghosttyIcon from '../../assets/icons/ghostty.png'
import { uploadFiles, uploadServices } from '../../tasks'
import { directionLabel } from '../browser/SortControl'
import { openBrowserFile, showOpenWith, supportsOpenWith } from '../../openWith'
import { DitherButton } from '../dithercn/dither-button'
import { makeLink, pasteAsLink, showLinkTarget } from '../../links'
import { protectedMount, type ProtectedReason } from '../../systemMounts'
import type { ArchiveFormat } from '../../types'

const ARCHIVE_EXTENSIONS = [
  '.tar.gz',
  '.tar.xz',
  '.tar.zst',
  '.tar.bz2',
  '.tgz',
  '.txz',
  '.tzst',
  '.tbz2',
  '.zip',
  '.7z',
  '.tar',
  '.rar'
]

const isArchive = (name?: string): boolean => {
  if (!name) return false
  const lower = name.toLowerCase()
  return ARCHIVE_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

const getArchiveStem = (name: string): string => {
  const lower = name.toLowerCase()
  for (const ext of ARCHIVE_EXTENSIONS) {
    if (lower.endsWith(ext)) {
      return name.slice(0, -ext.length)
    }
  }
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

const ArchiveMenuIcon = (props: { class?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class ?? 'w-4 h-4'}
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="3.5" />
    <path d="M12 7.5v9M8 12.5l4 4 4-4" />
  </svg>
)

const ZipFolderIcon = (props: { class?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class ?? 'w-4 h-4'}
    aria-hidden="true"
  >
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    <path d="M10 11v.01M10 14v.01M10 17v.01" />
  </svg>
)

const CustomOptionsIcon = (props: { class?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class ?? 'w-4 h-4'}
    aria-hidden="true"
  >
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
)

const ExtractHereIcon = (props: { class?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class ?? 'w-4 h-4'}
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="3.5" />
    <path d="M12 16.5v-9M8 11.5l4-4 4 4" />
  </svg>
)

const ExtractToFolderIcon = (props: { class?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class ?? 'w-4 h-4'}
    aria-hidden="true"
  >
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    <path d="M12 11v6M9 14l3-3 3 3" />
  </svg>
)

const RestoreIcon = (props: { class?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class ?? 'w-4 h-4'}
    aria-hidden="true"
  >
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
)

const DeletePermanentIcon = (props: { class?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class ?? 'w-4 h-4'}
    aria-hidden="true"
  >
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
)

const CutIcon = (props: { class?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class ?? 'w-4 h-4'}
    aria-hidden="true"
  >
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12" y1="8.12" x2="12" y2="12" />
  </svg>
)

const CopyIcon = (props: { class?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class ?? 'w-4 h-4'}
    aria-hidden="true"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const PropertiesIcon = (props: { class?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class ?? 'w-4 h-4'}
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 21V9" />
  </svg>
)

const EmptyTrashDialog: Component<{ dir: string; onDismiss: () => void }> = (props) => {
  let dialog!: HTMLDialogElement

  onMount(() => {
    dialog.showModal()
  })

  return (
    <dialog
      ref={(el) => (dialog = el)}
      aria-labelledby="empty-trash-dialog-title"
      onKeyDown={(e) => e.stopPropagation()}
      onCancel={(e) => {
        e.preventDefault()
        props.onDismiss()
      }}
      onClick={(e) => {
        if (e.target === dialog) props.onDismiss()
      }}
      class="m-auto w-[380px] max-w-[calc(100%-2rem)] overflow-hidden rounded-[18px] border border-transparent bg-[#070708] p-5 text-white shadow-[0_18px_44px_-18px_rgba(0,0,0,0.7)] backdrop:bg-black/55 forced-colors:border-[CanvasText]"
    >
      <h2 id="empty-trash-dialog-title" class="text-[15px] font-semibold">
        Empty Trash?
      </h2>
      <p class="mt-2 break-words text-[13px] text-white/75">
        All items in Trash will be permanently deleted. This action cannot be undone.
      </p>
      <div class="mt-5 flex flex-wrap justify-end gap-2">
        <DitherButton
          autofocus
          onClick={props.onDismiss}
          size="sm"
          variant="outline"
        >
          Cancel
        </DitherButton>
        <DitherButton
          color="red"
          size="sm"
          onClick={async () => {
            await window.api?.emptyTrash(props.dir)
            refreshFileExplorer()
            props.onDismiss()
          }}
        >
          Empty Trash
        </DitherButton>
      </div>
    </dialog>
  )
}

const lockLabel = (r: ProtectedReason): string => (r === 'home' ? 'Home drive' : 'System drive')
const lockReason = (r: ProtectedReason): string =>
  r === 'home'
    ? 'Your home folder lives on this drive — unmounting it would end your session.'
    : 'Linux runs from this drive — it can never be unmounted or ejected.'
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
  const [emptyTrashConfirm, setEmptyTrashConfirm] = createSignal<string | null>(null)

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
  /** System / home drives: Unmount and Eject are shown but can never be used. */
  const driveLock = createMemo(() => protectedMount(drive()?.mountPoint))
  const isItem = createMemo(() => Boolean(target()?.path && target()?.name))
  const isDirectory = createMemo(() => Boolean(target()?.isDirectory))
  const targetPath = createMemo(() => target()?.path || workspaceRoot())
  const targetDir = createMemo(() => (isDirectory() ? targetPath() : getParentDir(targetPath())))
  const targetPaths = createMemo(() => {
    const list = target()?.paths
    return list && list.length > 0 ? list : [targetPath()]
  })
  const isArchiveTarget = createMemo(() => !isDirectory() && isArchive(target()?.name))
  const archiveStem = createMemo(() => getArchiveStem(target()?.name || 'archive'))
  const inTrash = createMemo(
    () => isTrashPath(targetPath()) || isTrashPath(workspaceRoot())
  )

  // ── Trash Operations ──
  const handleRestore = async (): Promise<void> => {
    const paths = targetPaths()
    closeContextMenu()
    try {
      for (const p of paths) {
        const res = await window.api?.restoreFromTrash(p)
        if (res?.error) {
          console.error('Failed to restore from trash:', res.error)
        }
      }
      refreshFileExplorer()
    } catch (err) {
      console.error('Failed to restore from trash:', err)
    }
  }

  const handleEmptyTrash = (): void => {
    const dir = targetDir()
    closeContextMenu()
    setEmptyTrashConfirm(dir)
  }

  // ── Archive Operations ──
  const handleQuickCompress = async (fmt: ArchiveFormat): Promise<void> => {
    const sources = targetPaths()
    const dest = isDirectory() ? getParentDir(targetPath()) : targetDir()
    const defaultName = sources.length === 1 ? getArchiveStem(target()?.name || 'archive') : 'archive'
    closeContextMenu()
    try {
      await window.api?.compressArchive(sources, dest, defaultName, fmt)
      refreshFileExplorer()
    } catch (err) {
      console.error('Quick compress failed:', err)
    }
  }

  const handleCustomCompress = (): void => {
    const sources = targetPaths()
    const dest = isDirectory() ? getParentDir(targetPath()) : targetDir()
    const defaultName = sources.length === 1 ? getArchiveStem(target()?.name || 'archive') : 'archive'
    closeContextMenu()
    setTimeout(() => {
      openCompressModal(sources, dest, defaultName)
    }, 10)
  }

  const handleExtractHere = async (): Promise<void> => {
    const p = targetPath()
    const dest = targetDir()
    closeContextMenu()
    try {
      await window.api?.extractArchive(p, dest)
      refreshFileExplorer()
    } catch (err) {
      console.error('Extract failed:', err)
    }
  }

  const handleExtractToSubfolder = async (): Promise<void> => {
    const p = targetPath()
    const dest = `${targetDir()}/${archiveStem()}`
    closeContextMenu()
    try {
      await window.api?.extractArchive(p, dest)
      refreshFileExplorer()
    } catch (err) {
      console.error('Extract to subfolder failed:', err)
    }
  }

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
    const directory = isDirectory()
    const name = target()?.name ?? ''
    closeContextMenu()
    if (!directory && supportsOpenWith()) void openBrowserFile(p, name)
    else void window.api?.openPath(p)
  }

  const handleChooseApp = (): void => {
    const entry = target()
    if (!entry?.path || !entry.name) return
    closeContextMenu()
    showOpenWith(entry.path, entry.name)
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
    setFileClipboard({ path: p, action: 'cut', isSymlink: !!target()?.isSymlink })
  }

  const handleCopy = (): void => {
    const p = targetPath()
    closeContextMenu()
    setFileClipboard({ path: p, action: 'copy', isSymlink: !!target()?.isSymlink })
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

  // ── Symlinks ────────────────────────────────────────────────────────────
  const pasteDir = (): string => (isDirectory() ? targetPath() : getParentDir(targetPath()))
  const handleMakeLink = (): void => {
    const p = targetPath()
    closeContextMenu()
    void makeLink(p)
  }
  const handleShowLinkTarget = (): void => {
    const link = target()?.linkTarget
    closeContextMenu()
    if (link) showLinkTarget(link)
  }
  const handlePasteAsLink = (relative: boolean): void => {
    const dir = pasteDir()
    closeContextMenu()
    void pasteAsLink(dir, relative)
  }
  /** Paste what a copied symlink points at, instead of the link itself. */
  const handlePasteContents = async (): Promise<void> => {
    const clip = fileClipboard()
    const dir = pasteDir()
    closeContextMenu()
    if (!clip) return
    const name = clip.path.replace(/\/+$/, '').split('/').pop() || 'item'
    await window.api.copyPath(clip.path, `${dir}/${name}`, { dereference: true })
    refreshFileExplorer()
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

  const handleTrash = (): void => {
    const entry = target()
    if (!entry?.path || !entry.name) return
    const paths = targetPaths()
    closeContextMenu()
    openTrashModal(entry.path, entry.name, inTrash(), paths)
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
  const UploadIcon = (props: { temporary?: boolean }) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      class="w-4 h-4 text-white/70 shrink-0"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <Show
        when={props.temporary}
        fallback={
          <path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4 4 0 0 1-.5 9.5M12 12v8m-3-5 3-3 3 3" />
        }
      >
        <circle cx="12" cy="13" r="7" />
        <path d="M12 9.5V13l2 1.5M10 3h4" />
      </Show>
    </svg>
  )

  const UploadMenu = () => (
    <DitherDropdownMenuSub>
      <DitherDropdownMenuSubTrigger variant="dither">
        <UploadIcon />
        <span>Upload to</span>
      </DitherDropdownMenuSubTrigger>
      <DitherDropdownMenuSubContent class="min-w-[230px] border-0 shadow-[0_4px_16px_rgba(0,0,0,0.45)] bg-[#050506]">
        <DitherDropdownMenuLabel>Long-lived</DitherDropdownMenuLabel>
        <For each={uploadServices().filter((s) => s.group === 'permanent')}>
          {(svc) => (
            <DitherDropdownMenuItem
              variant="dither"
              onSelect={() => void uploadFiles([targetPath()], svc.id)}
            >
              <UploadIcon />
              <span>{svc.name}</span>
              <DitherDropdownMenuShortcut>{svc.retention}</DitherDropdownMenuShortcut>
            </DitherDropdownMenuItem>
          )}
        </For>
        <DitherDropdownMenuSeparator />
        <DitherDropdownMenuLabel>Temporary</DitherDropdownMenuLabel>
        <For each={uploadServices().filter((s) => s.group === 'temporary')}>
          {(svc) => (
            <DitherDropdownMenuItem
              variant="dither"
              onSelect={() => void uploadFiles([targetPath()], svc.id)}
            >
              <UploadIcon temporary />
              <span>{svc.name}</span>
              <DitherDropdownMenuShortcut>{svc.retention}</DitherDropdownMenuShortcut>
            </DitherDropdownMenuItem>
          )}
        </For>
      </DitherDropdownMenuSubContent>
    </DitherDropdownMenuSub>
  )

  const PasteLinkItems = () => (
    <Show when={fileClipboard()}>
      <DitherDropdownMenuItem variant="dither" onSelect={() => handlePasteAsLink(false)}>
        <span>Paste as Link</span>
      </DitherDropdownMenuItem>
      <DitherDropdownMenuItem variant="dither" onSelect={() => handlePasteAsLink(true)}>
        <span>Paste as Relative Link</span>
      </DitherDropdownMenuItem>
      <Show when={fileClipboard()?.isSymlink}>
        <DitherDropdownMenuItem variant="dither" onSelect={() => void handlePasteContents()}>
          <span>Paste Contents</span>
        </DitherDropdownMenuItem>
      </Show>
    </Show>
  )

  const OpenWithMenu = (props: { terminalShortcut?: string; label?: string }) => (
    <DitherDropdownMenuSub>
      <DitherDropdownMenuSubTrigger variant="dither">
        <EditorGlyph editor={preferredEditor()} />
        <span>{props.label ?? 'Open With'}</span>
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
          <svg
            viewBox="0 0 24 24"
            fill="none"
            class="w-4 h-4 text-white/70 shrink-0"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
          </svg>
          <span>System Default</span>
        </DitherDropdownMenuItem>
      </DitherDropdownMenuSubContent>
    </DitherDropdownMenuSub>
  )

  const CompressMenu = () => (
    <DitherDropdownMenuSub>
      <DitherDropdownMenuSubTrigger variant="dither">
        <ArchiveMenuIcon class="w-4 h-4 text-white/80 shrink-0" />
        <span>Compress</span>
      </DitherDropdownMenuSubTrigger>
      <DitherDropdownMenuSubContent class="min-w-[195px] border-0 shadow-[0_4px_16px_rgba(0,0,0,0.45)] bg-[#050506]">
        <DitherDropdownMenuItem variant="dither" onSelect={() => void handleQuickCompress('zip')}>
          <ZipFolderIcon class="w-4 h-4 text-white/80 shrink-0" />
          <span>Compress as .zip</span>
        </DitherDropdownMenuItem>
        <DitherDropdownMenuItem variant="dither" onSelect={() => void handleQuickCompress('tar.gz')}>
          <ArchiveMenuIcon class="w-4 h-4 text-white/80 shrink-0" />
          <span>Compress as .tar.gz</span>
        </DitherDropdownMenuItem>
        <DitherDropdownMenuItem variant="dither" onSelect={() => void handleQuickCompress('tar.xz')}>
          <ArchiveMenuIcon class="w-4 h-4 text-white/80 shrink-0" />
          <span>Compress as .tar.xz</span>
        </DitherDropdownMenuItem>
        <DitherDropdownMenuItem variant="dither" onSelect={() => void handleQuickCompress('7z')}>
          <ArchiveMenuIcon class="w-4 h-4 text-white/80 shrink-0" />
          <span>Compress as .7z</span>
        </DitherDropdownMenuItem>
        <DitherDropdownMenuSeparator />
        <DitherDropdownMenuItem
          variant="dither"
          onSelect={handleCustomCompress}
          onClick={handleCustomCompress}
        >
          <CustomOptionsIcon class="w-4 h-4 text-white/80 shrink-0" />
          <span>Custom Options...</span>
        </DitherDropdownMenuItem>
      </DitherDropdownMenuSubContent>
    </DitherDropdownMenuSub>
  )

  const menu = (
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
                <Show
                  when={inTrash()}
                  fallback={
                    /* Workspace Actions on Empty Canvas */
                    <DitherDropdownMenuGroup>
                      <DitherDropdownMenuLabel>Workspace Actions</DitherDropdownMenuLabel>
                      <DitherDropdownMenuItem variant="dither" onSelect={handleNewFile}>
                        <span>New File</span>
                        <DitherDropdownMenuShortcut>{modKey}+N</DitherDropdownMenuShortcut>
                      </DitherDropdownMenuItem>

                      <DitherDropdownMenuItem variant="dither" onSelect={handleNewFolder}>
                        <span>New Folder</span>
                        <DitherDropdownMenuShortcut>
                          {modKey}+{altKey}+N
                        </DitherDropdownMenuShortcut>
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
                      <PasteLinkItems />

                      <DitherDropdownMenuSeparator />

                      <DitherDropdownMenuItem variant="dither" onSelect={handleCopyPath}>
                        <span>Copy Path</span>
                      </DitherDropdownMenuItem>

                      <DitherDropdownMenuSeparator />

                      <DitherDropdownMenuSub>
                        <DitherDropdownMenuSubTrigger variant="dither">
                          <span>Sort by</span>
                        </DitherDropdownMenuSubTrigger>
                        <DitherDropdownMenuSubContent class="min-w-[200px] border-0 shadow-[0_4px_16px_rgba(0,0,0,0.45)] bg-[#050506]">
                          <For each={['name', 'modified', 'size', 'kind'] as const}>
                            {(f) => (
                              <DitherDropdownMenuItem
                                variant="dither"
                                closeOnSelect={false}
                                onSelect={() => setSort(f)}
                              >
                                <span class={sortField() === f ? 'text-white' : ''}>
                                  {SORT_LABELS[f]}
                                </span>
                                <Show when={sortField() === f}>
                                  <DitherDropdownMenuShortcut>
                                    {directionLabel(f, sortDescending())}
                                  </DitherDropdownMenuShortcut>
                                </Show>
                              </DitherDropdownMenuItem>
                            )}
                          </For>
                          <DitherDropdownMenuSeparator />
                          <DitherDropdownMenuItem
                            variant="dither"
                            closeOnSelect={false}
                            onSelect={() => setFoldersFirst(!foldersFirst())}
                          >
                            <span>Folders first</span>
                            <DitherDropdownMenuShortcut>
                              {foldersFirst() ? 'On' : 'Off'}
                            </DitherDropdownMenuShortcut>
                          </DitherDropdownMenuItem>
                        </DitherDropdownMenuSubContent>
                      </DitherDropdownMenuSub>

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
                  {/* Dolphin-style Trash Actions on Empty Canvas */}
                  <DitherDropdownMenuGroup>
                    <DitherDropdownMenuItem variant="dither" destructive onSelect={handleEmptyTrash}>
                      <DeletePermanentIcon class="w-4 h-4 text-red-400 shrink-0" />
                      <span>Empty Trash</span>
                    </DitherDropdownMenuItem>

                    <DitherDropdownMenuSeparator />

                    <DitherDropdownMenuSub>
                      <DitherDropdownMenuSubTrigger variant="dither">
                        <span>Sort by</span>
                      </DitherDropdownMenuSubTrigger>
                      <DitherDropdownMenuSubContent class="min-w-[200px] border-0 shadow-[0_4px_16px_rgba(0,0,0,0.45)] bg-[#050506]">
                        <For each={['name', 'modified', 'size', 'kind'] as const}>
                          {(f) => (
                            <DitherDropdownMenuItem
                              variant="dither"
                              closeOnSelect={false}
                              onSelect={() => setSort(f)}
                            >
                              <span class={sortField() === f ? 'text-white' : ''}>
                                {SORT_LABELS[f]}
                              </span>
                              <Show when={sortField() === f}>
                                <DitherDropdownMenuShortcut>
                                  {directionLabel(f, sortDescending())}
                                </DitherDropdownMenuShortcut>
                              </Show>
                            </DitherDropdownMenuItem>
                          )}
                        </For>
                        <DitherDropdownMenuSeparator />
                        <DitherDropdownMenuItem
                          variant="dither"
                          closeOnSelect={false}
                          onSelect={() => setFoldersFirst(!foldersFirst())}
                        >
                          <span>Folders first</span>
                          <DitherDropdownMenuShortcut>
                            {foldersFirst() ? 'On' : 'Off'}
                          </DitherDropdownMenuShortcut>
                        </DitherDropdownMenuItem>
                      </DitherDropdownMenuSubContent>
                    </DitherDropdownMenuSub>

                    <DitherDropdownMenuItem variant="dither" onSelect={handleRefresh}>
                      <span>Refresh Explorer</span>
                    </DitherDropdownMenuItem>

                    <DitherDropdownMenuSeparator />

                    <DitherDropdownMenuItem variant="dither" onSelect={handleProperties}>
                      <PropertiesIcon class="w-4 h-4 text-white/80 shrink-0" />
                      <span>Properties</span>
                      <DitherDropdownMenuShortcut>{altKey}+Enter</DitherDropdownMenuShortcut>
                    </DitherDropdownMenuItem>
                  </DitherDropdownMenuGroup>
                </Show>
              }
            >
              <Show
                when={inTrash()}
                fallback={
                  /* Normal File Operations */
                  <DitherDropdownMenuGroup>
                    <DitherDropdownMenuLabel>
                      {isDirectory() ? 'Directory Actions' : 'File Operations'}
                    </DitherDropdownMenuLabel>

                    <Show when={isArchiveTarget()}>
                      <DitherDropdownMenuItem variant="dither" onSelect={handleExtractHere}>
                        <ExtractHereIcon class="w-4 h-4 text-white/80 shrink-0" />
                        <span>Extract Here</span>
                      </DitherDropdownMenuItem>
                      <DitherDropdownMenuItem variant="dither" onSelect={handleExtractToSubfolder}>
                        <ExtractToFolderIcon class="w-4 h-4 text-white/80 shrink-0" />
                        <span>Extract to {archiveStem()}/</span>
                      </DitherDropdownMenuItem>
                      <DitherDropdownMenuSeparator />
                    </Show>

                    <Show when={isDirectory()}>
                      <DitherDropdownMenuItem variant="dither" onSelect={handleNewFile}>
                        <span>New File</span>
                        <DitherDropdownMenuShortcut>{modKey}+N</DitherDropdownMenuShortcut>
                      </DitherDropdownMenuItem>

                      <DitherDropdownMenuItem variant="dither" onSelect={handleNewFolder}>
                        <span>New Folder</span>
                        <DitherDropdownMenuShortcut>
                          {modKey}+{altKey}+N
                        </DitherDropdownMenuShortcut>
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

                    <Show when={!isDirectory() && supportsOpenWith()} fallback={<OpenWithMenu />}>
                      <DitherDropdownMenuItem variant="dither" onSelect={handleChooseApp}>
                        <span>Open With…</span>
                      </DitherDropdownMenuItem>
                      <OpenWithMenu label="Editors and Terminals" />
                    </Show>

                    <Show when={!isDirectory() && uploadServices().length}>
                      <UploadMenu />
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

                    <CompressMenu />

                    <DitherDropdownMenuItem variant="dither" onSelect={handleMakeLink}>
                      <span>Make Link</span>
                    </DitherDropdownMenuItem>

                    <Show when={target()?.isSymlink && target()?.linkTarget}>
                      <DitherDropdownMenuItem variant="dither" onSelect={handleShowLinkTarget}>
                        <span>{target()?.isBrokenLink ? 'Show Missing Target' : 'Show Link Target'}</span>
                      </DitherDropdownMenuItem>
                    </Show>

                    <Show when={isDirectory()}>
                      <DitherDropdownMenuItem
                        variant="dither"
                        disabled={!fileClipboard()}
                        onSelect={handlePaste}
                      >
                        <span>Paste</span>
                        <DitherDropdownMenuShortcut>{modKey}+V</DitherDropdownMenuShortcut>
                      </DitherDropdownMenuItem>
                      <PasteLinkItems />
                    </Show>

                    <DitherDropdownMenuSeparator />

                    <DitherDropdownMenuItem variant="dither" onSelect={handleCopyPath}>
                      <span>Copy Path</span>
                      <DitherDropdownMenuShortcut>
                        {modKey}+{altKey}+C
                      </DitherDropdownMenuShortcut>
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

                    <DitherDropdownMenuItem variant="dither" destructive onSelect={handleTrash}>
                      <span>Move to Trash</span>
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
                {/* Dolphin-style Trash Operations on Item */}
                <DitherDropdownMenuGroup>
                  <DitherDropdownMenuItem variant="dither" onSelect={handleRestore}>
                    <RestoreIcon class="w-4 h-4 text-white/80 shrink-0" />
                    <span>Restore to Former Location</span>
                  </DitherDropdownMenuItem>

                  <DitherDropdownMenuSeparator />

                  <DitherDropdownMenuItem variant="dither" onSelect={handleCut}>
                    <CutIcon class="w-4 h-4 text-white/80 shrink-0" />
                    <span>Cut</span>
                    <DitherDropdownMenuShortcut>{modKey}+X</DitherDropdownMenuShortcut>
                  </DitherDropdownMenuItem>

                  <DitherDropdownMenuItem variant="dither" onSelect={handleCopy}>
                    <CopyIcon class="w-4 h-4 text-white/80 shrink-0" />
                    <span>Copy</span>
                    <DitherDropdownMenuShortcut>{modKey}+C</DitherDropdownMenuShortcut>
                  </DitherDropdownMenuItem>

                  <DitherDropdownMenuSeparator />

                  <DitherDropdownMenuItem variant="dither" destructive onSelect={handleTrash}>
                    <DeletePermanentIcon class="w-4 h-4 text-red-400 shrink-0" />
                    <span>Delete</span>
                    <DitherDropdownMenuShortcut>Shift+Del</DitherDropdownMenuShortcut>
                  </DitherDropdownMenuItem>

                  <DitherDropdownMenuSeparator />

                  <DitherDropdownMenuItem variant="dither" onSelect={handleProperties}>
                    <PropertiesIcon class="w-4 h-4 text-white/80 shrink-0" />
                    <span>Properties</span>
                    <DitherDropdownMenuShortcut>{altKey}+Enter</DitherDropdownMenuShortcut>
                  </DitherDropdownMenuItem>
                </DitherDropdownMenuGroup>
              </Show>
            </Show>
          }
        >
          <DitherDropdownMenuGroup>
            <DitherDropdownMenuLabel>
              {drive()?.name || 'Device Operations'}
            </DitherDropdownMenuLabel>

            <DitherDropdownMenuItem variant="dither" onSelect={handleOpenDrive}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                class="w-4 h-4 text-white/80 shrink-0"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>Open</span>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuItem variant="dither" onSelect={handleOpenDriveNewTab}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                class="w-4 h-4 text-white/80 shrink-0"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  d="M19 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6M12 3h9v9M21 3l-10 10"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>Open in New Tab</span>
              <DitherDropdownMenuShortcut>{modKey}+T</DitherDropdownMenuShortcut>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuItem variant="dither" onSelect={handleOpenDriveNewTab}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                class="w-4 h-4 text-white/80 shrink-0"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path d="M3 9h18M9 21V9" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span>Open in New Window</span>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuItem variant="dither" onSelect={handleOpenDriveNewTab}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                class="w-4 h-4 text-white/80 shrink-0"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
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

            <DitherDropdownMenuItem
              variant="dither"
              onSelect={handleOpenStorageMap}
              class="text-[color-mix(in_oklab,var(--accent)_70%,white)] group-hover:text-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                class="w-4 h-4 text-[var(--accent)] shrink-0"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <rect
                  x="3"
                  y="3"
                  width="7"
                  height="9"
                  rx="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <rect
                  x="14"
                  y="3"
                  width="7"
                  height="5"
                  rx="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <rect
                  x="14"
                  y="12"
                  width="7"
                  height="9"
                  rx="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <rect
                  x="3"
                  y="16"
                  width="7"
                  height="5"
                  rx="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span class="font-medium">Inspect Storage Map</span>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[color-mix(in_oklab,var(--accent)_20%,transparent)] text-[var(--accent)] ml-auto">
                Zig
              </span>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuSeparator />

            <DitherDropdownMenuItem
              variant="dither"
              disabled={!!driveLock()}
              onSelect={() => !driveLock() && closeContextMenu()}
              class={
                driveLock()
                  ? 'opacity-40 cursor-not-allowed'
                  : 'text-rose-400/90 group-hover:text-rose-300'
              }
              title={driveLock() ? lockReason(driveLock()) : undefined}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                class="w-4 h-4 text-rose-400 shrink-0"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  d="M12 3l8 12H4l8-12zM4 19h16"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>Unmount</span>
              <Show when={driveLock()}>
                <DitherDropdownMenuShortcut>{lockLabel(driveLock())}</DitherDropdownMenuShortcut>
              </Show>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuItem
              variant="dither"
              disabled={!!driveLock()}
              onSelect={() => !driveLock() && closeContextMenu()}
              class={driveLock() ? 'opacity-40 cursor-not-allowed' : undefined}
              title={driveLock() ? lockReason(driveLock()) : undefined}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                class="w-4 h-4 text-white/60 shrink-0"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  d="M18.36 6.64a9 9 0 11-12.73 0M12 2v10"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>Eject & Power Off</span>
              <Show when={driveLock()}>
                <DitherDropdownMenuShortcut>{lockLabel(driveLock())}</DitherDropdownMenuShortcut>
              </Show>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuSeparator />

            <DitherDropdownMenuItem variant="dither" onSelect={() => closeContextMenu()}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                class="w-4 h-4 text-white/60 shrink-0"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>Hide from Sidebar</span>
            </DitherDropdownMenuItem>

            <DitherDropdownMenuItem variant="dither" onSelect={() => closeContextMenu()}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                class="w-4 h-4 text-white/60 shrink-0"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>Manage Places & Devices...</span>
            </DitherDropdownMenuItem>
          </DitherDropdownMenuGroup>
        </Show>
      </DitherDropdownMenuContent>
    </DitherDropdownMenu>
  )

  return (
    <>
      {menu}
      <Show when={emptyTrashConfirm()} keyed>
        {(dir) => <EmptyTrashDialog dir={dir} onDismiss={() => setEmptyTrashConfirm(null)} />}
      </Show>
    </>
  )
}

export default ContextMenu
