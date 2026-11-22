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
  workspaceRoot,
  navigateTo,
  navigateBack,
  navHistory,
  historyIndex,
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
      // Only write to localStorage ONCE on release:
      persistSplitRatio(latestRatio)
    }

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
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
      <div class="flex-1 min-h-0 min-w-0 flex flex-row p-2 gap-2 relative select-none">
        {/* Left Pane Card */}
        <div
          class="min-h-0 min-w-0 flex-1 flex flex-col relative overflow-hidden rounded-[14px] bg-[#0c0c0c]/90"
          style={{
            flex: `${splitRatio()}`,
            transition: isDragging() ? 'none' : 'border-color 150ms, box-shadow 150ms, opacity 150ms'
          }}
          classList={{
            'border border-[var(--accent,#4da3f5)]/50 ring-1 ring-[var(--accent,#4da3f5)]/20 shadow-[0_4px_24px_rgba(0,0,0,0.6)]':
              activePane() === 'left',
            'border border-white/[0.06] opacity-75 hover:opacity-90': activePane() !== 'left'
          }}
          onPointerDown={() => setActivePane('left')}
        >
          <PaneHeader
            paneId="left"
            path={leftCurrentPath}
            isActive={() => activePane() === 'left'}
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

        {/* Resizable Divider Handle */}
        <div
          class="shrink-0 w-2.5 flex items-center justify-center cursor-col-resize z-20 group relative -mx-1 select-none"
          onPointerDown={startDividerDrag}
          title="Drag to resize panes"
        >
          <div
            class="w-1 h-8 rounded-full transition-colors duration-100"
            classList={{
              'bg-white/15 group-hover:bg-[var(--accent,#4da3f5)]/60': !isDragging(),
              'bg-[var(--accent,#4da3f5)] shadow-[0_0_8px_var(--accent,#4da3f5)]': isDragging()
            }}
          />
        </div>

        {/* Right Pane Card */}
        <div
          class="min-h-0 min-w-0 flex-1 flex flex-col relative overflow-hidden rounded-[14px] bg-[#0c0c0c]/90"
          style={{
            flex: `${1 - splitRatio()}`,
            transition: isDragging() ? 'none' : 'border-color 150ms, box-shadow 150ms, opacity 150ms'
          }}
          classList={{
            'border border-[var(--accent,#4da3f5)]/50 ring-1 ring-[var(--accent,#4da3f5)]/20 shadow-[0_4px_24px_rgba(0,0,0,0.6)]':
              activePane() === 'right',
            'border border-white/[0.06] opacity-75 hover:opacity-90': activePane() !== 'right'
          }}
          onPointerDown={() => setActivePane('right')}
        >
          <PaneHeader
            paneId="right"
            path={() => rightWorkspaceRoot() || '.'}
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
