import { createMemo, createResource, createSignal, For, onMount, Show } from 'solid-js'
import type { DesktopApplication } from '../../../../shared/openWith'
import { openWithTarget, setOpenWithTarget } from '../../openWith'
import { fillStyle } from '../../lib/dither'
import { Aurora } from '../dithercn/aurora'
import { DitherButton } from '../dithercn/dither-button'
import { DitherSwitch } from '../dithercn/dither-switch'
import './open-with.css'

/** The app's own icon (from its desktop entry), or a dithered initial. */
const AppIcon = (props: { app: DesktopApplication }) => {
  const [src] = createResource(
    () => props.app.id,
    (id) => window.api.getAppIcon(id).catch(() => null)
  )
  return (
    <span class="ow-icon" aria-hidden="true">
      <Show
        when={src()}
        fallback={
          <Show when={!src.loading}>
            <span class="ow-icon-fallback">
              <span class="ow-icon-dots" style={fillStyle('dotted', { color: 'ink', cell: 1 })} />
              <span class="relative">{props.app.name.trim().charAt(0).toUpperCase()}</span>
            </span>
          </Show>
        }
      >
        {(url) => <img src={url()} alt="" draggable={false} />}
      </Show>
    </span>
  )
}

const Chooser = (props: { path: string; name: string }) => {
  let dialog!: HTMLDialogElement
  let search: HTMLInputElement | undefined
  const [info] = createResource(async () =>
    window.api.inspectOpenWith(props.path).catch(() => null)
  )
  const [selectedId, setSelectedId] = createSignal<string | null>(null)
  const [showAll, setShowAll] = createSignal(false)
  const [query, setQuery] = createSignal('')
  const [makeDefault, setMakeDefault] = createSignal(false)
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal('')
  const [opened, setOpened] = createSignal(false)

  const recommended = createMemo(() => info()?.apps.filter((app) => app.recommended) ?? [])
  const others = createMemo(() => info()?.apps.filter((app) => !app.recommended) ?? [])
  // Nothing to suggest: go straight to every app instead of an empty section.
  const allOpen = createMemo(() => showAll() || recommended().length === 0)
  const filtered = createMemo(() => {
    const term = query().trim().toLowerCase()
    return term ? others().filter((app) => app.name.toLowerCase().includes(term)) : others()
  })
  const selected = createMemo(() =>
    info()?.apps.find((app) => app.id === (selectedId() ?? info()?.defaultAppId))
  )
  const defaultName = createMemo(
    () => info()?.apps.find((app) => app.id === info()?.defaultAppId)?.name
  )

  const dismiss = (): void => {
    if (busy()) return
    dialog.close()
    setOpenWithTarget(null)
  }

  const open = async (): Promise<void> => {
    const app = selected()
    const fileInfo = info()
    if (!app || !fileInfo || busy() || opened()) return
    setError('')
    setBusy(true)
    try {
      const result = await window.api.openWithApp(
        props.path,
        app.id,
        makeDefault() && fileInfo.canSetDefault ? fileInfo.mimeType : undefined
      )
      setBusy(false)
      if (result === 'default-not-saved') {
        setOpened(true)
        setError('The file opened, but Linux didn’t apply the new default.')
      } else {
        dismiss()
      }
    } catch {
      setBusy(false)
      setError('Couldn’t open the file with this app. Try another app.')
    }
  }

  const AppRow = (row: { app: DesktopApplication }) => {
    const active = (): boolean => selected()?.id === row.app.id
    return (
      <label
        class="ow-row"
        classList={{ 'is-active': active() }}
        onDblClick={() => !busy() && void open()}
      >
        <span
          class="ow-row-fill"
          style={fillStyle('gradient', { color: '--accent', edge: 'right', length: 12, to: 0 })}
          aria-hidden="true"
        />
        <input
          type="radio"
          name="open-with-app"
          class="sr-only"
          disabled={busy() || opened()}
          checked={active()}
          onChange={() => {
            setSelectedId(row.app.id)
            setError('')
          }}
        />
        <AppIcon app={row.app} />
        <span class="min-w-0 flex-1 truncate">{row.app.name}</span>
        <Show when={info()?.defaultAppId === row.app.id}>
          <span class="ow-tag">Default</span>
        </Show>
        <svg class="ow-check" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      </label>
    )
  }

  onMount(() => dialog.showModal())

  return (
    <dialog
      ref={(el) => (dialog = el)}
      class="ow-card"
      aria-labelledby="open-with-title"
      aria-describedby="open-with-sub"
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') {
          e.preventDefault()
          dismiss()
        }
      }}
      onKeyUp={(e) => e.stopPropagation()}
      onCancel={(e) => {
        e.preventDefault()
        dismiss()
      }}
      onClick={(e) => e.target === dialog && dismiss()}
    >
      <form
        class="relative"
        onSubmit={(e) => {
          e.preventDefault()
          void open()
        }}
      >
        <div class="ow-aurora" aria-hidden="true">
          <Aurora
            class="size-full"
            color="ink"
            tipColor="ink"
            background="transparent"
            curtains={3}
            height={0.55}
            spread={0.14}
            direction="down"
            intensity={0.9}
            glow={0.9}
            rays={9}
            sway={1}
            drift={0.25}
            shimmer={0.3}
            matrix="bayer8"
            cell={2}
          />
        </div>

        <header class="relative px-5 pt-[58px]">
          <p class="text-[12px] text-white/40">Open with</p>
          <h2 id="open-with-title" class="mt-0.5 truncate text-[15px] font-medium text-white">
            {props.name}
          </h2>
          <p id="open-with-sub" class="mt-0.5 truncate text-[12px] text-white/40">
            <Show when={info()} fallback="Looking for apps…">
              {(fileInfo) => (
                <>
                  <Show when={defaultName()} fallback="No default app yet">
                    Opens in <span class="text-white/60">{defaultName()}</span>
                  </Show>
                  <span class="ow-mime"> · {fileInfo().mimeType}</span>
                </>
              )}
            </Show>
          </p>
        </header>

        <div class="relative px-3 pt-3">
          <Show when={!info.loading && info() === null}>
            <p role="alert" class="px-2 py-3 text-[13px] text-white/60">
              Couldn’t load apps for this file.
            </p>
          </Show>
          <Show when={info() && !opened()}>
            <Show
              when={(info()?.apps.length ?? 0) > 0}
              fallback={
                <p class="px-2 py-3 text-[13px] text-white/60">
                  No installed apps can open this file.
                </p>
              }
            >
              <fieldset class="min-w-0">
                <legend class="sr-only">Application</legend>
                <Show when={recommended().length > 0}>
                  <p class="ow-section">Suggested</p>
                  <div class="ow-list">
                    <For each={recommended()}>{(app) => <AppRow app={app} />}</For>
                  </div>
                </Show>

                <Show when={others().length > 0}>
                  <Show when={recommended().length > 0}>
                    <button
                      type="button"
                      class="ow-more"
                      aria-expanded={allOpen()}
                      onClick={() => {
                        setShowAll(!showAll())
                        if (showAll()) requestAnimationFrame(() => search?.focus())
                      }}
                    >
                      <span>{allOpen() ? 'Fewer apps' : 'All apps'}</span>
                      <span class="text-white/30 tabular-nums">{others().length}</span>
                      <svg class="ow-chevron" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M4.5 6.5l3.5 3.5 3.5-3.5" />
                      </svg>
                    </button>
                  </Show>
                  <Show when={allOpen()}>
                    <div class="ow-all">
                      <Show when={recommended().length === 0}>
                        <p class="ow-section">All apps</p>
                      </Show>
                      <label class="ow-search">
                        <svg viewBox="0 0 16 16" aria-hidden="true">
                          <circle cx="7" cy="7" r="4.25" />
                          <path d="M10.25 10.25L13 13" />
                        </svg>
                        <input
                          ref={search}
                          type="search"
                          aria-label="Search apps"
                          placeholder="Search apps"
                          value={query()}
                          onInput={(e) => setQuery(e.currentTarget.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.preventDefault()
                          }}
                        />
                      </label>
                      <div class="ow-list ow-list-scroll">
                        <For
                          each={filtered()}
                          fallback={<p class="px-2 py-2 text-[12.5px] text-white/35">No matches</p>}
                        >
                          {(app) => <AppRow app={app} />}
                        </For>
                      </div>
                    </div>
                  </Show>
                </Show>
              </fieldset>
            </Show>
          </Show>
        </div>

        <div class="relative px-5">
          <Show
            when={info()?.canSetDefault && selected() && !opened()}
            fallback={
              <Show when={info()?.canSetDefault === false}>
                <p class="ow-foot-note">
                  This file type can only be opened once, not set as default.
                </p>
              </Show>
            }
          >
            <div class="ow-default">
              <span id="open-with-default">Always use this app for this file type</span>
              <DitherSwitch
                size="sm"
                aria-labelledby="open-with-default"
                checked={makeDefault()}
                onChange={setMakeDefault}
                disabled={busy()}
              />
            </div>
          </Show>
          <Show when={error()}>
            <p role="alert" class="mt-2 text-[12px] text-rose-300/90">
              {error()}
            </p>
          </Show>
        </div>

        <footer class="relative flex justify-end gap-2 px-5 pt-4 pb-5">
          <DitherButton
            type="button"
            size="sm"
            variant="outline"
            color="ink"
            onClick={dismiss}
            disabled={busy()}
          >
            <Show when={opened() || info() === null} fallback="Cancel">
              Close
            </Show>
          </DitherButton>
          <Show when={!opened() && info() !== null}>
            <DitherButton
              type="submit"
              size="sm"
              color="ink"
              disabled={!selected() || busy()}
              loading={busy()}
            >
              <Show when={selected()} fallback="Open">
                <span class="max-w-[180px] truncate">Open in {selected()!.name}</span>
              </Show>
            </DitherButton>
          </Show>
        </footer>
      </form>
    </dialog>
  )
}

export const OpenWithDialog = () => (
  <Show when={openWithTarget()} keyed>
    {(file) => <Chooser path={file.path} name={file.name} />}
  </Show>
)
