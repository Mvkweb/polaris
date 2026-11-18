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
  const current = workspaceRoot()
  revealFiles()

  batch(() => {
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

/** Keep the active folder pill's path/name in step with history moves. */
const syncActiveBrowserTab = (path: string): void => {
  const activeId = activeTabId()
  const name = path.split(/[/\\]/).filter(Boolean).pop() || '/'
  setBrowserTabs((prev) => prev.map((tab) => (tab.id === activeId ? { ...tab, path, name } : tab)))
}

export const navigateBack = (): void => {
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

export const canNavigateBack = (): boolean => historyIndex() > 0
export const canNavigateForward = (): boolean => {
  const history = navHistory()
  const idx = historyIndex()
  return idx >= 0 && idx < history.length - 1
}
