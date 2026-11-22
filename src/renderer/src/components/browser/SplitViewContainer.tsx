import { Component, createSignal, Show } from 'solid-js'
import FolderView from './FolderView'
import PaneHeader from './PaneHeader'
import {
  isSplitViewOpen,
  activePane,
  setActivePane,
  splitRatio,
  persistSplitRatio,
  closeSplitView,
  workspaceRoot,
  navigateTo,
  navigateBack,
  navigateForward,
  canNavigateBack,
  canNavigateForward,
  navHistory,
  historyIndex,
  rightWorkspaceRoot,
  navigateToRight,
  navigateBackRight,
  navigateForwardRight,
  canNavigateBackRight,
  canNavigateForwardRight,
  rightSelectedGridEntry,
  setRightSelectedGridEntry,
  rightRevealRequest,
  setRightRevealRequest,
  rightBrowserSearchFilter,
  leftSelectedGridEntry,
  setLeftSelectedGridEntry,
  leftBrowserSearchFilter
} from '../../store'

export const SplitViewContainer: Component = () => {
  const [isDragging, setIsDragging] = createSignal(false)

  const startDividerDrag = (e: PointerEvent): void => {
    e.preventDefault()
    setIsDragging(true)
    const container = (e.currentTarget as HTMLElement).parentElement
    if (!container) return
    const rect = container.getBoundingClientRect()
    const totalWidth = rect.width

    const onMove = (ev: PointerEvent): void => {
      const relX = ev.clientX - rect.left
      const ratio = relX / totalWidth
      persistSplitRatio(ratio)
    }

    const onUp = (): void => {
      setIsDragging(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const leftCurrentPath = () => {
    if (activePane() === 'left') return workspaceRoot() || '.'
    const history = navHistory()
    const idx = historyIndex()
    return (idx >= 0 && idx < history.length ? history[idx] : workspaceRoot()) || '.'
  }

  return (
    <Show
      when={isSplitViewOpen()}
      fallback={
        <div class="view-swap flex-1 min-h-0 min-w-0 flex flex-col">
          <FolderView />
        </div>
      }
    >
      <div class="flex-1 min-h-0 min-w-0 flex flex-row relative select-none">
        {/* Left Pane */}
        <div
          class="min-h-0 min-w-0 flex flex-col relative overflow-hidden transition-[box-shadow] duration-150"
          style={{
            width: `${splitRatio() * 100}%`,
            'box-shadow':
              activePane() === 'left'
                ? 'inset 0 0 0 1px color-mix(in oklab, var(--accent, #4da3f5) 28%, transparent)'
                : 'none'
          }}
          onPointerDown={() => setActivePane('left')}
        >
          <PaneHeader
            paneId="left"
            path={leftCurrentPath}
            isActive={() => activePane() === 'left'}
            canGoBack={canNavigateBack}
            canGoForward={canNavigateForward}
            onNavigateBack={navigateBack}
            onNavigateForward={navigateForward}
            onNavigateTo={(p) => navigateTo(p)}
            onActivate={() => setActivePane('left')}
          />
          <FolderView
            paneId="left"
            root={leftCurrentPath}
            navigateTo={(p) => navigateTo(p)}
            navigateBack={navigateBack}
            selectedEntry={leftSelectedGridEntry}
            setSelectedEntry={setLeftSelectedGridEntry}
            searchFilter={leftBrowserSearchFilter}
            isActive={() => activePane() === 'left'}
            onActivate={() => setActivePane('left')}
          />
        </div>

        {/* Resizable Divider */}
        <div
          class="shrink-0 w-2 flex items-center justify-center cursor-col-resize z-20 group relative -mx-1"
          onPointerDown={startDividerDrag}
          title="Drag to resize panes"
        >
          <div
            class="w-[1px] h-full transition-colors duration-100"
            classList={{
              'bg-white/[0.07] group-hover:bg-[var(--accent,#4da3f5)]/50': !isDragging(),
              'bg-[var(--accent,#4da3f5)]': isDragging()
            }}
          />
        </div>

        {/* Right Pane */}
        <div
          class="min-h-0 min-w-0 flex flex-col relative overflow-hidden transition-[box-shadow] duration-150"
          style={{
            width: `${(1 - splitRatio()) * 100}%`,
            'box-shadow':
              activePane() === 'right'
                ? 'inset 0 0 0 1px color-mix(in oklab, var(--accent, #4da3f5) 28%, transparent)'
                : 'none'
          }}
          onPointerDown={() => setActivePane('right')}
        >
          <PaneHeader
            paneId="right"
            path={() => rightWorkspaceRoot() || '.'}
            isActive={() => activePane() === 'right'}
            canGoBack={canNavigateBackRight}
            canGoForward={canNavigateForwardRight}
            onNavigateBack={navigateBackRight}
            onNavigateForward={navigateForwardRight}
            onNavigateTo={(p) => navigateToRight(p)}
            onActivate={() => setActivePane('right')}
            showClose={true}
            onClose={closeSplitView}
          />
          <FolderView
            paneId="right"
            root={rightWorkspaceRoot}
            navigateTo={navigateToRight}
            navigateBack={navigateBackRight}
            selectedEntry={rightSelectedGridEntry}
            setSelectedEntry={setRightSelectedGridEntry}
            revealRequest={rightRevealRequest}
            setRevealRequest={setRightRevealRequest}
            searchFilter={rightBrowserSearchFilter}
            isActive={() => activePane() === 'right'}
            onActivate={() => setActivePane('right')}
          />
        </div>
      </div>
    </Show>
  )
}

export default SplitViewContainer
