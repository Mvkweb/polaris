import { Component, createSignal, Show } from 'solid-js'
import FolderView from './FolderView'
import PaneHeader from './PaneHeader'
import {
  isSplitViewOpen,
  activePane,
  setActivePane,
  splitRatio,
  setSplitRatio,
  persistSplitRatio,
  closeSplitView,
  leftWorkspaceRoot,
  navigateToLeft,
  navigateBackLeft,
  rightWorkspaceRoot,
  navigateToRight,
  navigateBackRight,
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
    const handle = e.currentTarget as HTMLElement
    try {
      handle.setPointerCapture(e.pointerId)
    } catch {}
    setIsDragging(true)

    const container = handle.parentElement
    if (!container) return
    const rect = container.getBoundingClientRect()
    const totalWidth = rect.width
    let latestRatio = splitRatio()
    let rafId = 0

    const onMove = (ev: PointerEvent): void => {
      const relX = ev.clientX - rect.left
      const rawRatio = relX / totalWidth
      latestRatio = Math.max(0.2, Math.min(0.8, rawRatio))

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0
          setSplitRatio(latestRatio)
        })
      }
    }

    const onUp = (ev: PointerEvent): void => {
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
      setIsDragging(false)
      try {
        handle.releasePointerCapture(ev.pointerId)
      } catch {}
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      persistSplitRatio(latestRatio)
    }

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
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
      <div class="flex-1 min-h-0 min-w-0 flex flex-row relative select-none overflow-hidden">
        {/* Left Pane */}
        <div
          class="min-h-0 min-w-0 flex-1 flex flex-col relative overflow-hidden transition-colors duration-150"
          style={{
            flex: `${splitRatio()}`
          }}
          classList={{
            'bg-black/20': activePane() === 'left',
            'bg-transparent': activePane() !== 'left'
          }}
          onPointerDown={() => setActivePane('left')}
        >
          <PaneHeader
            paneId="left"
            path={leftWorkspaceRoot}
            isActive={() => activePane() === 'left'}
            onNavigateTo={(p) => navigateToLeft(p)}
            onActivate={() => setActivePane('left')}
          />
          <FolderView
            paneId="left"
            root={leftWorkspaceRoot}
            navigateTo={(p) => navigateToLeft(p)}
            navigateBack={navigateBackLeft}
            selectedEntry={leftSelectedGridEntry}
            setSelectedEntry={setLeftSelectedGridEntry}
            searchFilter={leftBrowserSearchFilter}
            isActive={() => activePane() === 'left'}
            onActivate={() => setActivePane('left')}
          />
        </div>

        {/* Resizable Divider Handle */}
        <div
          class="shrink-0 w-1 relative z-20 flex items-center justify-center cursor-col-resize select-none group"
          onPointerDown={startDividerDrag}
          title="Drag to resize panes"
        >
          <div class="absolute inset-y-0 -left-1.5 -right-1.5 cursor-col-resize" />
          <div
            class="w-px h-full transition-colors duration-150"
            classList={{
              'bg-white/[0.06] group-hover:bg-[var(--accent,#4da3f5)]/60': !isDragging(),
              'bg-[var(--accent,#4da3f5)]': isDragging()
            }}
          />
        </div>

        {/* Right Pane */}
        <div
          class="min-h-0 min-w-0 flex-1 flex flex-col relative overflow-hidden transition-colors duration-150"
          style={{
            flex: `${1 - splitRatio()}`
          }}
          classList={{
            'bg-black/20': activePane() === 'right',
            'bg-transparent': activePane() !== 'right'
          }}
          onPointerDown={() => setActivePane('right')}
        >
          <PaneHeader
            paneId="right"
            path={rightWorkspaceRoot}
            isActive={() => activePane() === 'right'}
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
