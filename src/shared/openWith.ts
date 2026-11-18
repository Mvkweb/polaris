export interface DesktopApplication {
  id: string
  name: string
  recommended: boolean
}

export interface OpenWithInfo {
  mimeType: string
  defaultAppId: string | null
  canSetDefault: boolean
  apps: DesktopApplication[]
}

export type DefaultOpenResult = 'opened' | 'choose' | 'unsupported'
export type ChosenOpenResult = 'opened' | 'default-not-saved'
