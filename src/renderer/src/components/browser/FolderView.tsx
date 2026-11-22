import {
  Component,
  createSignal,
  createEffect,
  createMemo,
  For,
  Show,
  onMount,
  onCleanup,
  batch
} from 'solid-js'
import {
  workspaceRoot,
  navigateTo,
  navigateBack,
  selectedGridEntry,
  setSelectedGridEntry,
  revealRequest,
  openTabInBackground,
  setRevealRequest,
  explorerRefreshTrigger,
  browserSearchFilter,
  showHiddenFiles,
  sortField,
  sortDescending,
  foldersFirst,
  gridIconSize,
  gridLabelSize,
  showThumbnails,
  openContextMenu,
  openPropertiesModal,
  openTrashModal,
  isTrashPath
} from '../../store'
import { openBrowserFile } from '../../openWith'
import { MonodriveFolderIcon, MonodriveFileIcon, ImageThumbnail } from './MonodriveIcons'
import { LinkBadge } from '../ui/LinkBadge'
import { setBrokenLink } from '../../links'
import type { FsEntry, SystemDrive } from '../../types'
import emberLogo from '../../assets/ember-logo.svg'

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'ico'])

interface MarqueeRect {
  left: number
  top: number
  width: number
  height: number
}

interface MarqueeItem {
  path: string
  rect: DOMRect
}

interface MarqueeDrag {
  pointerId: number
  startX: number
  startY: number
  additive: boolean
  base: Set<string>
  items: MarqueeItem[]
  bounds: { left: number; top: number; right: number; bottom: number }
  activated: boolean
}

const samePathSet = (a: Set<string>, b: Set<string>): boolean => {
  if (a.size !== b.size) return false
  for (const path of a) {
    if (!b.has(path)) return false
  }
  return true
}

export const FolderView: Component = () => {
  const [entries, setEntries] = createSignal<FsEntry[]>([])
  const [isLoading, setIsLoading] = createSignal(false)
  const [drives, setDrives] = createSignal<SystemDrive[]>([])

  // Multi-selection for marquee drags. The store's selectedGridEntry stays as the
  // primary (keyboard/properties) selection and mirrors the last marquee hit.
  const initialPrimary = selectedGridEntry()
  const [selectedPaths, setSelectedPaths] = createSignal<Set<string>>(
    initialPrimary ? new Set<string>([initialPrimary]) : new Set<string>()
  )
  const [marqueeRect, setMarqueeRect] = createSignal<MarqueeRect | null>(null)
  const [marqueeActive, setMarqueeActive] = createSignal(false)

  onMount(async () => {
    try {
      if (window.api?.getSystemDrives) {
        const result = await window.api.getSystemDrives()
        if (result && result.length > 0) {
          setDrives(result)
        }
      }
    } catch (err) {
      console.warn('Failed to fetch system drives for FolderView:', err)
    }
  })

  // Reusable fast collator for natural case-insensitive filename sorting
  const nameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

  // Load directory entries reactively with zero-flicker debounced state and race protection
  let currentRequestId = 0

  createEffect(() => {
    const root = workspaceRoot()
    explorerRefreshTrigger()
    if (!root) return

    const reqId = ++currentRequestId

    // Debounce loading indicator: instant reads (<60ms) never flicker or flash
    const timer = setTimeout(() => {
      if (reqId === currentRequestId) {
        setIsLoading(true)
      }
    }, 60)

    if (window.api?.readDirectory) {
      window.api
        .readDirectory(root)
        .then((result) => {
          if (reqId === currentRequestId) {
            clearTimeout(timer)
            batch(() => {
              setEntries(result || [])
              setIsLoading(false)
            })
          }
        })
        .catch((err) => {
          if (reqId === currentRequestId) {
            clearTimeout(timer)
            batch(() => {
              console.error('Failed to read directory in FolderView:', err)
              setEntries([])
              setIsLoading(false)
            })
          }
        })
    }
  })

  const filteredEntries = createMemo(() => {
    const q = browserSearchFilter().trim().toLowerCase()
    const hidden = showHiddenFiles()
    let list = entries()

    if (!hidden) {
      list = list.filter((item) => !item.name.startsWith('.'))
    }

    if (q) {
      list = list.filter((item) => item.name.toLowerCase().includes(q))
    }

    const field = sortField()
    const desc = sortDescending()
    const ff = foldersFirst()

    return [...list].sort((a, b) => {
      if (ff) {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
      }

      let cmp = 0
      if (field === 'name') {
        cmp = nameCollator.compare(a.name, b.name)
      } else if (field === 'modified') {
        cmp = (a.modifiedTime || 0) - (b.modifiedTime || 0)
      } else if (field === 'size') {
        cmp = (a.size || 0) - (b.size || 0)
      } else if (field === 'kind') {
        const extA = (a.extension || '').toLowerCase()
        const extB = (b.extension || '').toLowerCase()
        cmp = extA.localeCompare(extB) || nameCollator.compare(a.name, b.name)
      }

      return desc ? -cmp : cmp
    })
  })

  // A typed/pasted file path asks to be revealed: select + scroll to it as soon
  // as it shows up in the listing (it may still be loading after navigation).
  createEffect(() => {
    const want = revealRequest()
    if (!want || !filteredEntries().some((e) => e.path === want)) return
    batch(() => {
      setSelectedPaths(new Set([want]))
      setSelectedGridEntry(want)
      setRevealRequest(null)
    })
    requestAnimationFrame(() =>
      document
        .querySelector(`[data-grid-item][data-path="${CSS.escape(want)}"]`)
        ?.scrollIntoView({ block: 'nearest' })
    )
  })

  // Keep multi-selection limited to entries that still exist in the current view
  createEffect(() => {
    const visible = new Set(filteredEntries().map((entry) => entry.path))
    const current = selectedPaths()
    const next = new Set<string>()
    let changed = false

    for (const path of current) {
      if (visible.has(path)) next.add(path)
      else changed = true
    }

    if (!changed) return

    setSelectedPaths(next)
    const primary = selectedGridEntry()
    if (primary && !next.has(primary)) {
      setSelectedGridEntry(next.size ? Array.from(next)[next.size - 1] : null)
    }
  })

  const currentPath = () => workspaceRoot() || '.'

  // Volume free space lookup
  const currentDrive = createMemo(() => {
    const list = drives().filter((d) => d.isMounted !== false && Boolean(d.mountPoint))
    if (!list.length) return undefined
    const path = currentPath()
    return (
      [...list]
        .sort((a, b) => b.mountPoint.length - a.mountPoint.length)
        .find(
          (d) =>
            path === d.mountPoint ||
            path.startsWith(d.mountPoint === '/' ? '/' : `${d.mountPoint}/`)
        ) || list[0]
    )
  })

  const volumeStatus = createMemo(() => {
    const drive = currentDrive()
    if (!drive) return ''
    return drive.isReadOnly ? `${drive.size} read-only` : drive.freeSpace
  })

  const selectOnly = (path: string | null): void => {
    batch(() => {
      setSelectedPaths(path ? new Set<string>([path]) : new Set<string>())
      setSelectedGridEntry(path)
    })
  }

  const handleItemClick = (entry: FsEntry, e: MouseEvent): void => {
    if (suppressClick) {
      suppressClick = false
      return
    }

    if (e.ctrlKey || e.metaKey) {
      const next = new Set(selectedPaths())
      const willSelect = !next.has(entry.path)
      if (willSelect) next.add(entry.path)
      else next.delete(entry.path)

      batch(() => {
        setSelectedPaths(next)
        setSelectedGridEntry(
          willSelect ? entry.path : next.size ? Array.from(next)[next.size - 1] : null
        )
      })
      return
    }

    selectOnly(entry.path)
  }

  const handleItemDoubleClick = async (entry: FsEntry): Promise<void> => {
    if (entry.isBrokenLink) {
      setBrokenLink({ path: entry.path, name: entry.name, target: entry.linkTarget ?? '' })
      return
    }
    if (entry.isDirectory) {
      navigateTo(entry.path)
    } else {
      await openBrowserFile(entry.path, entry.name)
    }
  }

  // ── Marquee drag selection ─────────────────────────────────────────────────
  // Geometry is applied once per animation frame and hit-tests use rects cached at
  // drag start, so the band tracks the cursor without forcing layout on every move.
  let dragState: MarqueeDrag | null = null
  let marqueeFrame = 0
  let fadeTimer: ReturnType<typeof setTimeout> | undefined
  let suppressClick = false
  const pointer = { x: 0, y: 0 }
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const clearFadeTimer = (): void => {
    if (fadeTimer) {
      clearTimeout(fadeTimer)
      fadeTimer = undefined
    }
  }

  const updateMarquee = (): void => {
    if (!dragState) return

    const { startX, startY, additive, base, items, bounds } = dragState
    const x1 = Math.min(startX, pointer.x)
    const y1 = Math.min(startY, pointer.y)
    const x2 = Math.max(startX, pointer.x)
    const y2 = Math.max(startY, pointer.y)

    // Clip the visual band to the grid viewport; hit-testing still uses the full rect.
    const left = Math.max(x1, bounds.left)
    const top = Math.max(y1, bounds.top)
    const right = Math.min(x2, bounds.right)
    const bottom = Math.min(y2, bounds.bottom)

    setMarqueeRect({
      left,
      top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top)
    })
    setMarqueeActive(true)

    const next = additive ? new Set(base) : new Set<string>()
    for (const item of items) {
      const r = item.rect
      if (r.left < x2 && r.right > x1 && r.top < y2 && r.bottom > y1) {
        next.add(item.path)
      }
    }

    if (!samePathSet(next, selectedPaths())) {
      batch(() => {
        setSelectedPaths(next)
        setSelectedGridEntry(next.size ? Array.from(next)[next.size - 1] : null)
      })
    }
  }

  const handlePointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 || e.pointerType === 'touch') return

    suppressClick = false
    const target = e.target as HTMLElement
    if (target.closest('[data-grid-item="true"]')) return
    if (target.closest('button, a, input, textarea, select')) return

    const main = e.currentTarget as HTMLElement
    const viewport = main.getBoundingClientRect()
    const items = Array.from(main.querySelectorAll<HTMLElement>('[data-grid-item="true"]'))
      .map((el) => ({ path: el.dataset.path || '', rect: el.getBoundingClientRect() }))
      .filter(
        (item) =>
          item.path !== '' && item.rect.bottom > viewport.top && item.rect.top < viewport.bottom
      )

    if (items.length === 0) return

    clearFadeTimer()
    setMarqueeActive(false)
    setMarqueeRect(null)

    dragState = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      additive: e.shiftKey || e.ctrlKey || e.metaKey,
      base: new Set(selectedPaths()),
      items,
      bounds: {
        left: viewport.left,
        top: viewport.top,
        right: viewport.right,
        bottom: viewport.bottom
      },
      activated: false
    }
    pointer.x = e.clientX
    pointer.y = e.clientY
    main.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: PointerEvent): void => {
    if (!dragState || e.pointerId !== dragState.pointerId) return

    pointer.x = e.clientX
    pointer.y = e.clientY

    if (!dragState.activated) {
      const dx = e.clientX - dragState.startX
      const dy = e.clientY - dragState.startY
      if (dx * dx + dy * dy < 9) return

      dragState.activated = true
      if (!dragState.additive) {
        batch(() => {
          setSelectedPaths(new Set<string>())
          setSelectedGridEntry(null)
        })
      }
    }

    if (marqueeFrame) return
    marqueeFrame = requestAnimationFrame(() => {
      marqueeFrame = 0
      updateMarquee()
    })
  }

  const handlePointerUp = (e: PointerEvent): void => {
    if (!dragState || e.pointerId !== dragState.pointerId) return

    const main = e.currentTarget as HTMLElement
    const wasActive = dragState.activated

    if (marqueeFrame) {
      cancelAnimationFrame(marqueeFrame)
      marqueeFrame = 0
    }

    if (wasActive) {
      pointer.x = e.clientX
      pointer.y = e.clientY
      updateMarquee()
      suppressClick = true
      setMarqueeActive(false)
      clearFadeTimer()
      fadeTimer = setTimeout(() => {
        setMarqueeRect(null)
        fadeTimer = undefined
      }, 120)
    } else {
      setMarqueeRect(null)
    }

    dragState = null
    if (main.hasPointerCapture(e.pointerId)) {
      main.releasePointerCapture(e.pointerId)
    }
  }

  const handlePointerCancel = (e: PointerEvent): void => {
    if (!dragState || e.pointerId !== dragState.pointerId) return

    dragState = null
    suppressClick = false
    if (marqueeFrame) {
      cancelAnimationFrame(marqueeFrame)
      marqueeFrame = 0
    }
    setMarqueeActive(false)
    clearFadeTimer()
    fadeTimer = setTimeout(() => {
      setMarqueeRect(null)
      fadeTimer = undefined
    }, 120)
  }

  const cancelDrag = (): void => {
    if (!dragState) return
    dragState = null
    suppressClick = false
    if (marqueeFrame) {
      cancelAnimationFrame(marqueeFrame)
      marqueeFrame = 0
    }
    setMarqueeActive(false)
    setMarqueeRect(null)
    clearFadeTimer()
  }

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement) return

    if (e.key === 'Escape' && dragState) {
      cancelDrag()
      return
    }

    const items = filteredEntries()
    if (items.length === 0) return

    const selected = selectedGridEntry()
    const currentIndex = items.findIndex((item) => item.path === selected)

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
      selectOnly(items[nextIndex].path)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
      selectOnly(items[prevIndex].path)
    } else if (e.key === 'Enter') {
      if (e.altKey) {
        e.preventDefault()
        const target = currentIndex >= 0 ? items[currentIndex].path : currentPath()
        if (target) openPropertiesModal(target)
      } else if (currentIndex >= 0) {
        e.preventDefault()
        handleItemDoubleClick(items[currentIndex])
      }
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      navigateBack()
    } else if (e.key === 'Delete') {
      e.preventDefault()
      const selSet = selectedPaths()
      const primarySel = selectedGridEntry()
      const pathsToDelete =
        selSet.size > 0 ? Array.from(selSet) : primarySel ? [primarySel] : []
      if (pathsToDelete.length > 0) {
        const firstItem = items.find((i) => i.path === pathsToDelete[0])
        const firstName = firstItem?.name || pathsToDelete[0].split('/').pop() || 'item'
        const inTrashFolder = isTrashPath(currentPath()) || isTrashPath(pathsToDelete[0])
        openTrashModal(pathsToDelete[0], firstName, e.shiftKey || inTrashFolder, pathsToDelete)
      }
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('blur', cancelDrag)
  })

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('blur', cancelDrag)
    clearFadeTimer()
    if (marqueeFrame) cancelAnimationFrame(marqueeFrame)
  })

  return (
    <div class="flex-1 flex flex-col h-full w-full select-none overflow-hidden bg-transparent text-white">
      {/* ── Monodrive Central Icon Grid Canvas ── */}
      <main
        class="flex-1 overflow-y-auto px-6 py-5 outline-none"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={(e) => {
          if (suppressClick) {
            suppressClick = false
            return
          }
          if (!(e.target as HTMLElement).closest('[data-grid-item="true"]')) {
            selectOnly(null)
          }
        }}
        onContextMenu={(e) => {
          const isItem = (e.target as HTMLElement).closest('[data-grid-item="true"]')
          if (!isItem) {
            e.preventDefault()
            openContextMenu(e.clientX, e.clientY, {
              name: '',
              path: currentPath(),
              isDirectory: true
            })
          }
        }}
      >
        {/* Subtle, non-blocking top progress bar for slow I/O reads */}
        <Show when={isLoading()}>
          <div class="absolute top-0 left-0 right-0 h-0.5 bg-blue-500/80 animate-pulse z-30 pointer-events-none" />
        </Show>

        <Show
          when={filteredEntries().length > 0}
          fallback={
            <Show when={!isLoading()} fallback={null}>
              {/* Empty Folder State */}
              <div class="h-full flex flex-col items-center justify-center text-center p-6 select-none animate-[fadeIn_200ms_ease-out]">
                <img
                  src={emberLogo}
                  alt="Ember"
                  draggable={false}
                  class="w-16 h-16 opacity-20 mb-3"
                />
                <span class="text-[14px] font-medium text-white/40">Empty Folder</span>
                <span class="text-[12px] text-white/25 mt-1">
                  {browserSearchFilter()
                    ? `No items match "${browserSearchFilter()}"`
                    : 'This folder contains no files or subdirectories.'}
                </span>
              </div>
            </Show>
          }
        >
          {/* Responsive Icon Grid — natural CSS layout */}
          <div
            class="grid gap-4"
            style={{
              'grid-template-columns': `repeat(auto-fill, minmax(${Math.max(88, gridIconSize() + 24)}px, 1fr))`
            }}
          >
            <For each={filteredEntries()}>
              {(entry) => {
                const isSelected = () => selectedPaths().has(entry.path)
                const isImage = () => {
                  const ext = (entry.extension || entry.name.split('.').pop() || '').toLowerCase()
                  return !entry.isDirectory && IMAGE_EXTENSIONS.has(ext)
                }

                const labelSizeClass = () => {
                  const sz = gridLabelSize()
                  if (sz === 'Small') return 'text-[10.5px]'
                  if (sz === 'Large') return 'text-[13px]'
                  return 'text-[11.5px]'
                }

                return (
                  <div
                    data-grid-item="true"
                    data-path={entry.path}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handleItemClick(entry, e)}
                    onDblClick={() => handleItemDoubleClick(entry)}
                    onMouseDown={(e) => {
                      // keep middle-click from starting autoscroll
                      if (e.button === 1 && entry.isDirectory) e.preventDefault()
                    }}
                    onAuxClick={(e) => {
                      if (e.button !== 1 || !entry.isDirectory) return
                      e.preventDefault()
                      openTabInBackground(entry.path)
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (!selectedPaths().has(entry.path)) selectOnly(entry.path)
                      const currentSet = selectedPaths()
                      const paths = currentSet.has(entry.path) && currentSet.size > 1
                        ? Array.from(currentSet)
                        : [entry.path]
                      openContextMenu(e.clientX, e.clientY, {
                        name: entry.name,
                        path: entry.path,
                        paths,
                        isDirectory: entry.isDirectory,
                        isSymlink: entry.isSymlink,
                        linkTarget: entry.linkTarget,
                        isBrokenLink: entry.isBrokenLink
                      })
                    }}
                    class={`group relative flex flex-col items-center pt-2 pb-2.5 px-1.5 rounded-xl transition-colors duration-100 cursor-pointer select-none outline-none ${
                      isSelected() ? 'polaris-tile-selected' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    {/* Icon / Image Thumbnail Container */}
                    <div
                      class="relative flex items-center justify-center mb-1.5 group-hover:scale-[1.03] transition-transform duration-100"
                      style={{
                        width: `${gridIconSize()}px`,
                        height: `${gridIconSize()}px`
                      }}
                    >
                      <Show
                        when={entry.isDirectory}
                        fallback={
                          <Show
                            when={showThumbnails() && isImage()}
                            fallback={
                              <MonodriveFileIcon name={entry.name} extension={entry.extension} />
                            }
                          >
                            <ImageThumbnail path={entry.path} name={entry.name} />
                          </Show>
                        }
                      >
                        <MonodriveFolderIcon />
                      </Show>
                      <Show when={entry.isSymlink}>
                        <LinkBadge broken={entry.isBrokenLink} />
                      </Show>
                    </div>

                    {/* Filename Label (Centered, 2-line clamp with ellipsis) */}
                    <span
                      class={`w-full text-center ${labelSizeClass()} leading-tight px-1 break-words line-clamp-2 transition-colors ${
                        isSelected()
                          ? 'text-white font-semibold'
                          : 'text-white/80 group-hover:text-white'
                      }`}
                      classList={{ 'is-broken-name': !!entry.isBrokenLink }}
                      title={
                        entry.isSymlink
                          ? `${entry.name} → ${entry.linkTarget ?? ''}${entry.isBrokenLink ? ' (missing)' : ''}`
                          : entry.name
                      }
                    >
                      {entry.name}
                    </span>
                  </div>
                )
              }}
            </For>
          </div>
        </Show>
      </main>

      {/* Marquee selection band — sharp corners, accent tint, compositor-friendly */}
      <div
        aria-hidden="true"
        class="pointer-events-none fixed left-0 top-0 z-[60]"
        style={{
          transform: `translate3d(${marqueeRect()?.left ?? 0}px, ${marqueeRect()?.top ?? 0}px, 0)`,
          width: `${marqueeRect()?.width ?? 0}px`,
          height: `${marqueeRect()?.height ?? 0}px`,
          'border-radius': '0',
          border: '1px solid color-mix(in srgb, var(--accent, #4da3f5) 72%, transparent)',
          'background-color': 'color-mix(in srgb, var(--accent, #4da3f5) 10%, transparent)',
          opacity: marqueeActive() && marqueeRect() ? '1' : '0',
          transition: prefersReducedMotion ? 'none' : 'opacity 110ms cubic-bezier(0.2, 0, 0, 1)',
          'will-change': 'transform, width, height, opacity'
        }}
      />

      {/* ── Monodrive Clean Seamless Footer Status Bar ── */}
      <footer class="shrink-0 h-7 px-6 bg-transparent flex items-center justify-between text-[11px] font-mono text-white/35 select-none">
        <div class="flex items-center gap-1.5">
          <Show when={selectedPaths().size > 0}>
            <span class="text-[var(--accent)]" style={{ 'font-variant-numeric': 'tabular-nums' }}>
              {selectedPaths().size} selected
            </span>
            <span class="text-white/20">•</span>
          </Show>
          <span>{filteredEntries().length} items</span>
          <Show when={volumeStatus()}>
            <span class="text-white/20">•</span>
            <span>{volumeStatus()}</span>
          </Show>
        </div>

        <div class="truncate max-w-[320px] text-white/25" title={currentPath()}>
          {currentPath()}
        </div>
      </footer>
    </div>
  )
}

export default FolderView
