import { batch, createMemo, createSignal } from 'solid-js'
import type {
  ChatSessionSummary,
  EditorTab,
  GitCommit,
  GitStatus,
  SystemDrive,
  WallpaperPalette
} from './types'
import { initialChatSessions } from './fixtures/sidebar'
import { currentView, setCurrentView } from './viewState'

export { currentView, setCurrentView, previousView, setPreviousView } from './viewState'
export * from './components/browser/state'

export const [currentNote, setCurrentNote] = createSignal('Welcome')
export const [currentFolder, setCurrentFolder] = createSignal('')
// Settings
export type SettingsPage =
  'General' | 'Appearance' | 'Editor' | 'Files' | 'Media' | 'Uploads' | 'Keyboard' | 'About'
export const SETTINGS_PAGES: SettingsPage[] = [
  'General',
  'Appearance',
  'Editor',
  'Files',
  'Media',
  'Uploads',
  'Keyboard',
  'About'
]

export const [isSettingsModalOpen, setIsSettingsModalOpen] = createSignal(false)
export const [activeSettingsPage, setActiveSettingsPage] = createSignal<SettingsPage>('General')

// General Settings
export type SortByField = 'name' | 'modified' | 'size' | 'kind'
export const [showHiddenFiles, setShowHiddenFiles] = createSignal(false)
const SORT_KEY = 'polaris.sort.v1'
const savedSort = ((): { field?: SortByField; desc?: boolean; foldersFirst?: boolean } => {
  try {
    return JSON.parse(localStorage.getItem(SORT_KEY) ?? '{}')
  } catch {
    return {}
  }
})()
export const [sortField, setSortFieldSignal] = createSignal<SortByField>(savedSort.field ?? 'name')
export const [sortDescending, setSortDescendingSignal] = createSignal(savedSort.desc ?? false)
export const [foldersFirst, setFoldersFirstSignal] = createSignal(savedSort.foldersFirst ?? true)
const persistSort = (): void => {
  try {
    localStorage.setItem(
      SORT_KEY,
      JSON.stringify({ field: sortField(), desc: sortDescending(), foldersFirst: foldersFirst() })
    )
  } catch {
    /* storage unavailable */
  }
}
export const setSortField = (v: SortByField): void => {
  setSortFieldSignal(v)
  persistSort()
}
export const setSortDescending = (v: boolean): void => {
  setSortDescendingSignal(v)
  persistSort()
}
export const setFoldersFirst = (v: boolean): void => {
  setFoldersFirstSignal(v)
  persistSort()
}
/**
 * Pick a sort. Choosing the active one flips its direction; a new field starts
 * in its natural direction (names A→Z, kinds A→Z, newest and largest first).
 */
export const setSort = (field: SortByField): void => {
  if (sortField() === field) {
    setSortDescending(!sortDescending())
    return
  }
  batch(() => {
    setSortFieldSignal(field)
    setSortDescendingSignal(field === 'modified' || field === 'size')
  })
  persistSort()
}
export const SORT_LABELS: Record<SortByField, string> = {
  name: 'Name',
  modified: 'Date modified',
  size: 'Size',
  kind: 'Kind'
}
export const [defaultTerminal, setDefaultTerminal] = createSignal<
  'Terminal' | 'Ghostty' | 'Alacritty' | 'Kitty'
>('Terminal')
export const [updateTrack, setUpdateTrack] = createSignal<'Stable' | 'Nightly'>('Nightly')

// Window Settings
export type WindowDefaultSize = 'Reasonable' | 'Almost Full' | 'Last Used'
export const [windowDefaultSize, setWindowDefaultSize] =
  createSignal<WindowDefaultSize>('Reasonable')
export const [viewMode, setViewMode] = createSignal<'List' | 'Grid'>('Grid')
export const [showPathBar, setShowPathBar] = createSignal(true)
export const [openFoldersWhileDragging, setOpenFoldersWhileDragging] = createSignal(false)
export const [gridIconSize, setGridIconSize] = createSignal(72)
export const [gridLabelSize, setGridLabelSize] = createSignal<'Small' | 'Medium' | 'Large'>(
  'Medium'
)
export const [showThumbnails, setShowThumbnails] = createSignal(true)
export const [suggestSentenceCaseNames, setSuggestSentenceCaseNames] = createSignal(false)
export const [listRowSize, setListRowSize] = createSignal<'Small' | 'Medium' | 'Large'>('Medium')

// Appearance Settings
export interface MonodriveAccent {
  readonly hex: string
  readonly label: string
}

export const MONODRIVE_ACCENTS: readonly MonodriveAccent[] = [
  { hex: '#4da3f5', label: 'Blue' },
  { hex: '#8b5cf6', label: 'Violet' },
  { hex: '#ec4899', label: 'Pink' },
  { hex: '#ef4444', label: 'Red' },
  { hex: '#f59e0b', label: 'Orange' },
  { hex: '#10b981', label: 'Green' }
] as const

export const [appearanceTheme, setAppearanceTheme] = createSignal<'System' | 'Dark' | 'Light'>(
  'Dark'
)
export const [selectedAccentColor, setSelectedAccentColor] = createSignal<string>('#4da3f5')
export const [windowHue, setWindowHue] = createSignal(240)
export const [windowSaturation, setWindowSaturation] = createSignal(0)
export const [darkLightness, setDarkLightness] = createSignal(9)
export const [windowOpacity, setWindowOpacity] = createSignal(95)
export const [mainPaneGlass, setMainPaneGlass] = createSignal(false)
export const [workspaceStyle, setWorkspaceStyle] = createSignal<'Card' | 'Boxy'>('Card')

// Agents Settings
export const [agentsChangeFiles, setAgentsChangeFiles] = createSignal(true)
export const [selectedHarness, setSelectedHarness] = createSignal<string>('Antigravity')

// Modal Actions
export const openSettingsModal = (page?: SettingsPage): void => {
  if (page) setActiveSettingsPage(page)
  setIsSettingsModalOpen(true)
}

export const closeSettingsModal = (): void => {
  setIsSettingsModalOpen(false)
}

export const toggleSettingsModal = (page?: SettingsPage): void => {
  if (isSettingsModalOpen()) {
    closeSettingsModal()
  } else {
    openSettingsModal(page)
  }
}

export const openSettings = (page?: any): void => {
  if (typeof page === 'string' && SETTINGS_PAGES.includes(page as SettingsPage)) {
    openSettingsModal(page as SettingsPage)
  } else {
    openSettingsModal()
  }
}

export const closeSettings = (): void => {
  closeSettingsModal()
}

export const toggleSettings = (): void => {
  toggleSettingsModal()
}

/** Reset the wired (store-backed) settings of a page; prefs reset via settings/prefs.ts. */
export const restorePageDefaults = (page: SettingsPage): void => {
  switch (page) {
    case 'General':
      setDefaultTerminal('Terminal')
      setUpdateTrack('Nightly')
      break
    case 'Appearance':
      setSelectedAccentColor('#4da3f5')
      break
    case 'Files':
      setShowHiddenFiles(false)
      setFoldersFirst(true)
      setSortField('name')
      setSortDescending(false)
      break
  }
}

export const [isSidebarPinned, setIsSidebarPinned] = createSignal(true)

// Settings View State
export type SettingsTabId = 'general' | 'appearance' | 'editor' | 'shortcuts' | 'projects'
export const [activeSettingsTab, setActiveSettingsTab] = createSignal<SettingsTabId>('general')
export const [settingsSearchQuery, setSettingsSearchQuery] = createSignal<string>('')

// Projects State
export type ProjectBadgeColor = 'amber' | 'emerald' | 'yellow' | 'purple' | 'cyan' | 'blue' | 'rose'

export interface ProjectAction {
  id: string
  name: string
  command: string
}

export interface ProjectItem {
  id: string
  name: string
  path: string
  monogram: string
  color: ProjectBadgeColor
  model: string
  workspaceMode: string
  actions: ProjectAction[]
}

const DEFAULT_PROJECTS: ProjectItem[] = []

export const [projectsList, setProjectsList] = createSignal<ProjectItem[]>(DEFAULT_PROJECTS)
export const [selectedProjectId, setSelectedProjectId] = createSignal<string | null>(null)

export const updateProject = (id: string, patch: Partial<ProjectItem>): void => {
  setProjectsList((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
}

export const addProject = (project: ProjectItem): void => {
  setProjectsList((prev) => [...prev, project])
}

export const removeProject = (id: string): void => {
  setProjectsList((prev) => prev.filter((p) => p.id !== id))
  if (selectedProjectId() === id) {
    setSelectedProjectId(null)
  }
}

// Appearance Preferences
export type ColorSchemeMode = 'system' | 'dark' | 'light'
export type ThemePresetId =
  | 'ember'
  | 'abyssal'
  | 'obsidian'
  | 'nocturne'
  | 'amethyst'
  | 'umber'
  | 'classic'
  | 'grove'
  | 'ocean'
  | 'iris'
  | 'sunset'

export const [colorScheme, setColorScheme] = createSignal<ColorSchemeMode>('dark')
export const [activeThemeId, setActiveThemeId] = createSignal<ThemePresetId>('ember')

export const THEME_ACCENTS: Record<ThemePresetId, string> = {
  ember: '#FF66B8',
  abyssal: '#38BDF8',
  obsidian: '#CBD5E1',
  nocturne: '#10B981',
  amethyst: '#A855F7',
  umber: '#FB923C',
  classic: '#52525B',
  grove: '#84CC16',
  ocean: '#06B6D4',
  iris: '#6366F1',
  sunset: '#F43F5E'
}

// Sidebar explorer mode: Places/Devices list or the workspace file tree
export type ExplorerMode = 'places' | 'tree'
const readExplorerMode = (): ExplorerMode => {
  try {
    return localStorage.getItem('polaris.sidebar.explorerMode') === 'tree' ? 'tree' : 'places'
  } catch {
    return 'places'
  }
}
export const [explorerMode, setExplorerModeSignal] = createSignal<ExplorerMode>(readExplorerMode())
export const setExplorerMode = (mode: ExplorerMode): void => {
  setExplorerModeSignal(mode)
  try {
    localStorage.setItem('polaris.sidebar.explorerMode', mode)
  } catch {
    /* storage unavailable */
  }
}

// Wallpaper palette
const readWallpaperSync = (): boolean => {
  try {
    return localStorage.getItem('polaris.theme.wallpaperSync') !== '0'
  } catch {
    return true
  }
}
export const [wallpaperSync, setWallpaperSyncSignal] = createSignal<boolean>(readWallpaperSync())
export const setWallpaperSync = (on: boolean): void => {
  setWallpaperSyncSignal(on)
  try {
    localStorage.setItem('polaris.theme.wallpaperSync', on ? '1' : '0')
  } catch {
    /* storage unavailable */
  }
}
export const [wallpaperTheme, setWallpaperTheme] = createSignal<WallpaperPalette | null>(null)
/** The palette actually in effect: wallpaper when synced and available, else null. */
export const activeWallpaperTheme = createMemo(() => (wallpaperSync() ? wallpaperTheme() : null))

export const activeAccentColor = createMemo(
  () => activeWallpaperTheme()?.primary ?? selectedAccentColor()
)
export const [appearanceContrast, setAppearanceContrast] = createSignal<number>(100)
export const [glassOpacity, setGlassOpacity] = createSignal<number>(65)
export const [showSunrays, setShowSunrays] = createSignal<boolean>(true)

// Quick Open & Global Search State
export const [isQuickOpenOpen, setIsQuickOpenOpen] = createSignal(false)
export const toggleQuickOpen = (): void => {
  setIsQuickOpenOpen((prev) => !prev)
}

export const [globalSearchQuery, setGlobalSearchQuery] = createSignal('')
export const [globalSearchCaseSensitive, setGlobalSearchCaseSensitive] = createSignal(false)
export const [globalSearchWholeWord, setGlobalSearchWholeWord] = createSignal(false)

export const [targetEditorLocation, setTargetEditorLocation] = createSignal<{
  path: string
  line: number
  column?: number
} | null>(null)

// Terminal Panel State
export interface TerminalSessionInfo {
  id: string
  title: string
  cwd?: string
  /** command typed into the shell once it starts (e.g. the update) */
  run?: string
}

export const [terminalSessions, setTerminalSessions] = createSignal<TerminalSessionInfo[]>([])
export const [activeTerminalId, setActiveTerminalId] = createSignal<string>('')
export const [closingTerminalIds, setClosingTerminalIds] = createSignal<string[]>([])
export const [terminalProcessMap, setTerminalProcessMap] = createSignal<Record<string, string>>({})

export const updateTerminalProcess = (id: string, processName: string): void => {
  const clean = processName.trim()
  if (!clean) return
  if (terminalProcessMap()[id] === clean) return
  setTerminalProcessMap((prev) => ({ ...prev, [id]: clean }))
}

export const [isTerminalOpen, setIsTerminalOpen] = createSignal(false)
export const [terminalHeight, setTerminalHeight] = createSignal(340)

export const toggleTerminal = (): void => {
  if (!isTerminalOpen()) {
    if (terminalSessions().length === 0) {
      addTerminal()
      return
    }
    setIsTerminalOpen(true)
  } else {
    setIsTerminalOpen(false)
  }
}

export const addTerminal = (cwdOrEvent?: string | unknown, run?: string): void => {
  const cwd = typeof cwdOrEvent === 'string' ? cwdOrEvent : undefined
  const sessions = terminalSessions()
  const nextNum =
    sessions.length > 0 ? Math.max(...sessions.map((s) => parseInt(s.title, 10) || 0)) + 1 : 1
  const newId = `term-${Date.now()}`
  setTerminalSessions([...sessions, { id: newId, title: String(nextNum), cwd, run }])
  setTerminalProcessMap((prev) => ({ ...prev, [newId]: 'fish' }))
  setActiveTerminalId(newId)
  setIsTerminalOpen(true)
}

export const closeTerminal = (id: string): void => {
  const sessions = terminalSessions()
  if (!sessions.some((s) => s.id === id)) return
  if (closingTerminalIds().includes(id)) return

  const remaining = sessions.filter((s) => s.id !== id && !closingTerminalIds().includes(s.id))

  // Switch active session immediately if closing the active one
  if (activeTerminalId() === id && remaining.length > 0) {
    const currentIndex = sessions.findIndex((s) => s.id === id)
    const nextSession = remaining[Math.min(currentIndex, remaining.length - 1)]
    if (nextSession) {
      setActiveTerminalId(nextSession.id)
    }
  }

  setClosingTerminalIds([...closingTerminalIds(), id])

  setTimeout(() => {
    const currentSessions = terminalSessions()
    const nextRemaining = currentSessions.filter((s) => s.id !== id)
    setClosingTerminalIds(closingTerminalIds().filter((closingId) => closingId !== id))

    if (nextRemaining.length === 0) {
      setTerminalSessions([])
      setTerminalProcessMap({})
      setActiveTerminalId('')
      setIsTerminalOpen(false)
    } else {
      setTerminalSessions(nextRemaining)
      setTerminalProcessMap((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      if (activeTerminalId() === id) {
        setActiveTerminalId(nextRemaining[nextRemaining.length - 1].id)
      }
    }
  }, 210)
}

// Git integration
export const [gitCommits, setGitCommits] = createSignal<GitCommit[]>([])
export const [gitStatus, setGitStatus] = createSignal<GitStatus | null>(null)
export const [selectedCommitHash, setSelectedCommitHash] = createSignal<string | null>(null)

export const refreshGitData = async (): Promise<void> => {
  if (window.api?.gitGetLog) {
    try {
      const [commits, status] = await Promise.all([
        window.api.gitGetLog(),
        window.api.gitGetStatus()
      ])
      setGitCommits(commits)
      setGitStatus(status)
      if (commits.length > 0 && !selectedCommitHash()) {
        setSelectedCommitHash(commits[0].hash)
      }
    } catch (err) {
      console.warn('Failed to refresh git data:', err)
    }
  }
}

export const [selectedFilePath, setSelectedFilePath] = createSignal<string | null>(null)
export const [openFiles, setOpenFiles] = createSignal<string[]>([])

/** Return to the editor (only meaningful when files are open). */
export const showEditor = (): void => {
  if (openTabs().length > 0) setCurrentView('editor')
}

/** Mod+E: flip between the folder view and the editor. */
export const toggleEditorView = (): void => {
  if (currentView() === 'editor') setCurrentView('files')
  else showEditor()
}

// Editor Tabs State
export const [openTabs, setOpenTabs] = createSignal<EditorTab[]>([])
export const [activeTabPath, setActiveTabPath] = createSignal<string | null>(null)

// In-Memory Document Caches & Dirty File State
export const [dirtyFilePaths, setDirtyFilePaths] = createSignal<Set<string>>(new Set())
export const [lastSavedPath, setLastSavedPath] = createSignal<string | null>(null)

const fileContentCache = new Map<string, string>()
const initialDocCache = new Map<string, string>()

export const isFileDirty = (path?: string | null): boolean => {
  if (!path) return false
  return dirtyFilePaths().has(path)
}

export const hasDirtyDescendant = (dirPath?: string | null): boolean => {
  if (!dirPath) return false
  const prefix = dirPath.endsWith('/') || dirPath.endsWith('\\') ? dirPath : `${dirPath}/`
  const prefixWin = `${dirPath}\\`
  for (const p of dirtyFilePaths()) {
    if (p.startsWith(prefix) || p.startsWith(prefixWin)) return true
  }
  return false
}

export const getCachedFileContent = (path: string): string | undefined => {
  return fileContentCache.get(path)
}

export const setCachedFileContent = (path: string, content: string): void => {
  fileContentCache.set(path, content)
}

export const getInitialDocContent = (path: string): string | undefined => {
  return initialDocCache.get(path)
}

export const setInitialDocContent = (path: string, content: string): void => {
  initialDocCache.set(path, content)
}

export const markFileDirty = (path: string, dirty: boolean): void => {
  setDirtyFilePaths((prev) => {
    if (prev.has(path) === dirty) return prev
    const next = new Set(prev)
    if (dirty) {
      next.add(path)
    } else {
      next.delete(path)
    }
    return next
  })

  // Sync isDirty on tab object in-place so tab referential identity remains stable
  // and <For> does not unmount/remount the tab DOM element
  const tab = openTabs().find((t) => t.path === path)
  if (tab && tab.isDirty !== dirty) {
    tab.isDirty = dirty
  }
}

export const saveFile = async (path: string, content: string): Promise<boolean> => {
  try {
    if (window.api?.writeFile) {
      const success = await window.api.writeFile(path, content)
      if (success) {
        fileContentCache.set(path, content)
        initialDocCache.set(path, content)
        markFileDirty(path, false)
        setLastSavedPath(path)
        setTimeout(() => {
          if (lastSavedPath() === path) {
            setLastSavedPath(null)
          }
        }, 1800)
        return true
      }
    }
    return false
  } catch (err) {
    console.error('Failed to save file:', path, err)
    return false
  }
}

export const openFileInEditor = (path: string, name: string): void => {
  setOpenTabs((prev) => {
    const exists = prev.some((t) => t.path === path)
    if (!exists) {
      return [...prev, { path, name, isDirty: isFileDirty(path) }]
    }
    return prev
  })
  setActiveTabPath(path)
  setSelectedFilePath(path)
  setCurrentView('editor')
}

export const openFileAtLocation = (
  path: string,
  name: string,
  line: number,
  column?: number
): void => {
  openFileInEditor(path, name)
  setTargetEditorLocation({ path, line, column })
}

export const closeEditorTab = (path: string): void => {
  fileContentCache.delete(path)
  initialDocCache.delete(path)
  markFileDirty(path, false)

  setOpenTabs((prev) => {
    const next = prev.filter((t) => t.path !== path)
    if (activeTabPath() === path) {
      const closedIndex = prev.findIndex((t) => t.path === path)
      const nextActive = next[closedIndex] || next[closedIndex - 1] || null
      setActiveTabPath(nextActive ? nextActive.path : null)
      setSelectedFilePath(nextActive ? nextActive.path : null)
      if (!nextActive && currentView() === 'editor') {
        setCurrentView('files')
      }
    }
    return next
  })
}

export const renameOpenFile = (oldPath: string, newPath: string, newName: string): void => {
  setOpenTabs((prev) =>
    prev.map((t) => (t.path === oldPath ? { ...t, path: newPath, name: newName } : t))
  )
  if (activeTabPath() === oldPath) {
    setActiveTabPath(newPath)
  }
  if (selectedFilePath() === oldPath) {
    setSelectedFilePath(newPath)
  }
  const cached = fileContentCache.get(oldPath)
  if (cached !== undefined) {
    fileContentCache.delete(oldPath)
    fileContentCache.set(newPath, cached)
  }
  const init = initialDocCache.get(oldPath)
  if (init !== undefined) {
    initialDocCache.delete(oldPath)
    initialDocCache.set(newPath, init)
  }
}

// Context Menu & File Operations State
export interface ContextMenuTarget {
  path?: string
  isDirectory?: boolean
  name?: string
  isDrive?: boolean
  drive?: SystemDrive
}

export interface ContextMenuState {
  isOpen: boolean
  x: number
  y: number
  target?: ContextMenuTarget
}

export const [contextMenuState, setContextMenuState] = createSignal<ContextMenuState>({
  isOpen: false,
  x: 0,
  y: 0
})

export const openContextMenu = (x: number, y: number, target?: ContextMenuTarget): void => {
  setContextMenuState({ isOpen: true, x, y, target })
}

export const closeContextMenu = (): void => {
  setContextMenuState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev))
}

export interface FileClipboard {
  path: string
  action: 'copy' | 'cut'
}

export const [fileClipboard, setFileClipboard] = createSignal<FileClipboard | null>(null)

export interface FileActionModalState {
  isOpen: boolean
  mode: 'newFile' | 'newFolder' | 'rename'
  targetDir: string
  initialValue: string
  targetPath?: string
}

export const [fileActionModalState, setFileActionModalState] = createSignal<FileActionModalState>({
  isOpen: false,
  mode: 'newFile',
  targetDir: '',
  initialValue: ''
})

export const openFileActionModal = (
  mode: 'newFile' | 'newFolder' | 'rename',
  targetDir: string,
  initialValue = '',
  targetPath?: string
): void => {
  setFileActionModalState({
    isOpen: true,
    mode,
    targetDir,
    initialValue,
    targetPath
  })
}

export const closeFileActionModal = (): void => {
  setFileActionModalState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev))
}

// Inspector Drawer State
export const [isInspectorOpen, setIsInspectorOpen] = createSignal(false)
export const [inspectorTargetPath, setInspectorTargetPath] = createSignal<string | null>(null)
const getInitialInspectorWidth = (): number => {
  try {
    const saved = localStorage.getItem('polaris.inspector.width')
    if (saved) {
      const val = parseInt(saved, 10)
      if (!Number.isNaN(val)) return Math.max(280, Math.min(480, val))
    }
  } catch {}
  return 320
}

export const [inspectorWidth, setInspectorWidth] = createSignal<number>(getInitialInspectorWidth())

export const setAndPersistInspectorWidth = (w: number): void => {
  const clamped = Math.max(280, Math.min(480, w))
  setInspectorWidth(clamped)
  try {
    localStorage.setItem('polaris.inspector.width', String(clamped))
  } catch {}
}

// Live drag state, shared so the top bar's filter tab can track the canvas edge.
export const [inspectorResizing, setInspectorResizing] = createSignal(false)
export const [inspectorDragWidth, setInspectorDragWidth] = createSignal<number | null>(null)
/** Width the drawer currently occupies on screen (0 when closed). */
export const inspectorVisibleWidth = (): number =>
  isInspectorOpen() ? (inspectorDragWidth() ?? inspectorWidth()) : 0
/** Shared slide transition so the drawer and anything aligned to it move in lockstep. */
export const INSPECTOR_TRANSITION = '250ms cubic-bezier(0.16, 1, 0.3, 1)'

export const openInspector = (path?: string): void => {
  if (path) setInspectorTargetPath(path)
  setIsInspectorOpen(true)
}

export const closeInspector = (): void => {
  setIsInspectorOpen(false)
}

export const toggleInspector = (path?: string): void => {
  if (isInspectorOpen()) {
    if (path && inspectorTargetPath() !== path) {
      setInspectorTargetPath(path)
    } else {
      closeInspector()
    }
  } else {
    openInspector(path)
  }
}

export interface PropertiesModalState {
  isOpen: boolean
  targetPath: string
}

export const [propertiesModalState, setPropertiesModalState] = createSignal<PropertiesModalState>({
  isOpen: false,
  targetPath: ''
})

export const openPropertiesModal = (targetPath: string): void => {
  setPropertiesModalState({
    isOpen: true,
    targetPath
  })
}

export const closePropertiesModal = (): void => {
  setPropertiesModalState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev))
}

export interface StorageMapModalState {
  isOpen: boolean
  targetPath: string
  driveName?: string
  x?: number
  y?: number
}

export const [storageMapModalState, setStorageMapModalState] = createSignal<StorageMapModalState>({
  isOpen: false,
  targetPath: '/'
})

export const openStorageMapModal = (
  targetPath: string,
  driveName?: string,
  x?: number,
  y?: number
): void => {
  setStorageMapModalState({
    isOpen: true,
    targetPath,
    driveName,
    x,
    y
  })
}

export const closeStorageMapModal = (): void => {
  setStorageMapModalState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev))
}

export const [explorerRefreshTrigger, setExplorerRefreshTrigger] = createSignal(0)
export const refreshFileExplorer = (): void => {
  setExplorerRefreshTrigger((prev) => prev + 1)
}

export const [collapseAllFoldersTrigger, setCollapseAllFoldersTrigger] = createSignal(0)
export const collapseAllFolders = (): void => {
  setCollapseAllFoldersTrigger((prev) => prev + 1)
}

export interface InlineRenameState {
  path: string
  name: string
}

export const [inlineRenameState, setInlineRenameState] = createSignal<InlineRenameState | null>(
  null
)

export const startInlineRename = (path: string, name: string): void => {
  setInlineRenameState({ path, name })
}

export const cancelInlineRename = (): void => {
  setInlineRenameState(null)
}

// Chat Sessions State
export const [currentChatSessionId, setCurrentChatSessionId] = createSignal<string>('session-1')

export const [chatSessions, setChatSessions] =
  createSignal<ChatSessionSummary[]>(initialChatSessions)

// Sidebar Search Focus Request
export const [sidebarSearchFocus, setSidebarSearchFocus] = createSignal(0)
export const requestSidebarSearchFocus = (): void => {
  setSidebarSearchFocus((n) => n + 1)
}
