/**
 * Minimal canvas 2D mock for Vitest/jsdom: records method calls per context.
 * Replaces jest-canvas-mock (which requires a Jest runtime).
 */

export interface RecordedEvent {
  type: string
}

type Ctx = CanvasRenderingContext2D & { __getEvents: () => RecordedEvent[] }

function makeCtx(canvas: HTMLCanvasElement): Ctx {
  const events: RecordedEvent[] = []
  const gradient = { addColorStop: () => undefined }
  const push = (type: string) => events.push({ type })

  const methods: Record<string, () => void> = {
    save: () => push('save'),
    restore: () => push('restore'),
    translate: () => push('translate'),
    rotate: () => push('rotate'),
    scale: () => push('scale'),
    fillRect: () => push('fillRect'),
    clearRect: () => push('clearRect'),
    strokeRect: () => push('strokeRect'),
    drawImage: () => push('drawImage'),
    beginPath: () => push('beginPath'),
    moveTo: () => push('moveTo'),
    lineTo: () => push('lineTo'),
    arc: () => push('arc'),
    arcTo: () => push('arcTo'),
    closePath: () => push('closePath'),
    fill: () => push('fill'),
    stroke: () => push('stroke'),
    clip: () => push('clip'),
    fillText: () => push('fillText'),
    setLineDash: () => push('setLineDash'),
    putImageData: () => push('putImageData'),
  }

  const ctx = {
    canvas,
    // properties (assignable)
    fillStyle: '#000',
    strokeStyle: '#000',
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    lineWidth: 1,
    lineDash: [] as number[],
    shadowColor: 'rgba(0,0,0,0)',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    filter: 'none',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'low',
    direction: 'ltr',
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    lineDashOffset: 0,
    letterSpacing: '0px',
    ...methods,
    createLinearGradient: () => {
      push('createLinearGradient')
      return gradient
    },
    createRadialGradient: () => {
      push('createRadialGradient')
      return gradient
    },
    createPattern: () => {
      push('createPattern')
      return {} as CanvasPattern
    },
    measureText: (text: string) => {
      push('measureText')
      return { width: Math.max(10, String(text).length * 6), actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 } as TextMetrics
    },
    getImageData: (_x: number, _y: number, w: number, h: number) => {
      push('getImageData')
      return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h, colorSpace: 'srgb' } as ImageData
    },
    __getEvents: () => events,
  }
  return ctx as unknown as Ctx
}

export function installCanvasMock(): void {
  const proto = (window as unknown as { HTMLCanvasElement?: { prototype: { getContext?: unknown } } }).HTMLCanvasElement?.prototype
  if (!proto) return
  const cache = new WeakMap<object, Ctx>()
  const original = proto.getContext as unknown as ((type: string) => Ctx | null) | undefined
  ;(proto as unknown as { getContext: (type: string, opts?: unknown) => Ctx | null }).getContext = function (
    this: HTMLCanvasElement,
    type: string
  ): Ctx | null {
    if (type === '2d') {
      let ctx = cache.get(this)
      if (!ctx) {
        ctx = makeCtx(this)
        cache.set(this, ctx)
      }
      return ctx
    }
    return original ? original(type) : null
  }

  if (typeof globalThis.Path2D === 'undefined') {
    class Path2DStub {
      d: string
      constructor(d?: string) {
        this.d = d ?? ''
      }
      addPath() {}
      moveTo() {}
      lineTo() {}
      arc() {}
      closePath() {}
    }
    globalThis.Path2D = Path2DStub as unknown as typeof Path2D
  }
}
