import { createSignal } from 'solid-js'

/**
 * Mount points the running system depends on. Unmounting or ejecting any of
 * these (or whatever holds the user's home) would pull the OS or the session
 * out from under itself, so the UI never offers it. Keep this as the single
 * source of truth; the eventual unmount IPC must check it too.
 */
const SYSTEM_MOUNTS = new Set(['/', '/boot', '/boot/efi', '/efi', '/usr', '/var', '/opt', '/srv'])

const [home, setHome] = createSignal('')
void window.api
  ?.getUserPlaces?.()
  .then((u: { home?: string }) => setHome(u?.home ?? ''))
  .catch(() => {})

export type ProtectedReason = 'system' | 'home' | null

/** Why a mount point must not be unmounted/ejected, or null if it's safe to offer. */
export const protectedMount = (mountPoint: string | undefined | null): ProtectedReason => {
  if (!mountPoint) return null
  const mp = mountPoint.length > 1 ? mountPoint.replace(/\/+$/, '') : mountPoint
  if (SYSTEM_MOUNTS.has(mp) || mp.startsWith('/boot/')) return 'system'
  const h = home()
  if (h && (h === mp || h.startsWith(mp === '/' ? '/' : mp + '/'))) return 'home'
  return null
}
