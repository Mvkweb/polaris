import { batch, createMemo, createSignal } from 'solid-js'
import type {
  ChatSessionSummary,
  FileNode,
  EditorTab,
  GitCommit,
  GitStatus,
  SystemDrive,
  WallpaperPalette
} from './types'

export const [currentNote, setCurrentNote] = createSignal('Welcome')
export const [currentFolder, setCurrentFolder] = createSignal('')
export const [currentView, setCurrentView] = createSignal<
  'files' | 'search' | 'editor' | 'tasks' | 'chat' | 'settings'
>('files')
export const [previousView, setPreviousView] = createSignal<
  'files' | 'search' | 'editor' | 'tasks' | 'chat'
>('files')

// ── Monodrive Settings & Preferences ─────────────────────────────────────────
export type SettingsPage = 'General' | 'Window' | 'Appearance' | 'Keyboard' | 'Agents'
export const SETTINGS_PAGES: SettingsPage[] = [
  'General',
  'Window',
  'Appearance',
  'Keyboard',
  'Agents'
]

export const [isSettingsModalOpen, setIsSettingsModalOpen] = createSignal(false)
export const [activeSettingsPage, setActiveSettingsPage] = createSignal<SettingsPage>('General')

// General Settings
export type SortByField = 'name' | 'modified' | 'size' | 'kind'
export const [showHiddenFiles, setShowHiddenFiles] = createSignal(false)
export const [sortField, setSortField] = createSignal<SortByField>('name')
export const [sortDescending, setSortDescending] = createSignal(false)
export const [foldersFirst, setFoldersFirst] = createSignal(true)
export const [defaultTerminal, setDefaultTerminal] = createSignal<'Terminal' | 'Ghostty' | 'Alacritty' | 'Kitty'>('Terminal')
export const [updateTrack, setUpdateTrack] = createSignal<'Stable' | 'Nightly'>('Nightly')

// Window Settings
export type WindowDefaultSize = 'Reasonable' | 'Almost Full' | 'Last Used'
export const [windowDefaultSize, setWindowDefaultSize] = createSignal<WindowDefaultSize>('Reasonable')
export const [viewMode, setViewMode] = createSignal<'List' | 'Grid'>('Grid')
export const [showPathBar, setShowPathBar] = createSignal(true)
export const [openFoldersWhileDragging, setOpenFoldersWhileDragging] = createSignal(false)
export const [gridIconSize, setGridIconSize] = createSignal(72)
export const [gridLabelSize, setGridLabelSize] = createSignal<'Small' | 'Medium' | 'Large'>('Medium')
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

export const [appearanceTheme, setAppearanceTheme] = createSignal<'System' | 'Dark' | 'Light'>('Dark')
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

export const restorePageDefaults = (page: SettingsPage): void => {
  switch (page) {
    case 'General':
      setShowHiddenFiles(false)
      setSortField('name')
      setSortDescending(false)
      setFoldersFirst(true)
      setDefaultTerminal('Terminal')
      setUpdateTrack('Nightly')
      break
    case 'Window':
      setWindowDefaultSize('Reasonable')
      setViewMode('Grid')
      setShowPathBar(true)
      setOpenFoldersWhileDragging(false)
      setGridIconSize(72)
      setGridLabelSize('Medium')
      setShowThumbnails(true)
      setSuggestSentenceCaseNames(false)
      setListRowSize('Medium')
      break
    case 'Appearance':
      setAppearanceTheme('Dark')
      setSelectedAccentColor('#4da3f5')
      setWindowHue(240)
      setWindowSaturation(0)
      setDarkLightness(9)
      setWindowOpacity(95)
      setMainPaneGlass(false)
      setWorkspaceStyle('Card')
      break
    case 'Keyboard':
      break
    case 'Agents':
      setAgentsChangeFiles(true)
      setSelectedHarness('Antigravity')
      break
  }
}

export const [isSidebarPinned, setIsSidebarPinned] = createSignal(true)

// ── Settings View State ───────────────────────────────────────────────────────
export type SettingsTabId = 'general' | 'appearance' | 'editor' | 'shortcuts' | 'projects'
export const [activeSettingsTab, setActiveSettingsTab] = createSignal<SettingsTabId>('general')
export const [settingsSearchQuery, setSettingsSearchQuery] = createSignal<string>('')

// ── Projects State ────────────────────────────────────────────────────────────
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

// ── Appearance Preferences ───────────────────────────────────────────────────
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

// ── Sidebar explorer mode: Places/Devices list or the workspace file tree ──
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

// ── Wallpaper-synced palette (written by dithergen/matugen, watched by main) ──
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

// ── Quick Open & Global Search State ──────────────────────────────────────────
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

// ── Terminal Panel State ──────────────────────────────────────────────────────
export interface TerminalSessionInfo {
  id: string
  title: string
  cwd?: string
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

export const addTerminal = (cwdOrEvent?: string | unknown): void => {
  const cwd = typeof cwdOrEvent === 'string' ? cwdOrEvent : undefined
  const sessions = terminalSessions()
  const nextNum =
    sessions.length > 0 ? Math.max(...sessions.map((s) => parseInt(s.title, 10) || 0)) + 1 : 1
  const newId = `term-${Date.now()}`
  setTerminalSessions([...sessions, { id: newId, title: String(nextNum), cwd }])
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

// ── Real Git Integration State ────────────────────────────────────────────────
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

// ── Workspace & File Tree State ───────────────────────────────────────────────
export const [workspaceRoot, setWorkspaceRoot] = createSignal<string>('')
export const [selectedFilePath, setSelectedFilePath] = createSignal<string | null>(null)
export const [openFiles, setOpenFiles] = createSignal<string[]>([])

// ── Directory Browser History & Navigation ────────────────────────────────────
export const [navHistory, setNavHistory] = createSignal<string[]>([])
export const [historyIndex, setHistoryIndex] = createSignal<number>(-1)
export const [selectedGridEntry, setSelectedGridEntry] = createSignal<string | null>(null)
export const [browserSearchFilter, setBrowserSearchFilter] = createSignal<string>('')
export const [browserFilterFocused, setBrowserFilterFocused] = createSignal(false)
/** The filter tab "melts" into the canvas while focused or holding a query. */
export const isFilterTabActive = (): boolean =>
  browserFilterFocused() || browserSearchFilter().length > 0

export interface BrowserTab {
  id: string
  path: string
  name: string
}

export const [browserTabs, setBrowserTabs] = createSignal<BrowserTab[]>([
  { id: 'tab-default', path: '', name: 'Workspace' }
])
export const [activeTabId, setActiveTabId] = createSignal<string>('tab-default')

export const openNewTab = (path?: string): void => {
  const targetPath = path || workspaceRoot() || '.'
  const name = targetPath.split(/[/\\]/).filter(Boolean).pop() || '/'
  const newTab: BrowserTab = {
    id: `tab-${Date.now()}`,
    path: targetPath,
    name
  }
  setBrowserTabs((prev) => [...prev, newTab])
  setActiveTabId(newTab.id)
  navigateTo(targetPath)
}

export const closeBrowserTab = (id: string, e?: MouseEvent): void => {
  e?.stopPropagation()
  const tabs = browserTabs()
  if (tabs.length <= 1) return
  const idx = tabs.findIndex((t) => t.id === id)
  const remaining = tabs.filter((t) => t.id !== id)
  setBrowserTabs(remaining)
  if (activeTabId() === id) {
    const nextActive = remaining[Math.min(idx, remaining.length - 1)]
    setActiveTabId(nextActive.id)
    navigateTo(nextActive.path)
  }
}

export const switchTab = (id: string): void => {
  const tab = browserTabs().find((t) => t.id === id)
  if (tab) {
    setActiveTabId(tab.id)
    navigateTo(tab.path)
  }
}

export const navigateTo = (newPath: string): void => {
  if (!newPath) return
  const current = workspaceRoot()

  batch(() => {
    // Always update active tab name & path
    const activeId = activeTabId()
    const name = newPath.split(/[/\\]/).filter(Boolean).pop() || '/'
    setBrowserTabs((prev) =>
      prev.map((tab) => (tab.id === activeId ? { ...tab, path: newPath, name } : tab))
    )

    if (current === newPath) return

    const history = navHistory()
    const idx = historyIndex()

    const updatedHistory = [...history.slice(0, idx + 1), newPath]
    setNavHistory(updatedHistory)
    setHistoryIndex(updatedHistory.length - 1)
    setWorkspaceRoot(newPath)
    setSelectedGridEntry(null)
  })
}

export const navigateBack = (): void => {
  const idx = historyIndex()
  if (idx > 0) {
    const prevPath = navHistory()[idx - 1]
    batch(() => {
      setHistoryIndex(idx - 1)
      setWorkspaceRoot(prevPath)
      setSelectedGridEntry(null)
    })
  }
}

export const navigateForward = (): void => {
  const history = navHistory()
  const idx = historyIndex()
  if (idx < history.length - 1) {
    const nextPath = history[idx + 1]
    batch(() => {
      setHistoryIndex(idx + 1)
      setWorkspaceRoot(nextPath)
      setSelectedGridEntry(null)
    })
  }
}

export const canNavigateBack = (): boolean => historyIndex() > 0
export const canNavigateForward = (): boolean => {
  const history = navHistory()
  const idx = historyIndex()
  return idx >= 0 && idx < history.length - 1
}

// ── Editor Tabs State ─────────────────────────────────────────────────────────
export const [openTabs, setOpenTabs] = createSignal<EditorTab[]>([])
export const [activeTabPath, setActiveTabPath] = createSignal<string | null>(null)

// ── In-Memory Document Caches & Dirty File State ──────────────────────────────
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

// ── Context Menu & File Operations State ─────────────────────────────────────
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

// ── Inspector Drawer State ───────────────────────────────────────────────────
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

// ── Chat Sessions State ───────────────────────────────────────────────────────
export const [currentChatSessionId, setCurrentChatSessionId] = createSignal<string>('session-1')

const initialChatSessions: ChatSessionSummary[] = [
  {
    id: 'session-1',
    title: 'Grimmoire Sidebar Refactor',
    modelId: 'gemini-2.5-flash',
    modelName: 'Gemini 2.5 Flash',
    modelIcon: 'gemini',
    provider: 'Google',
    updatedAt: Date.now() - 1000 * 60 * 3, // 3m ago
    createdAt: Date.now() - 1000 * 60 * 60,
    preview: 'Converted settled rows to compact cards with expandable hover previews.',
    fileRefs: ['Sidebar.tsx', 'globals.css'],
    messageCount: 12
  },
  {
    id: 'session-2',
    title: 'OpenCode Daemon Integration',
    modelId: 'claude-3-7-sonnet',
    modelName: 'Claude 3.7 Sonnet',
    modelIcon: 'claude',
    provider: 'Anthropic',
    updatedAt: Date.now() - 1000 * 60 * 25, // 25m ago
    createdAt: Date.now() - 1000 * 60 * 90,
    preview: 'Implemented persistent WebSocket RPC streaming for background agent executions.',
    fileRefs: ['opencode.ts', 'client.ts'],
    messageCount: 18
  },
  {
    id: 'session-3',
    title: 'Dynamic Wallpaper Theme Extraction',
    modelId: 'gpt-4o',
    modelName: 'GPT-4o',
    modelIcon: 'openai',
    provider: 'OpenAI',
    updatedAt: Date.now() - 1000 * 60 * 60 * 2, // 2h ago
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
    preview: 'Material Dynamic Colors extraction from desktop wallpaper with smooth fallback.',
    fileRefs: ['theme.ts', 'theme.css'],
    messageCount: 8
  },
  {
    id: 'session-4',
    title: 'Bracket Pair Colorizer & CodeMirror 6',
    modelId: 'claude-3-7-sonnet',
    modelName: 'Claude 3.7 Sonnet',
    modelIcon: 'claude',
    provider: 'Anthropic',
    updatedAt: Date.now() - 1000 * 60 * 60 * 8, // 8h ago
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    preview: 'Bracket & tag pair matching, wallpaper syntax theme, and macos autosave fix.',
    fileRefs: ['Editor.tsx', 'bracketMatching.ts'],
    messageCount: 14
  },
  {
    id: 'session-5',
    title: 'Vite 8 & Tailwind v4 Migration',
    modelId: 'deepseek-r1',
    modelName: 'DeepSeek R1',
    modelIcon: 'deepseek',
    provider: 'DeepSeek',
    updatedAt: Date.now() - 1000 * 60 * 60 * 18, // 18h ago
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    preview: 'Configured Vite 8, Tailwind v4 @theme variables, and Oxlint rules.',
    fileRefs: ['electron.vite.config.ts', 'package.json'],
    messageCount: 7
  },
  // Settled Sessions (index >= 5)
  {
    id: 'session-6',
    title: 'LSP Diagnostics & Language Server Protocol',
    modelId: 'gemini-2.5-pro',
    modelName: 'Gemini 2.5 Pro',
    modelIcon: 'gemini',
    provider: 'Google',
    updatedAt: Date.now() - 1000 * 60 * 60 * 28, // 1d ago
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    preview: 'Connected rust-analyzer and vtsls over stdio IPC with debounced diagnostics.',
    fileRefs: ['lsp.ts', 'diagnostics.ts'],
    messageCount: 29
  },
  {
    id: 'session-7',
    title: 'Native Keybindings & Command Palette',
    modelId: 'gpt-4o',
    modelName: 'GPT-4o',
    modelIcon: 'openai',
    provider: 'OpenAI',
    updatedAt: Date.now() - 1000 * 60 * 60 * 52, // 2d ago
    createdAt: Date.now() - 1000 * 60 * 60 * 72,
    preview: 'Centralized keybinding registry with chord support and platform normalizer.',
    fileRefs: ['shortcuts.ts', 'CommandPalette.tsx'],
    messageCount: 11
  },
  {
    id: 'session-8',
    title: 'Multi-Tab Editor & Split Panes',
    modelId: 'claude-3-7-sonnet',
    modelName: 'Claude 3.7 Sonnet',
    modelIcon: 'claude',
    provider: 'Anthropic',
    updatedAt: Date.now() - 1000 * 60 * 60 * 80, // 3d ago
    createdAt: Date.now() - 1000 * 60 * 60 * 96,
    preview: 'Mosaic layout engine with persistent tab groups and dragged tile docking.',
    fileRefs: ['Tabs.tsx', 'SplitPane.tsx'],
    messageCount: 22
  }
]

export const [chatSessions, setChatSessions] =
  createSignal<ChatSessionSummary[]>(initialChatSessions)

export const initialFiles: FileNode[] = [
  { name: 'journals', is_dir: true, last_modified: Date.now() - 1000 * 60 * 60 * 4 },
  { name: 'archive', is_dir: true, last_modified: Date.now() - 1000 * 60 * 60 * 24 },
  { name: 'Welcome.md', is_dir: false, last_modified: Date.now() - 1000 * 60 * 30 },
  {
    name: 'Architecture Overview.md',
    is_dir: false,
    last_modified: Date.now() - 1000 * 60 * 60 * 2
  },
  { name: 'Design Decisions.md', is_dir: false, last_modified: Date.now() - 1000 * 60 * 60 * 6 },
  { name: 'Oxlint Guidelines.md', is_dir: false, last_modified: Date.now() - 1000 * 60 * 60 * 12 },
  {
    name: 'Roadmap & Milestones.md',
    is_dir: false,
    last_modified: Date.now() - 1000 * 60 * 60 * 24
  },
  { name: 'Quick Notes.md', is_dir: false, last_modified: Date.now() - 1000 * 60 * 60 * 36 },
  { name: 'Ideas & Sketches.md', is_dir: false, last_modified: Date.now() - 1000 * 60 * 60 * 48 }
]

// ── Sidebar Search Focus Request ──────────────────────────────────────────────
export const [sidebarSearchFocus, setSidebarSearchFocus] = createSignal(0)
export const requestSidebarSearchFocus = (): void => {
  setSidebarSearchFocus((n) => n + 1)
}
