export type StartupFolder = 'last' | 'home' | 'workspace'

export interface StartupLocation {
  dir: string
  reveal: string | null
}
