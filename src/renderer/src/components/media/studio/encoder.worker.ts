/// <reference lib="webworker" />
import { encodeGif } from './gif'
import type { EncodeOptions, EncodeResult } from './formats'

/**
 * Off-main-thread encoder. Holds the decoded source bitmap so repeated
 * re-encodes (live size estimates while you drag the quality slider) cost only
 * a draw + encode, never a re-decode or a re-transfer.
 */

type Inbound =
  { type: 'load'; bitmap: ImageBitmap } | { type: 'encode'; id: number; opts: EncodeOptions }
type Outbound =
  | { type: 'done'; id: number; result: EncodeResult }
  | { type: 'error'; id: number; message: string }

let source: ImageBitmap | null = null

const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

/** Draw the source with scale/rotation/flip applied. Large down-scales step by halves for quality. */
function render(opts: EncodeOptions, square?: number): OffscreenCanvas {
  const src = source!
  const turned = ((opts.rotation % 360) + 360) % 180 !== 0
  let w = Math.max(1, Math.round(src.width * opts.scale))
  let h = Math.max(1, Math.round(src.height * opts.scale))

  if (square) {
    // Icons: fit inside a square, centred, transparent padding.
    const k = square / Math.max(turned ? h : w, turned ? w : h)
    w = Math.max(1, Math.round(w * k))
    h = Math.max(1, Math.round(h * k))
  }

  // Progressive halving toward the final size keeps detail when shrinking a
  // lot (a single bilinear pass aliases).
  let stage: CanvasImageSource = src
  let sw = src.width
  let sh = src.height
  while (sw / 2 >= w && sh / 2 >= h && sw > 2 && sh > 2) {
    const c = new OffscreenCanvas(Math.round(sw / 2), Math.round(sh / 2))
    const cx = c.getContext('2d')!
    cx.imageSmoothingQuality = 'high'
    cx.drawImage(stage, 0, 0, c.width, c.height)
    stage = c
    sw = c.width
    sh = c.height
  }

  const outW = square ?? (turned ? h : w)
  const outH = square ?? (turned ? w : h)
  const canvas = new OffscreenCanvas(outW, outH)
  const ctx = canvas.getContext('2d')!
  if (opts.format === 'jpg') {
    ctx.fillStyle = '#ffffff' // JPEG has no alpha: flatten onto white
    ctx.fillRect(0, 0, outW, outH)
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(outW / 2, outH / 2)
  ctx.rotate((opts.rotation * Math.PI) / 180)
  ctx.scale(opts.flipH ? -1 : 1, opts.flipV ? -1 : 1)
  ctx.drawImage(stage, -w / 2, -h / 2, w, h)
  return canvas
}

const blobBytes = async (blob: Blob): Promise<Uint8Array> =>
  new Uint8Array(await blob.arrayBuffer())

async function encode(opts: EncodeOptions): Promise<EncodeResult> {
  if (!source) throw new Error('No image loaded')

  if (opts.format === 'ico') {
    const max = Math.min(256, Math.max(source.width, source.height) * opts.scale)
    const sizes = ICO_SIZES.filter((s) => s <= Math.max(16, max))
    const pngs: Uint8Array[] = []
    for (const s of sizes) {
      pngs.push(await blobBytes(await render(opts, s).convertToBlob({ type: 'image/png' })))
    }
    return {
      bytes: packIco(sizes, pngs),
      mime: 'image/x-icon',
      width: sizes.at(-1)!,
      height: sizes.at(-1)!,
      note: `${sizes.length} sizes · ${sizes[0]}–${sizes.at(-1)} px`
    }
  }

  const canvas = render(opts)
  const { width, height } = canvas

  if (opts.format === 'gif') {
    const data = canvas.getContext('2d')!.getImageData(0, 0, width, height).data
    const gif = encodeGif(data, width, height, { dither: opts.dither })
    return {
      bytes: gif.bytes,
      mime: 'image/gif',
      width,
      height,
      note: gif.exact ? `Exact · ${gif.colors} colours` : `Reduced to ${gif.colors} colours`
    }
  }

  const mime =
    opts.format === 'png'
      ? 'image/png'
      : opts.format === 'jpg'
        ? 'image/jpeg'
        : opts.format === 'webp'
          ? 'image/webp'
          : 'image/avif'
  // Chromium's WebP encoder switches to its lossless mode at quality 1.
  const quality = opts.format === 'webp' && opts.lossless ? 1 : opts.quality
  const blob = await canvas.convertToBlob({ type: mime, quality })
  if (blob.type !== mime) throw new Error(`${opts.format.toUpperCase()} isn’t supported here`)
  return { bytes: await blobBytes(blob), mime, width, height }
}

/** ICO container with PNG-compressed entries (supported since Windows Vista, everywhere on Linux). */
function packIco(sizes: number[], pngs: Uint8Array[]): Uint8Array {
  const header = 6 + 16 * sizes.length
  const total = header + pngs.reduce((a, p) => a + p.length, 0)
  const out = new Uint8Array(total)
  const dv = new DataView(out.buffer)
  dv.setUint16(2, 1, true) // type: icon
  dv.setUint16(4, sizes.length, true)
  let offset = header
  sizes.forEach((s, i) => {
    const e = 6 + i * 16
    out[e] = s >= 256 ? 0 : s
    out[e + 1] = s >= 256 ? 0 : s
    dv.setUint16(e + 4, 1, true) // planes
    dv.setUint16(e + 6, 32, true) // bpp
    dv.setUint32(e + 8, pngs[i].length, true)
    dv.setUint32(e + 12, offset, true)
    out.set(pngs[i], offset)
    offset += pngs[i].length
  })
  return out
}

self.onmessage = async (e: MessageEvent<Inbound>) => {
  const msg = e.data
  if (msg.type === 'load') {
    source?.close()
    source = msg.bitmap
    return
  }
  try {
    const result = await encode(msg.opts)
    const reply: Outbound = { type: 'done', id: msg.id, result }
    ;(self as unknown as Worker).postMessage(reply, [result.bytes.buffer])
  } catch (err) {
    const reply: Outbound = { type: 'error', id: msg.id, message: (err as Error).message }
    ;(self as unknown as Worker).postMessage(reply)
  }
}
