/**
 * Minimal GIF89a encoder (single frame) — no dependencies.
 *
 * Images with ≤256 distinct opaque colours (≤255 when any pixel is
 * transparent) are written with an exact palette, i.e. losslessly. Anything
 * richer is reduced with median-cut over a 15-bit histogram, optionally with
 * Floyd–Steinberg dithering, then LZW-compressed.
 */

const ALPHA_CUTOFF = 128

export interface GifOptions {
  dither: boolean
}

export interface GifResult {
  bytes: Uint8Array
  /** true when every opaque pixel kept its exact colour */
  exact: boolean
  colors: number
}

export function encodeGif(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  opts: GifOptions
): GifResult {
  const n = width * height

  // 1. Exact palette when the image is simple enough.
  let hasAlpha = false
  let exactOk = true
  const exactMap = new Map<number, number>()
  for (let i = 0; i < n; i++) {
    const o = i * 4
    if (rgba[o + 3] < ALPHA_CUTOFF) {
      hasAlpha = true
      continue
    }
    if (!exactOk) continue
    const key = (rgba[o] << 16) | (rgba[o + 1] << 8) | rgba[o + 2]
    if (!exactMap.has(key)) {
      if (exactMap.size >= 256) exactOk = false
      else exactMap.set(key, exactMap.size)
    }
  }
  const maxColors = hasAlpha ? 255 : 256
  if (exactMap.size > maxColors) exactOk = false

  const palette = new Uint8Array(256 * 3)
  const indices = new Uint8Array(n)
  const transparent = hasAlpha ? 255 : -1
  let colors: number

  if (exactOk) {
    for (const [key, idx] of exactMap) {
      palette[idx * 3] = key >> 16
      palette[idx * 3 + 1] = (key >> 8) & 255
      palette[idx * 3 + 2] = key & 255
    }
    for (let i = 0; i < n; i++) {
      const o = i * 4
      indices[i] =
        rgba[o + 3] < ALPHA_CUTOFF
          ? 255
          : exactMap.get((rgba[o] << 16) | (rgba[o + 1] << 8) | rgba[o + 2])!
    }
    colors = exactMap.size
  } else {
    colors = quantize(rgba, n, maxColors, palette)
    mapPixels(rgba, width, height, palette, colors, indices, opts.dither)
  }

  return { bytes: writeGif(width, height, palette, indices, transparent), exact: exactOk, colors }
}

// ── Median cut ──────────────────────────────────────────────────────────────

/** Fills `palette` and returns the number of colours used. */
function quantize(rgba: Uint8ClampedArray, n: number, max: number, palette: Uint8Array): number {
  const count = new Uint32Array(32768)
  const sumR = new Float64Array(32768)
  const sumG = new Float64Array(32768)
  const sumB = new Float64Array(32768)
  for (let i = 0; i < n; i++) {
    const o = i * 4
    if (rgba[o + 3] < ALPHA_CUTOFF) continue
    const r = rgba[o]
    const g = rgba[o + 1]
    const b = rgba[o + 2]
    const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
    count[k]++
    sumR[k] += r
    sumG[k] += g
    sumB[k] += b
  }
  const bins: number[] = []
  for (let k = 0; k < 32768; k++) if (count[k]) bins.push(k)
  if (bins.length === 0) return 1

  const chan = (k: number, c: number): number =>
    c === 0 ? k >> 10 : c === 1 ? (k >> 5) & 31 : k & 31
  interface Box {
    bins: number[]
    weight: number
    spread: number
    axis: number
  }
  const measure = (list: number[]): Box => {
    let weight = 0
    const lo = [31, 31, 31]
    const hi = [0, 0, 0]
    for (const k of list) {
      weight += count[k]
      for (let c = 0; c < 3; c++) {
        const v = chan(k, c)
        if (v < lo[c]) lo[c] = v
        if (v > hi[c]) hi[c] = v
      }
    }
    // Perceptual-ish weighting: green matters most, blue least.
    const spans = [(hi[0] - lo[0]) * 1.0, (hi[1] - lo[1]) * 1.2, (hi[2] - lo[2]) * 0.8]
    const axis = spans[0] >= spans[1] && spans[0] >= spans[2] ? 0 : spans[1] >= spans[2] ? 1 : 2
    return { bins: list, weight, spread: spans[axis], axis }
  }

  const boxes: Box[] = [measure(bins)]
  while (boxes.length < max) {
    // Split the box with the most (spread × population) — big, busy regions first.
    let best = -1
    let bestScore = 0
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i]
      if (b.bins.length < 2) continue
      const score = b.spread * Math.sqrt(b.weight)
      if (score > bestScore) {
        bestScore = score
        best = i
      }
    }
    if (best < 0) break
    const box = boxes[best]
    const sorted = box.bins.slice().sort((a, b) => chan(a, box.axis) - chan(b, box.axis))
    let acc = 0
    let cut = 1
    for (let i = 0; i < sorted.length - 1; i++) {
      acc += count[sorted[i]]
      if (acc >= box.weight / 2) {
        cut = i + 1
        break
      }
    }
    boxes.splice(best, 1, measure(sorted.slice(0, cut)), measure(sorted.slice(cut)))
  }

  boxes.forEach((box, i) => {
    let w = 0
    let r = 0
    let g = 0
    let b = 0
    for (const k of box.bins) {
      w += count[k]
      r += sumR[k]
      g += sumG[k]
      b += sumB[k]
    }
    palette[i * 3] = Math.round(r / w)
    palette[i * 3 + 1] = Math.round(g / w)
    palette[i * 3 + 2] = Math.round(b / w)
  })
  return boxes.length
}

function mapPixels(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  palette: Uint8Array,
  colors: number,
  out: Uint8Array,
  dither: boolean
): void {
  const cache = new Int16Array(32768).fill(-1)
  const nearest = (r: number, g: number, b: number): number => {
    const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
    const hit = cache[k]
    if (hit >= 0) return hit
    let best = 0
    let bestD = Infinity
    for (let i = 0; i < colors; i++) {
      const dr = palette[i * 3] - r
      const dg = palette[i * 3 + 1] - g
      const db = palette[i * 3 + 2] - b
      const d = dr * dr * 2 + dg * dg * 4 + db * db * 3
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    cache[k] = best
    return best
  }

  // Error rows for Floyd–Steinberg (current and next), RGB interleaved.
  const errA = new Float32Array((width + 2) * 3)
  const errB = new Float32Array((width + 2) * 3)
  let cur = errA
  let nxt = errB
  const clamp = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v)

  for (let y = 0; y < height; y++) {
    nxt.fill(0)
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const o = i * 4
      if (rgba[o + 3] < ALPHA_CUTOFF) {
        out[i] = 255
        continue
      }
      const e = (x + 1) * 3
      const r = dither ? clamp(rgba[o] + cur[e]) : rgba[o]
      const g = dither ? clamp(rgba[o + 1] + cur[e + 1]) : rgba[o + 1]
      const b = dither ? clamp(rgba[o + 2] + cur[e + 2]) : rgba[o + 2]
      const idx = nearest(r | 0, g | 0, b | 0)
      out[i] = idx
      if (!dither) continue
      const er = r - palette[idx * 3]
      const eg = g - palette[idx * 3 + 1]
      const eb = b - palette[idx * 3 + 2]
      cur[e + 3] += er * (7 / 16)
      cur[e + 4] += eg * (7 / 16)
      cur[e + 5] += eb * (7 / 16)
      nxt[e - 3] += er * (3 / 16)
      nxt[e - 2] += eg * (3 / 16)
      nxt[e - 1] += eb * (3 / 16)
      nxt[e] += er * (5 / 16)
      nxt[e + 1] += eg * (5 / 16)
      nxt[e + 2] += eb * (5 / 16)
      nxt[e + 3] += er * (1 / 16)
      nxt[e + 4] += eg * (1 / 16)
      nxt[e + 5] += eb * (1 / 16)
    }
    const t = cur
    cur = nxt
    nxt = t
  }
}

// ── Container + LZW ─────────────────────────────────────────────────────────

class ByteWriter {
  buf = new Uint8Array(1 << 16)
  len = 0
  byte(v: number): void {
    if (this.len === this.buf.length) {
      const next = new Uint8Array(this.buf.length * 2)
      next.set(this.buf)
      this.buf = next
    }
    this.buf[this.len++] = v
  }
  u16(v: number): void {
    this.byte(v & 255)
    this.byte((v >> 8) & 255)
  }
  bytes(a: ArrayLike<number>): void {
    for (let i = 0; i < a.length; i++) this.byte(a[i])
  }
  result(): Uint8Array {
    return this.buf.slice(0, this.len)
  }
}

function writeGif(
  width: number,
  height: number,
  palette: Uint8Array,
  indices: Uint8Array,
  transparent: number
): Uint8Array {
  const w = new ByteWriter()
  w.bytes([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]) // GIF89a
  w.u16(width)
  w.u16(height)
  w.byte(0xf7) // global table, 8-bit colour resolution, 256 entries
  w.byte(0)
  w.byte(0)
  w.bytes(palette)
  if (transparent >= 0) {
    w.bytes([0x21, 0xf9, 0x04, 0x01, 0, 0, transparent, 0])
  }
  w.byte(0x2c)
  w.u16(0)
  w.u16(0)
  w.u16(width)
  w.u16(height)
  w.byte(0)
  w.byte(8) // LZW minimum code size
  lzw(indices, w)
  w.byte(0)
  w.byte(0x3b)
  return w.result()
}

/** GIF LZW, emitted straight into 255-byte data sub-blocks. */
function lzw(indices: Uint8Array, w: ByteWriter): void {
  const MIN = 8
  const clear = 1 << MIN
  const eoi = clear + 1
  let size = MIN + 1
  let next = eoi + 1
  let table = new Map<number, number>()

  const block = new Uint8Array(255)
  let blockLen = 0
  let acc = 0
  let bits = 0
  const flushByte = (b: number): void => {
    block[blockLen++] = b
    if (blockLen === 255) {
      w.byte(255)
      w.bytes(block)
      blockLen = 0
    }
  }
  const emit = (code: number): void => {
    acc |= code << bits
    bits += size
    while (bits >= 8) {
      flushByte(acc & 255)
      acc >>>= 8
      bits -= 8
    }
  }

  emit(clear)
  if (indices.length === 0) {
    emit(eoi)
  } else {
    let prefix = indices[0]
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i]
      const key = (prefix << 8) | k
      const hit = table.get(key)
      if (hit !== undefined) {
        prefix = hit
        continue
      }
      emit(prefix)
      if (next === 4096) {
        emit(clear)
        table = new Map()
        next = eoi + 1
        size = MIN + 1
      } else {
        if (next >= 1 << size) size++
        table.set(key, next++)
      }
      prefix = k
    }
    emit(prefix)
    emit(eoi)
  }
  if (bits > 0) flushByte(acc & 255)
  if (blockLen > 0) {
    w.byte(blockLen)
    w.bytes(block.subarray(0, blockLen))
  }
}
