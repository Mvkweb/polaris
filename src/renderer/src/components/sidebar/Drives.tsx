import {
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  type Accessor,
  type Component
} from 'solid-js'
import { navigateTo, openContextMenu, workspaceRoot } from '../../store'
import type { SystemDrive } from '../../types'
import { Loader } from '../dithercn/loader'
import { ProgressBar } from '../dithercn/progress-bar'
import { I } from '../ui/AppIcons'

const formatFreeSpace = (raw?: string): string => {
  if (!raw) return ''
  return `${raw.replace(/\s*free$/i, '').trim()} free`
}

export function createSidebarDrives(
  activePlaceId: Accessor<string | null>,
  clearActivePlace: () => void
): Component {
  const [drives, setDrives] = createSignal<SystemDrive[]>([])
  const [devicesOpen, setDevicesOpen] = createSignal(true)
  const [removableOpen, setRemovableOpen] = createSignal(true)
  const [hoveredDriveId, setHoveredDriveId] = createSignal<string | null>(null)
  const [mountingDriveId, setMountingDriveId] = createSignal<string | null>(null)
  const [readMountError, setMountError] = createSignal<{ id: string; message: string } | null>(null)

  const internalDrives = createMemo(() => drives().filter((d) => !d.isRemovable))
  const removableDrives = createMemo(() =>
    drives()
      .filter((d) => d.isRemovable)
      .sort(
        (a, b) =>
          Number(b.isMounted !== false) - Number(a.isMounted !== false) ||
          a.name.localeCompare(b.name)
      )
  )

  const currentPath = () => workspaceRoot() || '.'

  const loadDrives = async (): Promise<void> => {
    try {
      if (window.api?.getSystemDrives) {
        const result = await window.api.getSystemDrives()
        setDrives(result || [])
      }
    } catch (err) {
      console.warn('Failed to load system drives:', err)
    }
  }

  const handleSelectDrive = async (drive: SystemDrive): Promise<void> => {
    if (drive.isMounted !== false) {
      if (!drive.mountPoint) return
      clearActivePlace()
      navigateTo(drive.mountPoint)
      return
    }

    if (!drive.device || mountingDriveId()) return

    setMountingDriveId(drive.id)
    setMountError(null)
    try {
      const result = await window.api?.mountDrive?.(drive.device)
      if (result?.ok && result.mountPoint) {
        await loadDrives()
        clearActivePlace()
        navigateTo(result.mountPoint)
      } else {
        setMountError({ id: drive.id, message: result?.error || 'Could not mount the drive' })
      }
    } catch (err) {
      setMountError({
        id: drive.id,
        message: err instanceof Error ? err.message : 'Could not mount the drive'
      })
    } finally {
      setMountingDriveId(null)
    }
  }

  // Refresh while the sidebar is mounted, even when the drive list is hidden.
  onMount(() => {
    void loadDrives()
    window.addEventListener('focus', loadDrives)
    const unsubscribe = window.api?.onDrivesChanged?.(loadDrives)
    onCleanup(() => {
      window.removeEventListener('focus', loadDrives)
      unsubscribe?.()
    })
  })

  const DriveItemRow: Component<{
    drive: SystemDrive
    icon: Component<{ class?: string }>
  }> = (props) => {
    const isUnmounted = () => props.drive.isMounted === false
    const isReadOnly = () => props.drive.isReadOnly === true
    const isSelected = () =>
      !isUnmounted() && !activePlaceId() && currentPath() === props.drive.mountPoint
    const isDriveHovered = () => hoveredDriveId() === props.drive.id
    const isExpanded = () => isDriveHovered() || isSelected()
    const isMounting = () => mountingDriveId() === props.drive.id
    const mountError = () =>
      readMountError()?.id === props.drive.id ? readMountError()?.message : null

    const capacityLabel = (): string => {
      if (isUnmounted()) return props.drive.size
      if (isReadOnly()) return `${props.drive.size} / ${props.drive.size}`
      return formatFreeSpace(props.drive.freeSpace || props.drive.size)
    }

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => handleSelectDrive(props.drive)}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (isUnmounted()) return
          openContextMenu(e.clientX, e.clientY, {
            path: props.drive.mountPoint,
            name: props.drive.name,
            isDrive: true,
            drive: props.drive
          })
        }}
        onMouseEnter={() => setHoveredDriveId(props.drive.id)}
        onMouseLeave={() => setHoveredDriveId((curr) => (curr === props.drive.id ? null : curr))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleSelectDrive(props.drive)
          }
        }}
        class={`group rounded-md cursor-pointer outline-none transition-colors duration-150 select-none px-2.5 py-2 ${
          isExpanded()
            ? 'bg-white/[0.08] text-white/95'
            : 'bg-transparent hover:bg-white/[0.04] text-white/60'
        }`}
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <props.icon
            class={`w-3.5 h-3.5 shrink-0 transition-colors ${
              isExpanded() ? 'text-white/90' : 'text-white/40 group-hover:text-white/75'
            }`}
          />
          <span
            class={`flex-1 truncate text-[13px] font-medium transition-colors ${
              isExpanded() ? 'text-white/95' : 'text-white/70'
            }`}
          >
            {props.drive.name}
          </span>
          <Show when={isMounting()}>
            <Loader
              variant="dots"
              size="sm"
              cell={1}
              color="ink"
              label={`Mounting ${props.drive.name}`}
              class="h-4 opacity-80"
            />
          </Show>
          <Show when={!isMounting() && (props.drive.freeSpace || props.drive.size)}>
            <span
              class={`text-[11px] font-mono tabular-nums shrink-0 transition-colors ${
                isExpanded() ? 'text-white/55' : 'text-white/35'
              }`}
            >
              {capacityLabel()}
            </span>
          </Show>
        </div>

        <Show when={!isUnmounted()}>
          <div class="w-full mt-2">
            <ProgressBar
              label={props.drive.name || props.drive.model || props.drive.mountPoint}
              value={Math.min(100, Math.max(0, Math.round(props.drive.usedPercent || 0)))}
              max={100}
              size="sm"
              fill="gradient"
              bloom="low"
              color="ink"
              hideLabel
              class="w-full"
            />
          </div>
        </Show>

        <div
          class="grid transition-[grid-template-rows] duration-300 ease-out"
          style={{
            'grid-template-rows': isExpanded() ? '1fr' : '0fr'
          }}
        >
          <div class="overflow-hidden">
            <div
              class={`flex items-center justify-between pt-1.5 text-[11px] font-mono transition-opacity duration-200 ${
                isExpanded() ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Show
                when={!isUnmounted()}
                fallback={
                  <span class="truncate text-white/40">
                    {isMounting() ? 'Mounting…' : 'Not mounted · click to mount'}
                  </span>
                }
              >
                <span class="truncate text-white/40 max-w-[145px]" title={props.drive.mountPoint}>
                  {props.drive.mountPoint}
                </span>
                <span class="text-white/35 tabular-nums shrink-0">
                  {isReadOnly() ? 'read-only' : `${props.drive.usedPercent}% used`}
                </span>
              </Show>
            </div>
            <Show when={mountError()}>
              <p
                class="pt-1 text-[11px] leading-snug text-amber-300/80 truncate"
                title={mountError() ?? undefined}
              >
                {mountError()}
              </p>
            </Show>
            <Show
              when={
                props.drive.isRemovable &&
                props.drive.diskSize &&
                props.drive.diskSize !== props.drive.size
              }
            >
              <p class="pt-0.5 text-[10px] font-mono text-white/25 truncate">
                {props.drive.size} partition on a {props.drive.diskSize} drive
              </p>
            </Show>
          </div>
        </div>
      </div>
    )
  }

  return () => (
    <>
      <div class="flex flex-col pt-4">
        <div
          class="flex items-center justify-between px-2.5 py-1 text-[12px] font-semibold text-white/40 hover:text-white/70 transition-colors cursor-pointer select-none"
          onClick={() => setDevicesOpen(!devicesOpen())}
        >
          <span>Devices</span>
        </div>

        <Show when={devicesOpen()}>
          <div class="flex flex-col gap-[2px] mt-0.5 px-0.5">
            <For each={internalDrives()}>
              {(drive) => <DriveItemRow drive={drive} icon={I.drive} />}
            </For>
          </div>
        </Show>
      </div>
      <Show when={removableDrives().length > 0}>
        <div class="flex flex-col pt-3">
          <div
            class="flex items-center justify-between px-2.5 py-1 text-[12px] font-semibold text-white/40 hover:text-white/70 transition-colors cursor-pointer select-none"
            onClick={() => setRemovableOpen(!removableOpen())}
          >
            <span>Removable Devices</span>
          </div>

          <Show when={removableOpen()}>
            <div class="flex flex-col gap-[2px] mt-0.5 px-0.5">
              <For each={removableDrives()}>
                {(drive) => <DriveItemRow drive={drive} icon={I.usb} />}
              </For>
            </div>
          </Show>
        </div>
      </Show>
    </>
  )
}
