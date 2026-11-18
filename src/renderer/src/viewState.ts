import { createSignal } from 'solid-js'

export const [currentView, setCurrentView] = createSignal<
  'files' | 'search' | 'editor' | 'tasks' | 'settings'
>('files')
export const [previousView, setPreviousView] = createSignal<
  'files' | 'search' | 'editor' | 'tasks'
>('files')
