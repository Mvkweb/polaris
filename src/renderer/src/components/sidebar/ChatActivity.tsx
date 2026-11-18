import { createMemo, createSignal, For, Show, type Accessor, type Component } from 'solid-js'
import {
  chatSessions,
  currentChatSessionId,
  setChatSessions,
  setCurrentChatSessionId,
  setCurrentView
} from '../../store'
import type { ChatSessionSummary } from '../../types'
import { DitherButton } from '../dithercn/dither-button'
import { I } from '../ui/AppIcons'
import { timeAgo } from './formatActivityTime'

const ICON_BASE = 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons'

export const startSidebarChat = (): void => {
  const newId = `session-${Date.now()}`
  const newSession: ChatSessionSummary = {
    id: newId,
    title: 'New Conversation',
    modelId: 'gemini-2.5-flash',
    modelName: 'Gemini 2.5 Flash',
    modelIcon: 'gemini',
    provider: 'Google',
    updatedAt: Date.now(),
    createdAt: Date.now(),
    preview: 'Ask anything or prompt agent...',
    fileRefs: [],
    messageCount: 0
  }
  setChatSessions((prev) => [newSession, ...prev])
  setCurrentChatSessionId(newId)
  setCurrentView('chat')
}

const deleteSession = (sessionId: string): void => {
  setChatSessions((prev) => prev.filter((s) => s.id !== sessionId))
  if (currentChatSessionId() === sessionId) {
    const remaining = chatSessions().filter((s) => s.id !== sessionId)
    setCurrentChatSessionId(remaining.length > 0 ? remaining[0].id : '')
  }
}

const SessionCardBody = (props: {
  session: ChatSessionSummary
  showActiveBadge: boolean
  brightTitle: boolean
  onDelete: () => void
}) => {
  return (
    <>
      <div class="flex items-center gap-1.5 min-w-0">
        <img
          src={`${ICON_BASE}/${props.session.modelIcon}.svg`}
          alt=""
          class="w-3.5 h-3.5 shrink-0 opacity-100"
          style={{
            filter: !props.session.modelIcon.endsWith('-color') ? 'invert(1) brightness(2)' : 'none'
          }}
          onError={(e) => {
            e.currentTarget.src = `${ICON_BASE}/opencode.svg`
            e.currentTarget.style.filter = 'invert(1) brightness(2)'
          }}
        />
        <span class="text-[12px] font-semibold text-white/75 group-hover:text-white/90 truncate max-w-[135px]">
          {props.session.modelName}
        </span>
        <Show
          when={props.showActiveBadge}
          fallback={
            <span class="ml-auto text-[11.5px] font-medium text-white/40 shrink-0">
              {timeAgo(Math.floor(props.session.updatedAt / 1000))}
            </span>
          }
        >
          <span class="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] opacity-90">
            Active
          </span>
        </Show>
      </div>
      <div>
        <h3
          title={props.session.title || 'New Conversation'}
          class="relative text-[13px] leading-snug truncate font-semibold text-white/80 group-hover:text-white transition-colors"
        >
          <span
            class={`block truncate transition-opacity duration-300 ${
              props.brightTitle ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {props.session.title || 'New Conversation'}
          </span>
          <span
            aria-hidden
            class={`pointer-events-none absolute inset-0 truncate font-bold text-white transition-opacity duration-300 ${
              props.brightTitle ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {props.session.title || 'New Conversation'}
          </span>
        </h3>
      </div>
      <div class="flex items-center justify-between pt-0.5 min-w-0">
        <Show
          when={props.session.fileRefs && props.session.fileRefs.length > 0}
          fallback={
            <Show
              when={props.session.preview}
              fallback={
                <Show when={props.session.messageCount}>
                  <div class="flex items-center gap-1.5 text-[11px] text-white/40">
                    <I.chat class="w-3 h-3 text-white/30 shrink-0" />
                    <span class="shrink-0">{props.session.messageCount} msgs</span>
                  </div>
                </Show>
              }
            >
              <div
                class="flex items-center gap-1.5 text-[11px] text-white/45 tracking-tight truncate"
                title={props.session.preview}
              >
                <I.chat class="w-3 h-3 text-white/30 shrink-0" />
                <span class="truncate">{props.session.preview}</span>
                <Show when={props.session.messageCount}>
                  <span class="text-white/25 shrink-0">• {props.session.messageCount}</span>
                </Show>
              </div>
            </Show>
          }
        >
          <div
            class="flex items-center gap-1.5 text-[11px] text-white/55 font-mono tracking-tight truncate"
            title={`${props.session.fileRefs!.join(', ')}${
              props.session.preview ? ` — ${props.session.preview}` : ''
            }`}
          >
            <I.note class="w-3 h-3 text-white/40 shrink-0" />
            <span class="truncate">
              {props.session.fileRefs![0]}
              {props.session.fileRefs!.length > 1 ? ` +${props.session.fileRefs!.length - 1}` : ''}
            </span>
            <Show when={props.session.messageCount}>
              <span class="text-white/25 shrink-0">• {props.session.messageCount}</span>
            </Show>
          </div>
        </Show>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            props.onDelete()
          }}
          class="opacity-0 group-hover:opacity-40 hover:!opacity-100 p-1 hover:bg-white/10 rounded transition-all text-white/50 hover:text-red-400 cursor-pointer shrink-0"
          title="Delete conversation"
        >
          <I.trash class="w-3 h-3" />
        </button>
      </div>
    </>
  )
}

/* ── Real Git Tasks Commit Row ── */

export function createChatActivity(searchQuery: Accessor<string>) {
  const [expandedSettledId, setExpandedSettledId] = createSignal<string | null>(null)

  const filteredSessions = createMemo((): ChatSessionSummary[] => {
    const q = searchQuery().trim().toLowerCase()
    const list = chatSessions()
    if (!q) return list
    return list.filter((s) => {
      return (
        (s.title && s.title.toLowerCase().includes(q)) ||
        (s.modelName && s.modelName.toLowerCase().includes(q)) ||
        (s.provider && s.provider.toLowerCase().includes(q)) ||
        (s.preview && s.preview.toLowerCase().includes(q)) ||
        (s.fileRefs && s.fileRefs.some((f) => f.toLowerCase().includes(q)))
      )
    })
  })

  const activeSessions = createMemo((): ChatSessionSummary[] => filteredSessions().slice(0, 5))
  const settledSessions = createMemo((): ChatSessionSummary[] => filteredSessions().slice(5))

  const ChatActivity: Component = () => (
    <>
      <div class="px-1 flex flex-col gap-2">
        <Show when={filteredSessions().length === 0}>
          <div class="py-8 px-4 text-center flex flex-col items-center gap-2 text-white/35 select-none">
            <I.ghost class="w-7 h-7 opacity-40 mb-1 text-[var(--accent)]" />
            <p class="text-[13px] font-medium text-white/60">No conversations yet</p>
            <p class="text-[11.5px] leading-relaxed max-w-[200px]">
              Start a new conversation to brainstorm, draft, or code.
            </p>
            <DitherButton
              variant="filled"
              color="ink"
              size="sm"
              onClick={startSidebarChat}
              class="mt-2 gap-1.5"
            >
              <I.newNote class="w-3.5 h-3.5" />
              <span>Start Chat</span>
            </DitherButton>
          </div>
        </Show>

        <For each={activeSessions()}>
          {(session: ChatSessionSummary) => {
            const isActive = () => currentChatSessionId() === session.id

            return (
              <div
                onClick={() => {
                  setCurrentChatSessionId(session.id)
                  setCurrentView('chat')
                }}
                class={`group relative w-full cursor-pointer overflow-hidden rounded-md transition-colors px-2.5 py-2 flex flex-col gap-1 ${
                  isActive() ? 'bg-white/[0.08]' : 'bg-transparent hover:bg-white/[0.04]'
                }`}
              >
                <SessionCardBody
                  session={session}
                  showActiveBadge={isActive()}
                  brightTitle={isActive()}
                  onDelete={() => deleteSession(session.id)}
                />
              </div>
            )
          }}
        </For>
      </div>
      <Show when={settledSessions().length > 0}>
        <div class="mt-6 mb-3 flex items-center gap-3 px-2">
          <span class="text-[12px] font-semibold text-white/30 tracking-wide">Settled</span>
          <div class="h-[1px] flex-1 bg-white/[0.04]" />
        </div>
        <div class="px-1 flex flex-col gap-[2px]">
          <For each={settledSessions()}>
            {(session: ChatSessionSummary) => {
              const isActive = () => currentChatSessionId() === session.id
              const expanded = () => expandedSettledId() === session.id
              const openSession = (): void => {
                setCurrentChatSessionId(session.id)
                setCurrentView('chat')
              }

              return (
                <div
                  onClick={openSession}
                  onMouseEnter={() => setExpandedSettledId(session.id)}
                  onMouseLeave={() => setExpandedSettledId((id) => (id === session.id ? null : id))}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      openSession()
                    } else if (e.key === 'Delete' || e.key === 'Backspace') {
                      e.preventDefault()
                      deleteSession(session.id)
                    }
                  }}
                  class={`group rounded-md cursor-pointer outline-none transition-colors focus-visible:bg-white/[0.05] ${
                    expanded() || isActive()
                      ? 'bg-[#0c0c0c] text-white/90'
                      : 'hover:bg-white/[0.03] text-white/50 hover:text-white/80'
                  }`}
                >
                  <div class="flex items-center gap-2.5 px-2.5 h-9">
                    <img
                      src={`${ICON_BASE}/${session.modelIcon}.svg`}
                      alt=""
                      class="w-3.5 h-3.5 shrink-0 opacity-70"
                      style={{
                        filter: !session.modelIcon.endsWith('-color')
                          ? 'invert(1) brightness(2)'
                          : 'none'
                      }}
                      onError={(e) => {
                        e.currentTarget.src = `${ICON_BASE}/opencode.svg`
                        e.currentTarget.style.filter = 'invert(1) brightness(2)'
                      }}
                    />
                    <span
                      title={`${session.title || 'Conversation'}${
                        session.fileRefs?.length ? ` — ${session.fileRefs.join(', ')}` : ''
                      }${session.preview ? ` — ${session.preview}` : ''}`}
                      class={`flex-1 text-[13px] truncate font-medium transition-colors ${
                        expanded() || isActive() ? 'text-white/90' : ''
                      }`}
                    >
                      {session.title || 'Conversation'}
                    </span>
                    <Show when={session.fileRefs && session.fileRefs.length > 0}>
                      <span
                        title={session.fileRefs!.join(', ')}
                        class="flex items-center gap-1 text-[10.5px] font-mono text-white/30 shrink-0 max-w-[90px]"
                      >
                        <I.note class="w-2.5 h-2.5 shrink-0 opacity-70" />
                        <span class="truncate">{session.fileRefs![0]}</span>
                      </span>
                    </Show>
                    <span
                      class={`text-[11.5px] font-medium w-7 text-right transition-colors ${
                        isActive()
                          ? 'text-[var(--accent)]'
                          : 'text-white/30 group-hover:text-white/50'
                      }`}
                    >
                      {timeAgo(Math.floor(session.updatedAt / 1000))}
                    </span>
                  </div>
                  <div
                    class="grid transition-[grid-template-rows] duration-300 ease-out"
                    style={{
                      'grid-template-rows': expanded() ? '1fr' : '0fr'
                    }}
                  >
                    <div class="overflow-hidden">
                      <div
                        class={`px-2.5 pb-2 flex flex-col gap-1 transition-opacity duration-200 ${
                          expanded() ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        <SessionCardBody
                          session={session}
                          showActiveBadge={isActive()}
                          brightTitle={isActive()}
                          onDelete={() => deleteSession(session.id)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            }}
          </For>
        </div>
      </Show>
    </>
  )

  return { ChatActivity, filteredSessions }
}
