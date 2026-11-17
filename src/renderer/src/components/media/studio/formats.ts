/** Export formats the image studio can write, and their per-format knobs. */

export type ExportFormat = 'png' | 'jpg' | 'webp' | 'avif' | 'gif' | 'ico'

export interface FormatInfo {
  id: ExportFormat
  label: string
  hint: string
  mime: string
  /** quality slider applies */
  lossy: boolean
  /** may carry transparency */
  alpha: boolean
}

export const FORMATS: readonly FormatInfo[] = [
  {
    id: 'png',
    label: 'PNG',
    hint: 'Lossless · transparency',
    mime: 'image/png',
    lossy: false,
    alpha: true
  },
  {
    id: 'webp',
    label: 'WebP',
    hint: 'Small · lossless option',
    mime: 'image/webp',
    lossy: true,
    alpha: true
  },
  {
    id: 'avif',
    label: 'AVIF',
    hint: 'Smallest · modern',
    mime: 'image/avif',
    lossy: true,
    alpha: true
  },
  {
    id: 'jpg',
    label: 'JPEG',
    hint: 'Photos · no transparency',
    mime: 'image/jpeg',
    lossy: true,
    alpha: false
  },
  {
    id: 'gif',
    label: 'GIF',
    hint: '256 colours · exact when ≤256',
    mime: 'image/gif',
    lossy: false,
    alpha: true
  },
  {
    id: 'ico',
    label: 'ICO',
    hint: 'App icon · 16–256 px',
    mime: 'image/x-icon',
    lossy: false,
    alpha: true
  }
]

export const formatInfo = (id: ExportFormat): FormatInfo => FORMATS.find((f) => f.id === id)!

export const SCALES = [0.25, 0.5, 0.75, 1, 1.5, 2, 4] as const

export interface EncodeOptions {
  format: ExportFormat
  /** 0..1, lossy formats only */
  quality: number
  /** WebP only */
  lossless: boolean
  /** GIF only */
  dither: boolean
  scale: number
  /** clockwise degrees, multiple of 90 */
  rotation: number
  flipH: boolean
  flipV: boolean
}

export interface EncodeResult {
  bytes: Uint8Array
  mime: string
  width: number
  height: number
  /** extra facts worth surfacing, e.g. "exact palette · 12 colours" */
  note?: string
}

export const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`
  return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 2 : 1)} MB`
}
