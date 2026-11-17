import type { EncodeOptions, EncodeResult } from './formats'
import EncoderWorker from './encoder.worker?worker'

/**
 * Main-thread handle to the encoder worker. One worker per open studio;
 * only the newest request resolves (older ones are dropped), so a dragged
 * slider never queues up stale encodes.
 */
export class StudioEncoder {
  private worker = new EncoderWorker()
  private seq = 0
  private pending = new Map<
    number,
    { resolve: (r: EncodeResult) => void; reject: (e: Error) => void }
  >()

  constructor() {
    this.worker.onmessage = (e: MessageEvent) => {
      const msg = e.data as
        | { type: 'done'; id: number; result: EncodeResult }
        | { type: 'error'; id: number; message: string }
      const p = this.pending.get(msg.id)
      if (!p) return
      this.pending.delete(msg.id)
      if (msg.type === 'done') p.resolve(msg.result)
      else p.reject(new Error(msg.message))
    }
  }

  load(bitmap: ImageBitmap): void {
    this.worker.postMessage({ type: 'load', bitmap }, [bitmap])
  }

  encode(opts: EncodeOptions): Promise<EncodeResult> {
    const id = ++this.seq
    // Supersede everything still in flight.
    for (const [old, p] of this.pending) {
      p.reject(new Error('superseded'))
      this.pending.delete(old)
    }
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.worker.postMessage({ type: 'encode', id, opts })
    })
  }

  dispose(): void {
    this.worker.terminate()
    this.pending.clear()
  }
}

/** Whether this Chromium can encode AVIF from a canvas (checked once, cached). */
let avifSupport: Promise<boolean> | null = null
export const canEncodeAvif = (): Promise<boolean> =>
  (avifSupport ??= (async () => {
    try {
      const blob = await new OffscreenCanvas(2, 2).convertToBlob({ type: 'image/avif' })
      return blob.type === 'image/avif'
    } catch {
      return false
    }
  })())
