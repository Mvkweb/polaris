export interface DesktopApplication {
  id: string
  name: string
  recommended: boolean
}

export interface OpenWithInfo {
  mimeType: string
  defaultAppId: string | null
  canSetDefault: boolean
  /** a text/code type Polaris's own editor can open */
  editable: boolean
  apps: DesktopApplication[]
}

/** Per-type choice made in the chooser ("Always use…"), overriding the setting. */
export type FileTypeChoice = 'polaris' | 'system'

export interface DefaultOpenOptions {
  /** Settings → Files → Text & code files = Polaris editor */
  preferEditor: boolean
  /** MIME type → where the user chose to always open it */
  choices: Record<string, FileTypeChoice>
}

/** 'editor': a text/code file the user wants in Polaris's own editor. */
export type DefaultOpenResult = 'opened' | 'choose' | 'unsupported' | 'editor'
export type ChosenOpenResult = 'opened' | 'default-not-saved'
