import {
  Component,
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  on,
  onCleanup,
  onMount
} from 'solid-js'
import { Portal } from 'solid-js/web'
import {
  ProjectBadgeColor,
  ProjectItem,
  addProject,
  projectsList,
  removeProject,
  selectedProjectId,
  setSelectedProjectId,
  updateProject
} from '../../store'
import {
  SolarAddFolderLinear,
  SolarAltArrowLeftLinear,
  SolarAltArrowRightLinear,
  SolarMagniferLinear,
  SolarTrashBinTrashLinear
} from '../ui/SolarIcons'
import MockupBadge from '../ui/MockupBadge'

// ── Motion Tokens & Easings ──────────────────────────────────────────────────
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'

// ── Badge Color Map (Muted Watercolor Palette) ───────────────────────────────
const BADGE_COLOR_MAP: Record<ProjectBadgeColor, { bg: string; text: string; hex: string }> = {
  amber: { bg: 'bg-[#d4a362]/18', text: 'text-[#e8be7d]', hex: '#d4a362' },
  emerald: { bg: 'bg-[#7ea894]/18', text: 'text-[#96c5ae]', hex: '#7ea894' },
  yellow: { bg: 'bg-[#deb881]/18', text: 'text-[#ebd09e]', hex: '#deb881' },
  purple: { bg: 'bg-[#988bb5]/18', text: 'text-[#b7a8d8]', hex: '#988bb5' },
  cyan: { bg: 'bg-[#76a5b8]/18', text: 'text-[#91c4d8]', hex: '#76a5b8' },
  blue: { bg: 'bg-[#687c9c]/18', text: 'text-[#869fc4]', hex: '#687c9c' },
  rose: { bg: 'bg-[#d67d84]/18', text: 'text-[#ea939a]', hex: '#d67d84' }
}

const COLOR_OPTIONS: ProjectBadgeColor[] = [
  'amber',
  'emerald',
  'yellow',
  'purple',
  'cyan',
  'blue',
  'rose'
]

const SpeedometerIcon = (props: { class?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" class={props.class ?? 'w-3.5 h-3.5'}>
    <path
      d="M12 15L15 11M21 12A9 9 0 1 1 3 12"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)

interface SegmentedOption {
  value: string
  label: string
  badge?: string
  icon?: (props: { class?: string }) => JSX.Element
}

const MODEL_OPTIONS: SegmentedOption[] = [
  { value: 'Beam Free', label: 'Beam Free', badge: 'OP' },
  { value: 'Medium', label: 'Medium', icon: SpeedometerIcon }
]

const WORKSPACE_OPTIONS: SegmentedOption[] = [
  { value: 'Current checkout', label: 'Current checkout' },
  { value: 'Isolated worktree', label: 'Isolated worktree' },
  { value: 'Container', label: 'Container' }
]

// ── Precision Segmented Control with Morphing Indicator ──────────────────────
interface SegmentedControlProps {
  value: string
  options: SegmentedOption[]
  onChange: (value: string) => void
}

const SegmentedControl: Component<SegmentedControlProps> = (props) => {
  const [indicator, setIndicator] = createSignal<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false
  })

  let containerRef: HTMLDivElement | undefined = undefined
  const buttons: Map<string, HTMLButtonElement> = new Map()

  const updateIndicator = () => {
    const activeBtn = buttons.get(props.value)
    if (!activeBtn || !containerRef) return
    setIndicator({
      left: activeBtn.offsetLeft,
      width: activeBtn.offsetWidth,
      ready: true
    })
  }

  onMount(() => {
    updateIndicator()
    window.addEventListener('resize', updateIndicator)
  })

  onCleanup(() => {
    window.removeEventListener('resize', updateIndicator)
  })

  createEffect(
    on(
      () => props.value,
      () => {
        requestAnimationFrame(updateIndicator)
      }
    )
  )

  return (
    <div
      ref={(el) => (containerRef = el)}
      class="relative inline-flex items-center h-7 p-0.5 rounded-lg bg-[#0a0a0a] select-none"
    >
      <div
        class="absolute top-0.5 bottom-0.5 rounded-md bg-white/[0.1] pointer-events-none"
        style={{
          left: `${indicator().left}px`,
          width: `${indicator().width}px`,
          opacity: indicator().ready ? 1 : 0,
          transition: indicator().ready
            ? `left 160ms ${EASE_OUT}, width 160ms ${EASE_OUT}, opacity 100ms ease`
            : 'none'
        }}
      />

      <For each={props.options}>
        {(opt) => (
          <button
            ref={(el) => {
              if (el) buttons.set(opt.value, el)
            }}
            type="button"
            onClick={() => {
              props.onChange(opt.value)
              requestAnimationFrame(updateIndicator)
            }}
            class={`relative z-10 h-6 px-2.5 rounded-md text-[12px] font-medium transition-colors duration-150 cursor-pointer outline-none whitespace-nowrap flex items-center gap-1.5 ${
              opt.value === props.value ? 'text-white/95' : 'text-white/40 hover:text-white/75'
            }`}
          >
            <Show when={opt.badge}>
              <span class="px-1 py-px rounded bg-white/[0.1] text-white/75 text-[9.5px] font-semibold tracking-tight leading-none">
                {opt.badge}
              </span>
            </Show>
            <Show when={opt.icon}>
              {(iconFn) => iconFn()({ class: 'w-3.5 h-3.5 text-white/45 shrink-0' })}
            </Show>
            <span>{opt.label}</span>
          </button>
        )}
      </For>
    </div>
  )
}

const deriveMonogram = (name: string): string => {
  const clean = name.trim()
  if (!clean) return 'PR'
  const parts = clean.split(/[-_\s]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return clean.slice(0, 2).toUpperCase()
}

// ── Shared Borderless Layout Primitives ──────────────────────────────────────

function ExpressiveAction(props: {
  active?: boolean
  onClick: () => void
  icon?: JSX.Element
  children: JSX.Element
}) {
  const [hovered, setHovered] = createSignal(false)
  const isDrawn = () => hovered() || !!props.active

  return (
    <button
      type="button"
      onClick={props.onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      class={`group relative inline-flex items-center gap-1.5 py-1 bg-transparent text-[12.5px] font-medium tracking-tight transition-colors duration-200 cursor-pointer select-none outline-none ${
        isDrawn() ? 'text-white' : 'text-white/45 hover:text-white'
      }`}
    >
      <Show when={props.icon}>
        <span class="text-white/45 group-hover:text-white transition-colors">{props.icon}</span>
      </Show>
      <span class="relative">
        {props.children}
        <span
          class="pointer-events-none absolute left-0 right-0 -bottom-[3px] h-[1.5px] rounded-full bg-white transition-transform duration-300"
          style={{
            transform: isDrawn() ? 'scaleX(1)' : 'scaleX(0)',
            'transform-origin': isDrawn() ? '0% 50%' : '100% 50%',
            'transition-timing-function': EASE_OUT
          }}
        />
      </span>
    </button>
  )
}

const Section: Component<{
  title: string
  badge?: JSX.Element
  right?: JSX.Element
  children: JSX.Element
}> = (props) => (
  <section class="flex flex-col gap-1.5">
    <div class="flex items-center gap-3 px-2 mb-0.5 select-none">
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-[11.5px] font-semibold text-white/30 tracking-wide">{props.title}</span>
        <Show when={props.badge}>{props.badge}</Show>
      </div>
      <div class="h-px flex-1 bg-white/[0.04]" />
      <Show when={props.right}>{props.right}</Show>
    </div>
    <div class="flex flex-col gap-0.5">{props.children}</div>
  </section>
)

interface SettingRowProps {
  title: string
  hint?: string
  badge?: JSX.Element
  children: JSX.Element
}

const SettingRow: Component<SettingRowProps> = (props) => (
  <div class="group px-3 h-11 rounded-lg flex items-center justify-between gap-4 transition-colors duration-150 hover:bg-white/[0.025] select-none">
    <div class="flex items-center gap-2 min-w-0 pr-4">
      <span class="text-[13px] font-medium text-white/85 group-hover:text-white transition-colors shrink-0">
        {props.title}
      </span>
      <Show when={props.badge}>{props.badge}</Show>
      <Show when={props.hint}>
        <span class="text-[12px] text-white/30 truncate hidden sm:inline">{props.hint}</span>
      </Show>
    </div>
    <div class="shrink-0 flex items-center">{props.children}</div>
  </div>
)

// ── Tonal Confirmation Dialog ────────────────────────────────────────────────

interface ConfirmPopupProps {
  isOpen: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmPopup: Component<ConfirmPopupProps> = (props) => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!props.isOpen) return
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      props.onCancel()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      props.onConfirm()
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown, { capture: true }))
  })

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div
          class="confirm-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm select-none p-4 antialiased"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) props.onCancel()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={props.title}
            class="confirm-card relative w-[380px] max-w-[92vw] overflow-hidden rounded-2xl bg-[#090909] p-5 shadow-[0_32px_80px_rgba(0,0,0,0.85)] flex flex-col outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="flex items-center justify-between">
              <h3 class="text-[15px] font-semibold text-white/95 tracking-tight">{props.title}</h3>
              <span class="text-[11px] font-mono text-white/25">Esc</span>
            </div>

            <p class="text-[12.5px] text-white/45 leading-relaxed mt-2">{props.description}</p>

            <div class="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => props.onCancel()}
                class="h-8 px-3.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-white/70 hover:text-white text-[12.5px] font-medium transition-colors outline-none cursor-pointer"
              >
                {props.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => props.onConfirm()}
                class="h-8 px-3.5 rounded-lg bg-[#d67d84]/20 hover:bg-[#d67d84]/30 text-[#ea939a] hover:text-[#f5b0b6] font-medium text-[12.5px] transition-colors outline-none cursor-pointer"
              >
                {props.confirmLabel || 'Remove'}
              </button>
            </div>
          </div>
        </div>

        <style>{`
          .confirm-backdrop {
            animation: confirmFadeIn 160ms ease-out both;
          }
          .confirm-card {
            animation: confirmScaleUp 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
          }
          @keyframes confirmFadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes confirmScaleUp {
            from {
              opacity: 0;
              transform: scale3d(0.96, 0.96, 1) translate3d(0, 6px, 0);
            }
            to {
              opacity: 1;
              transform: scale3d(1, 1, 1) translate3d(0, 0, 0);
            }
          }
        `}</style>
      </Portal>
    </Show>
  )
}

const handleSelectProject = (id: string): void => {
  setSelectedProjectId(id)
}

const handleBack = (): void => {
  setSelectedProjectId(null)
}

const handleEscKey = (e: KeyboardEvent): void => {
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if (e.key === 'Escape' && selectedProjectId()) {
    e.preventDefault()
    e.stopPropagation()
    handleBack()
  }
}

// ── Main Projects Component ──────────────────────────────────────────────────

export const ProjectsSettings: Component = () => {
  const [filterQuery, setFilterQuery] = createSignal('')
  const [projectToDelete, setProjectToDelete] = createSignal<ProjectItem | null>(null)
  const [isAddingProject, setIsAddingProject] = createSignal(false)
  const [newProjectName, setNewProjectName] = createSignal('')
  const [newProjectPath, setNewProjectPath] = createSignal('')
  const [newProjectMonogram, setNewProjectMonogram] = createSignal('')
  const [newProjectColor, setNewProjectColor] = createSignal<ProjectBadgeColor>('amber')
  const [newProjectModel, setNewProjectModel] = createSignal('Beam Free')
  const [isAddingAction, setIsAddingAction] = createSignal(false)
  const [newActionName, setNewActionName] = createSignal('')
  const [newActionCmd, setNewActionCmd] = createSignal('')

  const activeProject = createMemo<ProjectItem | null>(() => {
    const id = selectedProjectId()
    if (!id) return null
    return projectsList().find((p) => p.id === id) ?? null
  })

  const filteredProjects = createMemo(() => {
    const q = filterQuery().trim().toLowerCase()
    if (!q) return projectsList()
    return projectsList().filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.path.toLowerCase().includes(q) ||
        p.monogram.toLowerCase().includes(q)
    )
  })

  onMount(() => {
    window.addEventListener('keydown', handleEscKey)
    onCleanup(() => window.removeEventListener('keydown', handleEscKey))
  })

  const handleCreateProject = () => {
    const name = newProjectName().trim()
    const path = newProjectPath().trim()
    if (!name || !path) return
    const id = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-') || `proj-${Date.now()}`
    const monogram = (newProjectMonogram().trim() || deriveMonogram(name)).slice(0, 2).toUpperCase()

    addProject({
      id,
      name,
      path,
      monogram,
      color: newProjectColor(),
      model: newProjectModel(),
      workspaceMode: 'Current checkout',
      actions: []
    })

    setNewProjectName('')
    setNewProjectPath('')
    setNewProjectMonogram('')
    setIsAddingProject(false)
    handleSelectProject(id)
  }

  const handleAddAction = (projectId: string) => {
    const name = newActionName().trim()
    const cmd = newActionCmd().trim()
    if (!name || !cmd) return

    const project = activeProject()
    if (!project) return

    updateProject(projectId, {
      actions: [...project.actions, { id: `act-${Date.now()}`, name, command: cmd }]
    })
    setNewActionName('')
    setNewActionCmd('')
    setIsAddingAction(false)
  }

  const handleRemoveAction = (projectId: string, actionId: string) => {
    const project = activeProject()
    if (!project) return
    updateProject(projectId, {
      actions: project.actions.filter((a) => a.id !== actionId)
    })
  }

  const newBadgeStyle = () => BADGE_COLOR_MAP[newProjectColor()] || BADGE_COLOR_MAP.amber

  return (
    <div class="flex flex-col gap-6 w-full max-w-[820px] pb-14 select-none antialiased">
      <Show
        when={activeProject()}
        fallback={
          /* ── MASTER LIST VIEW ───────────────────────────────────────── */
          <>
            {/* Editorial Header with Expressive Line-Draw Action */}
            <div class="flex items-end justify-between px-2">
              <div>
                <h2 class="flex items-center gap-3">
                  <span class="flex items-baseline gap-2">
                    <span class="text-[22px] font-semibold tracking-tight text-white/95">
                      Projects &amp;
                    </span>
                    <span class="text-[22px] font-medium italic font-serif text-white/80">
                      Workspaces
                    </span>
                  </span>
                  <span class="text-[10.5px] font-medium tracking-wider uppercase bg-white/[0.05] text-white/40 px-2 py-1 rounded-md leading-none">
                    Registry
                  </span>
                </h2>
                <p class="text-[13px] text-white/35 mt-1.5">
                  Manage local checkouts, default thread models, and workspace commands.
                </p>
              </div>

              <div class="pb-0.5">
                <ExpressiveAction
                  active={isAddingProject()}
                  onClick={() => setIsAddingProject((prev) => !prev)}
                  icon={<SolarAddFolderLinear class="w-3.5 h-3.5" />}
                >
                  {isAddingProject() ? 'Close composer' : 'New project'}
                </ExpressiveAction>
              </div>
            </div>

            {/* Smooth Accordion Composer for New Project */}
            <div
              class="grid transition-[grid-template-rows] duration-[240ms]"
              style={{
                'grid-template-rows': isAddingProject() ? '1fr' : '0fr',
                'transition-timing-function': EASE_OUT
              }}
            >
              <div class="overflow-hidden">
                <div
                  class={`mx-2 p-4 rounded-xl bg-[#090909] flex flex-col gap-3.5 transition-opacity duration-150 ${
                    isAddingProject() ? 'opacity-100 mb-1' : 'opacity-0'
                  }`}
                >
                  {/* Top Row: Editable Badge Monogram + Name + Path */}
                  <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div class="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        maxLength={2}
                        value={newProjectMonogram() || deriveMonogram(newProjectName())}
                        onInput={(e) => setNewProjectMonogram(e.currentTarget.value.toUpperCase())}
                        title="Edit 2-letter badge monogram"
                        class={`w-8 h-8 rounded-lg shrink-0 text-center text-[11.5px] font-bold tracking-tight uppercase outline-none cursor-text transition-colors ${newBadgeStyle().bg} ${newBadgeStyle().text}`}
                      />
                      <input
                        type="text"
                        placeholder="Project name…"
                        value={newProjectName()}
                        onInput={(e) => {
                          const val = e.currentTarget.value
                          setNewProjectName(val)
                          if (!newProjectMonogram()) {
                            setNewProjectMonogram(deriveMonogram(val))
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateProject()
                          if (e.key === 'Escape') setIsAddingProject(false)
                        }}
                        class="flex-1 h-8 px-3 rounded-lg bg-[#050505] focus:bg-[#030303] text-white/95 text-[12.5px] placeholder:text-white/25 outline-none transition-colors"
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="/path/to/repository"
                      value={newProjectPath()}
                      onInput={(e) => setNewProjectPath(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateProject()
                        if (e.key === 'Escape') setIsAddingProject(false)
                      }}
                      class="flex-[1.3] h-8 px-3 rounded-lg bg-[#050505] focus:bg-[#030303] text-white/85 font-mono text-[12px] placeholder:text-white/25 placeholder:font-sans outline-none transition-colors"
                    />
                  </div>

                  {/* Bottom Toolbar: Swatches + Model Segmented Control + Save */}
                  <div class="flex flex-wrap items-center justify-between gap-3 pt-0.5">
                    <div class="flex items-center gap-3 flex-wrap">
                      <div class="flex items-center gap-1.5 px-1">
                        <For each={COLOR_OPTIONS}>
                          {(c) => {
                            const isSelected = () => newProjectColor() === c
                            const colorHex = BADGE_COLOR_MAP[c]?.hex || '#d4a362'
                            return (
                              <button
                                type="button"
                                onClick={() => setNewProjectColor(c)}
                                class={`w-3.5 h-3.5 rounded-full transition-all duration-150 cursor-pointer outline-none ${
                                  isSelected() ? 'scale-125' : 'opacity-40 hover:opacity-80'
                                }`}
                                style={{ 'background-color': colorHex }}
                                aria-label={`Select color ${c}`}
                              />
                            )
                          }}
                        </For>
                      </div>

                      <div class="h-3.5 w-px bg-white/[0.06]" />

                      <SegmentedControl
                        value={newProjectModel()}
                        options={MODEL_OPTIONS}
                        onChange={setNewProjectModel}
                      />
                    </div>

                    <div class="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => setIsAddingProject(false)}
                        class="h-7 px-2.5 rounded-md text-[12px] font-medium text-white/40 hover:text-white/80 transition-colors cursor-pointer outline-none"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateProject}
                        disabled={!newProjectName().trim() || !newProjectPath().trim()}
                        class="h-7 px-3 rounded-md text-[12px] font-medium bg-white/[0.1] hover:bg-white/[0.16] text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer outline-none flex items-center gap-1.5"
                      >
                        <span>Create</span>
                        <span class="text-[10px] text-white/40">↵</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Header + Compact Search */}
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center gap-3 px-2 mb-1">
                <span class="text-[11.5px] font-semibold text-white/30 tracking-wide tabular-nums">
                  Workspaces ({filteredProjects().length})
                </span>
                <div class="h-px flex-1 bg-white/[0.04]" />

                <div class="relative w-48">
                  <SolarMagniferLinear class="w-3 h-3 text-white/30 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={filterQuery()}
                    onInput={(e) => setFilterQuery(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setFilterQuery('')
                        e.currentTarget.blur()
                      }
                    }}
                    placeholder="Filter workspaces…"
                    class="w-full h-7 bg-[#080808] focus:bg-[#0c0c0c] rounded-md pl-7 pr-2.5 text-[12px] text-white/90 placeholder:text-white/25 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Linear-Style Single-Line Tabular Project Rows */}
              <div class="flex flex-col gap-0.5">
                <Show
                  when={filteredProjects().length > 0}
                  fallback={
                    <div class="py-10 text-center text-[12.5px] text-white/30 select-none">
                      <Show
                        when={filterQuery().trim()}
                        fallback={<p>No workspaces registered yet.</p>}
                      >
                        <p>No workspaces matching "{filterQuery().trim()}"</p>
                      </Show>
                    </div>
                  }
                >
                  <For each={filteredProjects()}>
                    {(project) => {
                      const badge = () => BADGE_COLOR_MAP[project.color] || BADGE_COLOR_MAP.amber

                      return (
                        <div
                          class="group px-2.5 h-10 rounded-lg flex items-center justify-between gap-4 transition-colors duration-150 hover:bg-white/[0.035] cursor-pointer outline-none select-none"
                          onClick={() => handleSelectProject(project.id)}
                        >
                          {/* Left: Badge + Name + Inline Path */}
                          <div class="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              class={`w-6 h-6 rounded-md shrink-0 flex items-center justify-center text-[10.5px] font-bold tracking-tight select-none ${badge().bg} ${badge().text}`}
                            >
                              {project.monogram}
                            </div>

                            <span class="text-[13px] font-medium text-white/90 group-hover:text-white transition-colors shrink-0">
                              {project.name}
                            </span>

                            <span class="text-[12px] text-white/25 font-mono tracking-tight group-hover:text-white/40 transition-colors truncate">
                              {project.path}
                            </span>
                          </div>

                          {/* Right: Metadata + Hover Delete + Chevron */}
                          <div
                            class="flex items-center gap-2.5 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Show when={project.actions.length > 0}>
                              <span class="hidden md:inline text-[11px] text-white/25 tabular-nums">
                                {project.actions.length}{' '}
                                {project.actions.length === 1 ? 'action' : 'actions'}
                              </span>
                            </Show>

                            <span class="hidden sm:inline text-[11.5px] text-white/25 group-hover:text-white/45 transition-colors">
                              {project.workspaceMode || 'Current checkout'}
                            </span>

                            <span
                              onClick={() => handleSelectProject(project.id)}
                              class="h-5 px-2 rounded bg-white/[0.04] group-hover:bg-white/[0.07] text-[11px] font-medium text-white/55 group-hover:text-white/80 flex items-center transition-colors"
                            >
                              {project.model}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setProjectToDelete(project)
                              }}
                              class="opacity-0 group-hover:opacity-100 p-1 rounded text-white/25 hover:text-[#ea939a] hover:bg-white/[0.05] transition-all outline-none cursor-pointer"
                              aria-label={`Remove ${project.name}`}
                            >
                              <SolarTrashBinTrashLinear class="w-3.5 h-3.5" />
                            </button>

                            <div
                              class="text-white/20 group-hover:text-white/60 transition-colors cursor-pointer"
                              onClick={() => handleSelectProject(project.id)}
                            >
                              <SolarAltArrowRightLinear class="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>
                      )
                    }}
                  </For>
                </Show>
              </div>
            </div>
          </>
        }
      >
        {/* ── DETAIL / INSPECTOR VIEW ───────────────────────────────── */}
        {(project) => {
          const badge = () => BADGE_COLOR_MAP[project().color] || BADGE_COLOR_MAP.amber

          return (
            <div class="flex flex-col gap-6">
              {/* Top Navigation Bar + Subtle Remove Action */}
              <div class="flex items-center justify-between px-2">
                <button
                  type="button"
                  onClick={handleBack}
                  class="flex items-center gap-2 text-[12.5px] font-medium text-white/40 hover:text-white/90 transition-colors cursor-pointer outline-none group"
                >
                  <SolarAltArrowLeftLinear class="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:-translate-x-0.5 transition-all" />
                  <span>Workspaces</span>
                  <kbd class="ml-1 px-1.5 py-0.5 rounded bg-white/[0.04] text-[10px] font-mono text-white/30">
                    Esc
                  </kbd>
                </button>

                <button
                  type="button"
                  onClick={() => setProjectToDelete(project())}
                  class="h-7 px-2.5 rounded-md text-[12px] font-medium text-white/35 hover:text-[#ea939a] hover:bg-[#d67d84]/10 transition-colors cursor-pointer outline-none flex items-center gap-1.5"
                >
                  <SolarTrashBinTrashLinear class="w-3.5 h-3.5" />
                  <span>Remove workspace</span>
                </button>
              </div>

              {/* Unified Hero Identity Header */}
              <div class="mx-2 p-4 rounded-xl bg-[#080808] flex items-center justify-between gap-4 flex-wrap">
                <div class="flex items-center gap-3.5 min-w-0 flex-1">
                  <div
                    class={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-[13.5px] font-bold tracking-tight select-none ${badge().bg} ${badge().text}`}
                  >
                    {project().monogram}
                  </div>
                  <div class="flex flex-col min-w-0 flex-1">
                    <span class="text-[16px] font-semibold text-white/95 tracking-tight truncate">
                      {project().name}
                    </span>
                    <span class="text-[12px] text-white/35 font-mono tracking-tight truncate mt-0.5">
                      {project().path}
                    </span>
                  </div>
                </div>

                {/* Inline Color Swatches right in the Hero */}
                <div class="flex items-center gap-1.5 px-1">
                  <For each={COLOR_OPTIONS}>
                    {(c) => {
                      const isSelected = () => project().color === c
                      const colorHex = BADGE_COLOR_MAP[c]?.hex || '#d4a362'
                      return (
                        <button
                          type="button"
                          onClick={() => updateProject(project().id, { color: c })}
                          class={`w-3.5 h-3.5 rounded-full transition-all duration-150 cursor-pointer outline-none ${
                            isSelected() ? 'scale-125' : 'opacity-35 hover:opacity-80'
                          }`}
                          style={{ 'background-color': colorHex }}
                          aria-label={`Select color ${c}`}
                        />
                      )
                    }}
                  </For>
                </div>
              </div>

              {/* ── Section: Identity ── */}
              <Section title="Identity">
                <SettingRow title="Display name">
                  <input
                    type="text"
                    value={project().name}
                    onInput={(e) => updateProject(project().id, { name: e.currentTarget.value })}
                    class="w-48 sm:w-60 h-8 px-3 rounded-lg bg-[#090909] hover:bg-[#0c0c0c] focus:bg-[#050505] text-white/90 text-[12.5px] outline-none transition-colors"
                  />
                </SettingRow>

                <SettingRow title="Directory path">
                  <input
                    type="text"
                    value={project().path}
                    onInput={(e) => updateProject(project().id, { path: e.currentTarget.value })}
                    class="w-48 sm:w-60 h-8 px-3 rounded-lg bg-[#090909] hover:bg-[#0c0c0c] focus:bg-[#050505] text-white/75 font-mono text-[12px] outline-none transition-colors"
                  />
                </SettingRow>

                <SettingRow title="Badge monogram" hint="2-character identifier">
                  <input
                    type="text"
                    maxLength={2}
                    value={project().monogram}
                    onInput={(e) =>
                      updateProject(project().id, {
                        monogram: e.currentTarget.value.toUpperCase()
                      })
                    }
                    class="w-12 h-8 text-center rounded-lg bg-[#090909] hover:bg-[#0c0c0c] focus:bg-[#050505] text-white/90 font-mono text-[12px] font-semibold outline-none uppercase transition-colors"
                  />
                </SettingRow>
              </Section>

              {/* ── Section: Thread Defaults ── */}
              <Section title="Thread Defaults">
                {/* [MOCKUP] Default model not yet connected to an AI runner */}
                <SettingRow title="Default model" badge={<MockupBadge />}>
                  <SegmentedControl
                    value={project().model || 'Beam Free'}
                    options={MODEL_OPTIONS}
                    onChange={(val) => updateProject(project().id, { model: val })}
                  />
                </SettingRow>

                {/* [MOCKUP] Isolated worktree / Container orchestration not yet built */}
                <SettingRow title="Execution environment" badge={<MockupBadge />}>
                  <SegmentedControl
                    value={project().workspaceMode || 'Current checkout'}
                    options={WORKSPACE_OPTIONS}
                    onChange={(val) => updateProject(project().id, { workspaceMode: val })}
                  />
                </SettingRow>
              </Section>

              {/* ── Section: Actions ── */}
              {/* [MOCKUP] Action commands can be registered but are not yet executed */}
              <Section
                title={`Actions (${project().actions.length})`}
                badge={<MockupBadge />}
                right={
                  <ExpressiveAction
                    active={isAddingAction()}
                    onClick={() => setIsAddingAction((prev) => !prev)}
                  >
                    {isAddingAction() ? 'Cancel' : '+ Add command'}
                  </ExpressiveAction>
                }
              >
                {/* Smooth Accordion Command Bar */}
                <div
                  class="grid transition-[grid-template-rows] duration-[220ms]"
                  style={{
                    'grid-template-rows': isAddingAction() ? '1fr' : '0fr',
                    'transition-timing-function': EASE_OUT
                  }}
                >
                  <div class="overflow-hidden">
                    <div
                      class={`mx-2 mb-1.5 p-2.5 rounded-xl bg-[#090909] flex flex-col sm:flex-row items-stretch sm:items-center gap-2 transition-opacity duration-150 ${
                        isAddingAction() ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <input
                        type="text"
                        placeholder="Label (e.g. Test)"
                        value={newActionName()}
                        onInput={(e) => setNewActionName(e.currentTarget.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddAction(project().id)
                          if (e.key === 'Escape') setIsAddingAction(false)
                        }}
                        class="sm:w-40 h-8 px-3 rounded-lg bg-[#050505] text-white/90 text-[12.5px] placeholder:text-white/25 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Command (e.g. bun run test)"
                        value={newActionCmd()}
                        onInput={(e) => setNewActionCmd(e.currentTarget.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddAction(project().id)
                          if (e.key === 'Escape') setIsAddingAction(false)
                        }}
                        class="flex-1 h-8 px-3 rounded-lg bg-[#050505] text-white/85 font-mono text-[12px] placeholder:text-white/25 placeholder:font-sans outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddAction(project().id)}
                        disabled={!newActionName().trim() || !newActionCmd().trim()}
                        class="h-8 px-3 rounded-lg text-[12px] font-medium bg-white/[0.1] hover:bg-white/[0.15] text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer outline-none shrink-0"
                      >
                        Save ↵
                      </button>
                    </div>
                  </div>
                </div>

                <Show
                  when={project().actions.length > 0}
                  fallback={
                    <div class="px-3 py-4 text-[12.5px] text-white/25">
                      No custom commands configured for this workspace.
                    </div>
                  }
                >
                  <For each={project().actions}>
                    {(act) => (
                      <div class="group px-3 h-10 rounded-lg flex items-center justify-between gap-4 hover:bg-white/[0.025] transition-colors">
                        <span class="text-[13px] font-medium text-white/85 shrink-0">
                          {act.name}
                        </span>

                        <div class="flex items-center gap-2 min-w-0">
                          <code class="px-2 py-0.5 rounded bg-[#080808] text-[11.5px] font-mono text-white/45 truncate max-w-[320px]">
                            {act.command}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleRemoveAction(project().id, act.id)}
                            class="opacity-0 group-hover:opacity-100 p-1 rounded text-white/25 hover:text-[#ea939a] hover:bg-white/[0.05] transition-all cursor-pointer outline-none shrink-0"
                            aria-label={`Remove ${act.name}`}
                          >
                            <SolarTrashBinTrashLinear class="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </For>
                </Show>
              </Section>
            </div>
          )
        }}
      </Show>

      {/* ── Confirmation Modal ── */}
      <ConfirmPopup
        isOpen={projectToDelete() !== null}
        title="Remove Workspace"
        description={`Unbind "${projectToDelete()?.name}" from Grimmoire? Your local files on disk will not be touched.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onCancel={() => setProjectToDelete(null)}
        onConfirm={() => {
          const p = projectToDelete()
          if (p) {
            removeProject(p.id)
            if (selectedProjectId() === p.id) {
              handleBack()
            }
          }
          setProjectToDelete(null)
        }}
      />
    </div>
  )
}

export default ProjectsSettings
