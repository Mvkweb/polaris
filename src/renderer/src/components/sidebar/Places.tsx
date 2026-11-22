import { createSignal, For, onMount, Show, type Component } from 'solid-js'
import { navigateTo, workspaceRoot } from '../../store'
import { I } from '../ui/AppIcons'

interface Place {
  id: string
  name: string
  path: string
  icon: Component<{ class?: string }>
}

const DEFAULT_PLACES: Place[] = [
  { id: 'home', name: 'Home', path: '', icon: I.home },
  { id: 'docs', name: 'Documents', path: '', icon: I.documents },
  { id: 'downloads', name: 'Downloads', path: '', icon: I.downloads },
  { id: 'music', name: 'Music', path: '', icon: I.music },
  { id: 'pictures', name: 'Pictures', path: '', icon: I.pictures },
  { id: 'videos', name: 'Videos', path: '', icon: I.videos },
  { id: 'recent', name: 'Recent', path: '', icon: I.recent },
  { id: 'trash', name: 'Trash', path: '', icon: I.trash }
]

export function createSidebarPlaces() {
  const [activePlaceId, setActivePlaceId] = createSignal<string | null>(null)
  const [placesOpen, setPlacesOpen] = createSignal(true)
  const [places, setPlaces] = createSignal<Place[]>(DEFAULT_PLACES)

  const currentPath = () => workspaceRoot() || '.'

  const loadUserPlaces = async (): Promise<void> => {
    try {
      if (window.api?.getUserPlaces) {
        const u = await window.api.getUserPlaces()
        if (u?.home) {
          const list: Place[] = [{ id: 'home', name: 'Home', path: u.home, icon: I.home }]
          if (u.documents)
            list.push({ id: 'docs', name: 'Documents', path: u.documents, icon: I.documents })
          if (u.downloads)
            list.push({ id: 'downloads', name: 'Downloads', path: u.downloads, icon: I.downloads })
          if (u.music) list.push({ id: 'music', name: 'Music', path: u.music, icon: I.music })
          if (u.pictures)
            list.push({ id: 'pictures', name: 'Pictures', path: u.pictures, icon: I.pictures })
          if (u.videos) list.push({ id: 'videos', name: 'Videos', path: u.videos, icon: I.videos })
          if (u.trash) list.push({ id: 'trash', name: 'Trash', path: u.trash, icon: I.trash })
          else list.push({ id: 'trash', name: 'Trash', path: 'trash', icon: I.trash })

          setPlaces(list)
        }
      }
    } catch (err) {
      console.warn('Failed to load user places:', err)
    }
  }

  const handleSelectPlace = async (place: Place): Promise<void> => {
    if (place.id === 'trash') {
      setActivePlaceId('trash')
      let trashDest = place.path
      try {
        if (window.api?.getTrashPath) {
          const resolved = await window.api.getTrashPath(currentPath())
          if (resolved) trashDest = resolved
        }
      } catch {}
      if (trashDest && trashDest !== 'trash') navigateTo(trashDest)
      return
    }
    if (!place.path) return
    setActivePlaceId(place.id)
    navigateTo(place.path)
  }

  onMount(loadUserPlaces)

  const Places: Component = () => (
    <div class="flex flex-col animate-[explorer-mode-in_220ms_cubic-bezier(0.16,1,0.3,1)]">
      <div
        class="flex items-center justify-between px-2.5 py-1 text-[12px] font-semibold text-white/40 hover:text-white/70 transition-colors cursor-pointer select-none"
        onClick={() => setPlacesOpen(!placesOpen())}
      >
        <span>Places</span>
        <I.tuning class="w-3.5 h-3.5 text-white/30 hover:text-white/70 transition-colors" />
      </div>

      <Show when={placesOpen()}>
        <div class="flex flex-col gap-[2px] mt-0.5 px-0.5">
          <For each={places()}>
            {(place) => {
              const isSelected = () =>
                activePlaceId()
                  ? activePlaceId() === place.id
                  : currentPath() === place.path && place.id !== 'recent'

              return (
                <div
                  onClick={() => handleSelectPlace(place)}
                  class={`group flex items-center gap-2.5 px-2.5 h-8 rounded-md text-[13px] font-medium transition-colors duration-150 cursor-pointer select-none ${
                    isSelected()
                      ? 'bg-white/[0.08] text-white'
                      : 'text-white/60 hover:bg-white/[0.04] hover:text-white/90'
                  }`}
                >
                  <place.icon
                    class={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      isSelected() ? 'text-white/90' : 'text-white/40 group-hover:text-white/75'
                    }`}
                  />
                  <span class="truncate">{place.name}</span>
                </div>
              )
            }}
          </For>
        </div>
      </Show>
    </div>
  )

  return { Places, activePlaceId, clearActivePlace: () => setActivePlaceId(null) }
}
