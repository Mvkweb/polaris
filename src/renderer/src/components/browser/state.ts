import { batch, createSignal } from 'solid-js'
import { currentView, setCurrentView } from '../../viewState'

export const [workspaceRoot, setWorkspaceRoot] = createSignal<string>('')

export const [navHistory, setNavHistory] = createSignal<string[]>([])
export const [historyIndex, setHistoryIndex] = createSignal<number>(-1)
export const [selectedGridEntry, setSelectedGridEntry] = createSignal<string | null>(null)
/** Ask the folder view to select (and scroll to) this path once it's listed. */
export const [revealRequest, setRevealRequest] = createSignal<string | null>(null)
export const [browserSearchFilter, setBrowserSearchFilter] = createSignal<string>('')
export const [browserFilterFocused, setBrowserFilterFocused] = createSignal(false)
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

/** Keep the active folder pill's path/name in step with navigation. */
export const syncActiveBrowserTab = (path: string): void => {
  const activeId = activeTabId()
  const name = path.split(/[/\\]/).filter(Boolean).pop() || '/'
  setBrowserTabs((prev) => prev.map((tab) => (tab.id === activeId ? { ...tab, path, name } : tab)))
}

// ── Split View State ──────────────────────────────────────────────────────
export type PaneId = 'left' | 'right'

export const [isSplitViewOpen, setIsSplitViewOpen] = createSignal(false)
export const [activePane, setActivePaneSignal] = createSignal<PaneId>('left')

// Left pane signals
export const [leftWorkspaceRoot, setLeftWorkspaceRoot] = createSignal<string>('')
export const [leftNavHistory, setLeftNavHistory] = createSignal<string[]>([])
export const [leftHistoryIndex, setLeftHistoryIndex] = createSignal<number>(-1)
export const [leftSelectedGridEntry, setLeftSelectedGridEntry] = createSignal<string | null>(null)
export const [leftBrowserSearchFilter, setLeftBrowserSearchFilter] = createSignal<string>('')

// Right pane signals
export const [rightWorkspaceRoot, setRightWorkspaceRoot] = createSignal<string>('')
export const [rightNavHistory, setRightNavHistory] = createSignal<string[]>([])
export const [rightHistoryIndex, setRightHistoryIndex] = createSignal<number>(-1)
export const [rightSelectedGridEntry, setRightSelectedGridEntry] = createSignal<string | null>(null)
export const [rightRevealRequest, setRightRevealRequest] = createSignal<string | null>(null)
export const [rightBrowserSearchFilter, setRightBrowserSearchFilter] = createSignal<string>('')

const readSavedSplit = (): number => {
  try {
    const v = localStorage.getItem('polaris.splitView.ratio')
    if (v) {
      const n = parseFloat(v)
      if (!Number.isNaN(n) && n >= 0.2 && n <= 0.8) return n
    }
  } catch {}
  return 0.5
}

export const [splitRatio, setSplitRatio] = createSignal(readSavedSplit())
export const persistSplitRatio = (ratio: number): void => {
  const clamped = Math.max(0.2, Math.min(0.8, ratio))
  setSplitRatio(clamped)
  try {
    localStorage.setItem('polaris.splitView.ratio', String(clamped))
  } catch {}
}

export const setActivePane = (pane: PaneId): void => {
  if (activePane() === pane) return
  batch(() => {
    setActivePaneSignal(pane)
    if (pane === 'right') {
      const rRoot = rightWorkspaceRoot()
      if (rRoot) {
        setWorkspaceRoot(rRoot)
        syncActiveBrowserTab(rRoot)
      }
      setSelectedGridEntry(rightSelectedGridEntry())
      setBrowserSearchFilter(rightBrowserSearchFilter())
    } else {
      const lRoot = leftWorkspaceRoot()
      if (lRoot) {
        setWorkspaceRoot(lRoot)
        syncActiveBrowserTab(lRoot)
      }
      setSelectedGridEntry(leftSelectedGridEntry())
      setBrowserSearchFilter(leftBrowserSearchFilter())
    }
  })
}

export const navigateToLeft = (newPath: string): void => {
  if (!newPath) return
  revealFiles()
  batch(() => {
    const history = leftNavHistory()
    const idx = leftHistoryIndex()
    if (idx < 0 || history[idx] !== newPath) {
      const updated = [...history.slice(0, idx + 1), newPath]
      setLeftNavHistory(updated)
      setLeftHistoryIndex(updated.length - 1)
    }
    setLeftWorkspaceRoot(newPath)
    setLeftSelectedGridEntry(null)
    if (activePane() === 'left') {
      setWorkspaceRoot(newPath)
      setSelectedGridEntry(null)
      syncActiveBrowserTab(newPath)
    }
  })
}

export const navigateBackLeft = (): void => {
  const idx = leftHistoryIndex()
  if (idx > 0) {
    const prevPath = leftNavHistory()[idx - 1]
    revealFiles()
    batch(() => {
      setLeftHistoryIndex(idx - 1)
      setLeftWorkspaceRoot(prevPath)
      setLeftSelectedGridEntry(null)
      if (activePane() === 'left') {
        setWorkspaceRoot(prevPath)
        setSelectedGridEntry(null)
        syncActiveBrowserTab(prevPath)
      }
    })
  }
}

export const navigateForwardLeft = (): void => {
  const history = leftNavHistory()
  const idx = leftHistoryIndex()
  if (idx >= 0 && idx < history.length - 1) {
    const nextPath = history[idx + 1]
    revealFiles()
    batch(() => {
      setLeftHistoryIndex(idx + 1)
      setLeftWorkspaceRoot(nextPath)
      setLeftSelectedGridEntry(null)
      if (activePane() === 'left') {
        setWorkspaceRoot(nextPath)
        setSelectedGridEntry(null)
        syncActiveBrowserTab(nextPath)
      }
    })
  }
}

export const canNavigateBackLeft = (): boolean => leftHistoryIndex() > 0
export const canNavigateForwardLeft = (): boolean => {
  const history = leftNavHistory()
  const idx = leftHistoryIndex()
  return idx >= 0 && idx < history.length - 1
}

export const navigateToRight = (newPath: string): void => {
  if (!newPath) return
  revealFiles()
  batch(() => {
    const history = rightNavHistory()
    const idx = rightHistoryIndex()
    if (idx < 0 || history[idx] !== newPath) {
      const updatedHistory = [...history.slice(0, idx + 1), newPath]
      setRightNavHistory(updatedHistory)
      setRightHistoryIndex(updatedHistory.length - 1)
    }
    setRightWorkspaceRoot(newPath)
    setRightSelectedGridEntry(null)
    if (activePane() === 'right') {
      setWorkspaceRoot(newPath)
      setSelectedGridEntry(null)
      syncActiveBrowserTab(newPath)
    }
  })
}

export const navigateBackRight = (): void => {
  const idx = rightHistoryIndex()
  if (idx > 0) {
    const prevPath = rightNavHistory()[idx - 1]
    revealFiles()
    batch(() => {
      setRightHistoryIndex(idx - 1)
      setRightWorkspaceRoot(prevPath)
      setRightSelectedGridEntry(null)
      if (activePane() === 'right') {
        setWorkspaceRoot(prevPath)
        setSelectedGridEntry(null)
        syncActiveBrowserTab(prevPath)
      }
    })
  }
}

export const navigateForwardRight = (): void => {
  const history = rightNavHistory()
  const idx = rightHistoryIndex()
  if (idx >= 0 && idx < history.length - 1) {
    const nextPath = history[idx + 1]
    revealFiles()
    batch(() => {
      setRightHistoryIndex(idx + 1)
      setRightWorkspaceRoot(nextPath)
      setRightSelectedGridEntry(null)
      if (activePane() === 'right') {
        setWorkspaceRoot(nextPath)
        setSelectedGridEntry(null)
        syncActiveBrowserTab(nextPath)
      }
    })
  }
}

export const canNavigateBackRight = (): boolean => rightHistoryIndex() > 0
export const canNavigateForwardRight = (): boolean => {
  const history = rightNavHistory()
  const idx = rightHistoryIndex()
  return idx >= 0 && idx < history.length - 1
}

export const openSplitView = (): void => {
  if (isSplitViewOpen()) return
  const currentRoot = workspaceRoot() || '.'
  revealFiles()
  batch(() => {
    setLeftWorkspaceRoot(currentRoot)
    const existingHistory = navHistory()
    const existingIdx = historyIndex()
    setLeftNavHistory(existingHistory.length > 0 ? [...existingHistory] : [currentRoot])
    setLeftHistoryIndex(existingIdx >= 0 ? existingIdx : 0)

    setRightWorkspaceRoot(currentRoot)
    setRightNavHistory([currentRoot])
    setRightHistoryIndex(0)
    setRightSelectedGridEntry(null)
    setRightBrowserSearchFilter('')

    setIsSplitViewOpen(true)
    setActivePaneSignal('left')
    syncActiveBrowserTab(currentRoot)
  })
}

export const closeSplitView = (): void => {
  if (!isSplitViewOpen()) return
  batch(() => {
    setIsSplitViewOpen(false)
    setActivePaneSignal('left')
    const lRoot = leftWorkspaceRoot() || workspaceRoot() || '.'
    setWorkspaceRoot(lRoot)
    setNavHistory([...leftNavHistory()])
    setHistoryIndex(leftHistoryIndex())
    syncActiveBrowserTab(lRoot)
  })
}

export const toggleSplitView = (): void => {
  if (isSplitViewOpen()) {
    closeSplitView()
  } else {
    openSplitView()
  }
}

export const openTabInBackground = (path: string): void => {
  const name = path.split(/[/\\]/).filter(Boolean).pop() || '/'
  setBrowserTabs((prev) => [...prev, { id: `tab-${Date.now()}`, path, name }])
}

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

export const [pathEditing, setPathEditing] = createSignal(false)
export const startPathEdit = (): void => {
  revealFiles()
  setPathEditing(true)
}

// Folder navigation returns to the browser without closing editor tabs.
export const revealFiles = (): void => {
  if (currentView() === 'editor') setCurrentView('files')
}

export const navigateTo = (newPath: string): void => {
  if (!newPath) return
  if (isSplitViewOpen()) {
    if (activePane() === 'right') {
      navigateToRight(newPath)
    } else {
      navigateToLeft(newPath)
    }
    return
  }
  const current = workspaceRoot()
  revealFiles()

  batch(() => {
    syncActiveBrowserTab(newPath)

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
  if (isSplitViewOpen()) {
    if (activePane() === 'right') {
      navigateBackRight()
    } else {
      navigateBackLeft()
    }
    return
  }
  const idx = historyIndex()
  if (idx > 0) {
    const prevPath = navHistory()[idx - 1]
    revealFiles()
    batch(() => {
      setHistoryIndex(idx - 1)
      syncActiveBrowserTab(prevPath)
      setWorkspaceRoot(prevPath)
      setSelectedGridEntry(null)
    })
  }
}

export const navigateForward = (): void => {
  if (isSplitViewOpen()) {
    if (activePane() === 'right') {
      navigateForwardRight()
    } else {
      navigateForwardLeft()
    }
    return
  }
  const history = navHistory()
  const idx = historyIndex()
  if (idx < history.length - 1) {
    const nextPath = history[idx + 1]
    revealFiles()
    batch(() => {
      setHistoryIndex(idx + 1)
      syncActiveBrowserTab(nextPath)
      setWorkspaceRoot(nextPath)
      setSelectedGridEntry(null)
    })
  }
}

export const canNavigateBack = (): boolean => {
  if (isSplitViewOpen()) {
    return activePane() === 'right' ? canNavigateBackRight() : canNavigateBackLeft()
  }
  return historyIndex() > 0
}

export const canNavigateForward = (): boolean => {
  if (isSplitViewOpen()) {
    return activePane() === 'right' ? canNavigateForwardRight() : canNavigateForwardLeft()
  }
  const history = navHistory()
  const idx = historyIndex()
  return idx >= 0 && idx < history.length - 1
}
