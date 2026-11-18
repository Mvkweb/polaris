import { createSignal } from 'solid-js'

export const [currentView, setCurrentView] = createSignal<
  'files' | 'search' | 'editor' | 'tasks' | 'chat' | 'settings'
>('files')
export const [previousView, setPreviousView] = createSignal<
  'files' | 'search' | 'editor' | 'tasks' | 'chat'
>('files')
