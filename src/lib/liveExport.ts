/**
 * Live strip → video export (Phase 20, D-034): records the live strip as an
 * MP4 (WebM fallback) by drawing the shared renderer's still frame and the
 * playing clips onto a canvas captured with MediaRecorder. Chosen over GIF:
 * no encoder dependency, far smaller files, universal playback.
 */
import { computeGeometry, renderComposition, type RenderImage } from '../render/compose'
import { getTemplate } from '../data/templates'
import { getFrame } from '../data/frames'
import { roundRectPath } from '../render/frameRender'
import { pickLiveMime, liveClipExt } from './liveclip'
import type { Composition, LiveStripData, Rect } from '../types'

type ClipInfo = { url: string; mirrored: boolean }

export async function renderLiveStripVideo(
  liveStrip: LiveStripData,
  clips: Record<string, ClipInfo>,
  images: Record<string, RenderImage | undefined>
): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> {
  const mime = pickLiveMime()
  if (!mime) throw new Error('Video recording is not supported in this browser.')

  const template = getTemplate(liveStrip.templateId)
  const frame = getFrame(liveStrip.frameId)
  const W = Math.min(720, template.canvas.w * 2)
  const H = Math.round((W * template.canvas.h) / template.canvas.w)

  /* the exact same composition the player/still strip renders */
  const comp: Composition = {
    templateId: liveStrip.templateId,
    frameId: liveStrip.frameId,
    frameColor: liveStrip.frameColor ?? undefined,
    text: liveStrip.text,
    slots: liveStrip.slots.map((id) => ({
      photoId: id || null,
      filterId: null,
      intensity: 1,
      crop: { zoom: 1, x: 0, y: 0 },
      flip: false,
    })),
    stickers: [],
  }

  /* base: the still strip render (frame + decor + text) */
  const base = document.createElement('canvas')
  renderComposition(base, comp, images, W)
  const geo = computeGeometry(liveStrip.templateId, liveStrip.frameId, W, H)
  const radiusFor = (rect: Rect) => (frame.slotRadius ?? 0) * Math.min(rect.w, rect.h)

  /* hidden video elements for every slot that has a clip */
  const vids: Array<{ el: HTMLVideoElement; rect: Rect; mirrored: boolean }> = []
  await Promise.all(
    liveStrip.slots.map(async (id, i) => {
      const clip = id ? clips[id] : undefined
      const rect = geo.slotRects[i]
      if (!clip || !rect) return
      const el = document.createElement('video')
      el.src = clip.url
      el.muted = true
      el.loop = true
      el.playsInline = true
      el.preload = 'auto'
      await new Promise<void>((resolve) => {
        if (el.readyState >= 2) return resolve()
        el.onloadeddata = () => resolve()
        el.onerror = () => resolve()
        window.setTimeout(resolve, 4000)
      })
      try {
        await el.play()
      } catch {
        /* muted autoplay is allowed everywhere; ignore */
      }
      vids.push({ el, rect, mirrored: clip.mirrored })
    })
  )
  if (vids.length === 0) throw new Error('This live strip has no playable clips.')

  /* record one full loop of the longest clip */
  const durations = vids.map((v) => (Number.isFinite(v.el.duration) && v.el.duration > 0 ? v.el.duration : 4.2))
  const duration = Math.min(8, Math.max(3.5, ...durations))

  const out = document.createElement('canvas')
  out.width = W
  out.height = H
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable.')

  const stream = out.captureStream(30)
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 })
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve()
  })

  recorder.start()
  const t0 = performance.now()
  await new Promise<void>((resolve) => {
    const draw = () => {
      const elapsed = (performance.now() - t0) / 1000
      ctx.drawImage(base, 0, 0)
      for (const v of vids) {
        const { rect } = v
        ctx.save()
        roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, radiusFor(rect))
        ctx.clip()
        const vw = v.el.videoWidth || rect.w
        const vh = v.el.videoHeight || rect.h
        const cover = Math.max(rect.w / vw, rect.h / vh)
        const dw = vw * cover
        const dh = vh * cover
        ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2)
        if (v.mirrored) ctx.scale(-1, 1)
        ctx.drawImage(v.el, -dw / 2, -dh / 2, dw, dh)
        ctx.restore()
      }
      if (elapsed < duration) requestAnimationFrame(draw)
      else resolve()
    }
    requestAnimationFrame(draw)
  })
  recorder.stop()
  await stopped
  for (const v of vids) {
    v.el.pause()
    v.el.removeAttribute('src')
  }

  const blob = new Blob(chunks, { type: recorder.mimeType || mime })
  if (blob.size === 0) throw new Error('Video encoding failed.')
  return { blob, ext: liveClipExt(recorder.mimeType || mime) }
}
