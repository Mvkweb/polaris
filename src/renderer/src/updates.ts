import { createSignal } from 'solid-js'
import type { UpdateInfo } from './types'

/** Renderer mirror of the main-process update checker. */
export const [updateInfo, setUpdateInfo] = createSignal<UpdateInfo | null>(null)

let started = false
export const initUpdates = (): (() => void) | undefined => {
  if (started || !window.api?.getUpdateInfo) return
  started = true
  void window.api.getUpdateInfo().then(setUpdateInfo)
  return window.api.onUpdateInfo(setUpdateInfo)
}

export const checkNow = (): void => void window.api?.checkForUpdates?.().then(setUpdateInfo)

export const timeAgo = (ms: number): string => {
  const s = Math.max(0, (Date.now() - ms) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}
