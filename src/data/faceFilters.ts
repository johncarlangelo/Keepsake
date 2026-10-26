/**
 * Face filter registry (Phase 21, D-036) — Snap-style props drawn procedurally,
 * anchored to MediaPipe Face Landmarker points. Filters draw in PIXEL space
 * (points arrive pre-scaled to the target canvas) so circles stay circular and
 * angles stay true at any resolution. Every filter is bake-safe: pure function
 * of the face + time, no state — the same call decorates the live preview AND
 * the saved capture.
 *
 * Landmark indices follow the canonical MediaPipe FaceMesh topology:
 *   eyes 33/133/159/145 (A) and 263/362/386/374 (B), nose tip 1, bridge 168,
 *   forehead 10, chin 152, temples 127/356, sides 234/454, cheeks 50/280,
 *   mouth corners 61/291, lips 13/14.
 */

export interface FacePoint {
  x: number
  y: number
}

/** Pre-computed view of one detected face, ready for drawing. */
export interface FaceFrame {
  /** landmark points in the pixel space of the target canvas */
  pts: FacePoint[]
  /** blendshape scores by name (jawOpen, mouthSmileLeft, …) */
  bs: Record<string, number>
}

export interface FaceDrawEnv {
  /** ms timestamp — animated filters may use it; bake-safe either way */
  time: number
}

export interface FaceFilterDef {
  id: string
  name: string
  /** one-line description for FILTERS.md and the picker hint */
  description: string
  /** what anchors/activates it, for the docs */
  mechanic: string
  draw: (ctx: CanvasRenderingContext2D, face: FaceFrame, env: FaceDrawEnv) => void
}

/* ---------- landmark helpers (pixel space) ---------- */

const P = (f: FaceFrame, i: number): FacePoint => f.pts[i] ?? { x: 0, y: 0 }
const dist = (a: FacePoint, b: FacePoint): number => Math.hypot(a.x - b.x, a.y - b.y)
const mid = (a: FacePoint, b: FacePoint): FacePoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const angle = (a: FacePoint, b: FacePoint): number => Math.atan2(b.y - a.y, b.x - a.x)

function eyeCenter(f: FaceFrame, which: 'A' | 'B'): FacePoint {
  const [outer, inner, upper, lower] = which === 'A' ? [33, 133, 159, 145] : [263, 362, 386, 374]
  return { x: (P(f, outer).x + P(f, inner).x) / 2, y: (P(f, upper).y + P(f, lower).y) / 2 }
}

function faceWidth(f: FaceFrame): number {
  return dist(P(f, 234), P(f, 454)) || dist(P(f, 127), P(f, 356)) || 100
}

function heartPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const s = size / 16
  ctx.beginPath()
  ctx.moveTo(cx, cy + 6 * s)
  ctx.bezierCurveTo(cx - 10 * s, cy - 2 * s, cx - 6 * s, cy - 9 * s, cx, cy - 3.5 * s)
  ctx.bezierCurveTo(cx + 6 * s, cy - 9 * s, cx + 10 * s, cy - 2 * s, cx, cy + 6 * s)
  ctx.closePath()
}

function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const rad = i % 2 === 0 ? r : r * 0.38
    const a = (i * Math.PI) / 4 - Math.PI / 2
    const x = cx + Math.cos(a) * rad
    const y = cy + Math.sin(a) * rad
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

/* ---------- the filters ---------- */

/** dark rounded lenses sized to each eye + bridge + temples, tilted with the head */
function drawSunglasses(ctx: CanvasRenderingContext2D, f: FaceFrame): void {
  const a = eyeCenter(f, 'A')
  const b = eyeCenter(f, 'B')
  const tilt = angle(a, b)
  const eyeW = dist(P(f, 33), P(f, 133)) || faceWidth(f) * 0.22
  const interEye = dist(a, b)
  const lensR = eyeW * 0.78
  ctx.save()
  ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2)
  ctx.rotate(tilt)
  // temples
  ctx.strokeStyle = 'rgba(20,20,20,0.9)'
  ctx.lineWidth = lensR * 0.18
  ctx.beginPath()
  ctx.moveTo(-interEye / 2 - lensR, 0)
  ctx.lineTo(-interEye / 2 - lensR - eyeW * 0.7, -lensR * 0.15)
  ctx.moveTo(interEye / 2 + lensR, 0)
  ctx.lineTo(interEye / 2 + lensR + eyeW * 0.7, -lensR * 0.15)
  ctx.stroke()
  // bridge
  ctx.beginPath()
  ctx.moveTo(-interEye / 2 + lensR * 0.6, -lensR * 0.1)
  ctx.quadraticCurveTo(0, -lensR * 0.5, interEye / 2 - lensR * 0.6, -lensR * 0.1)
  ctx.stroke()
  // lenses
  for (const dx of [-interEye / 2, interEye / 2]) {
    ctx.save()
    ctx.translate(dx, 0)
    ctx.beginPath()
    const w = lensR * 1.7
    const h = lensR * 1.2
    const r = lensR * 0.45
    ctx.roundRect(-w / 2, -h / 2, w, h, r)
    ctx.fillStyle = 'rgba(16,16,18,0.88)'
    ctx.fill()
    // glint
    ctx.beginPath()
    ctx.ellipse(-w * 0.18, -h * 0.22, w * 0.16, h * 0.1, -0.5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

/** red hearts over both eyes, tilted with the head */
function drawHeartEyes(ctx: CanvasRenderingContext2D, f: FaceFrame): void {
  const a = eyeCenter(f, 'A')
  const b = eyeCenter(f, 'B')
  const tilt = angle(a, b)
  const size = (dist(P(f, 33), P(f, 133)) || faceWidth(f) * 0.2) * 1.5
  ctx.save()
  ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2)
  ctx.rotate(tilt)
  for (const dx of [-dist(a, b) / 2, dist(a, b) / 2]) {
    ctx.save()
    ctx.translate(dx, 0)
    heartPath(ctx, 0, 0, size)
    ctx.fillStyle = '#ef4565'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(-size * 0.14, -size * 0.16, size * 0.07, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

/** soft rosy glow on both cheeks */
function drawBlush(ctx: CanvasRenderingContext2D, f: FaceFrame): void {
  const r = faceWidth(f) * 0.1
  for (const idx of [50, 280]) {
    const c = P(f, idx)
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r)
    g.addColorStop(0, 'rgba(238,124,136,0.4)')
    g.addColorStop(1, 'rgba(238,124,136,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** striped party cone on the forehead, pom and all, tilted with the head */
function drawPartyHat(ctx: CanvasRenderingContext2D, f: FaceFrame): void {
  const fw = faceWidth(f)
  const tilt = angle(eyeCenter(f, 'A'), eyeCenter(f, 'B'))
  const base = P(f, 10)
  const bw = fw * 0.62
  const h = fw * 0.72
  ctx.save()
  ctx.translate(base.x, base.y - fw * 0.02)
  ctx.rotate(tilt * 0.8)
  ctx.beginPath()
  ctx.moveTo(-bw / 2, 0)
  ctx.lineTo(0, -h)
  ctx.lineTo(bw / 2, 0)
  ctx.closePath()
  ctx.fillStyle = '#e2574d'
  ctx.fill()
  // stripes: clip to the cone, draw slanted bands
  ctx.save()
  ctx.clip()
  ctx.fillStyle = '#f4e3dc'
  for (let i = 0; i < 3; i++) {
    const y = -h * (0.24 + i * 0.26)
    ctx.beginPath()
    ctx.moveTo(-bw / 2 - 4, y)
    ctx.lineTo(bw / 2 + 4, y - h * 0.1)
    ctx.lineTo(bw / 2 + 4, y - h * 0.1 - h * 0.1)
    ctx.lineTo(-bw / 2 - 4, y - h * 0.1)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  // pom
  ctx.beginPath()
  ctx.arc(0, -h - fw * 0.015, fw * 0.05, 0, Math.PI * 2)
  ctx.fillStyle = '#f4e3dc'
  ctx.fill()
  ctx.restore()
}

/** floppy ears + button nose; the tongue comes out when you open your mouth */
function drawDog(ctx: CanvasRenderingContext2D, f: FaceFrame): void {
  const fw = faceWidth(f)
  const left = P(f, 127)
  const right = P(f, 356)
  // ears
  for (const [anchor, dir] of [[left, -1], [right, 1]] as const) {
    ctx.save()
    ctx.translate(anchor.x, anchor.y)
    ctx.rotate(dir * 0.25)
    ctx.beginPath()
    ctx.moveTo(0, -fw * 0.02)
    ctx.quadraticCurveTo(dir * fw * 0.1, -fw * 0.34, dir * fw * 0.2, -fw * 0.44)
    ctx.quadraticCurveTo(dir * fw * 0.26, -fw * 0.2, dir * fw * 0.06, fw * 0.02)
    ctx.closePath()
    ctx.fillStyle = '#8a5a34'
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(dir * fw * 0.02, -fw * 0.06)
    ctx.quadraticCurveTo(dir * fw * 0.09, -fw * 0.28, dir * fw * 0.17, -fw * 0.38)
    ctx.quadraticCurveTo(dir * fw * 0.2, -fw * 0.2, dir * fw * 0.04, 0)
    ctx.closePath()
    ctx.fillStyle = '#e8a8a8'
    ctx.fill()
    ctx.restore()
  }
  // button nose at the bridge/tip
  const nose = P(f, 1)
  ctx.beginPath()
  ctx.ellipse(nose.x, nose.y - fw * 0.012, fw * 0.075, fw * 0.058, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#3a2a20'
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(nose.x - fw * 0.02, nose.y - fw * 0.026, fw * 0.018, fw * 0.01, -0.4, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.fill()
  // tongue on jawOpen
  const open = f.bs['jawOpen'] ?? 0
  if (open > 0.3) {
    const mouth = mid(P(f, 13), P(f, 14))
    const th = fw * (0.05 + open * 0.13)
    ctx.beginPath()
    ctx.ellipse(mouth.x, mouth.y + fw * 0.03 + th / 2, fw * 0.075, th, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#e86a8a'
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(mouth.x, mouth.y + fw * 0.03)
    ctx.lineTo(mouth.x, mouth.y + fw * 0.03 + th * 0.9)
    ctx.strokeStyle = '#d1546e'
    ctx.lineWidth = fw * 0.008
    ctx.stroke()
  }
}

/** golden sparkles burst around the eyes when you smile */
function drawSmileSparkles(ctx: CanvasRenderingContext2D, f: FaceFrame, env: FaceDrawEnv): void {
  const smile = ((f.bs['mouthSmileLeft'] ?? 0) + (f.bs['mouthSmileRight'] ?? 0)) / 2
  if (smile < 0.3) return
  const fw = faceWidth(f)
  const a = eyeCenter(f, 'A')
  const b = eyeCenter(f, 'B')
  const mouthL = P(f, 61)
  const mouthR = P(f, 291)
  const seeds: Array<{ at: FacePoint; phase: number }> = [
    { at: a, phase: 0 },
    { at: b, phase: 1.3 },
    { at: mouthL, phase: 2.1 },
    { at: mouthR, phase: 3.6 },
    { at: mid(a, mid(a, mouthL)), phase: 4.4 },
    { at: mid(b, mid(b, mouthR)), phase: 5.2 },
  ]
  ctx.fillStyle = '#f2c14e'
  seeds.forEach((s, i) => {
    const twinkle = 0.65 + 0.35 * Math.sin(env.time / 170 + s.phase)
    const r = fw * (0.018 + 0.014 * smile) * twinkle
    const off = fw * 0.05
    const cx = s.at.x + Math.cos(s.phase * 2.4) * off
    const cy = s.at.y + Math.sin(s.phase * 2.4) * off - off * 0.4
    starPath(ctx, cx, cy, r)
    ctx.fill()
    if (i % 2 === 0) {
      starPath(ctx, cx + off * 0.7, cy - off * 0.6, r * 0.55)
      ctx.fill()
    }
  })
}

/* ---------- registry ---------- */

export const FACE_FILTERS: FaceFilterDef[] = [
  {
    id: 'sunglasses',
    name: 'Sunglasses',
    description: 'Dark lenses sized to your eyes, hinged to your head tilt.',
    mechanic: 'Anchored to the eye corners (33/133/263/362), rotated by the inter-eye angle.',
    draw: drawSunglasses,
  },
  {
    id: 'heart-eyes',
    name: 'Heart Eyes',
    description: 'Hearts where your eyes are — instant main-character energy.',
    mechanic: 'Anchored to the eye centers, rotated with head tilt.',
    draw: drawHeartEyes,
  },
  {
    id: 'blush',
    name: 'Blush',
    description: 'A soft rosy glow on both cheeks.',
    mechanic: 'Radial gradients on the cheek landmarks (50/280), sized to face width.',
    draw: drawBlush,
  },
  {
    id: 'party-hat',
    name: 'Party Hat',
    description: 'A striped cone with a pom, perched on your head.',
    mechanic: 'Anchored to the forehead (10), tilted with the eye line.',
    draw: drawPartyHat,
  },
  {
    id: 'dog',
    name: 'Doggo',
    description: 'Floppy ears and a button nose — and the tongue comes out when you open your mouth.',
    mechanic: 'Ears anchored to the temples (127/356), nose to the tip (1); tongue driven by the jawOpen blendshape.',
    draw: drawDog,
  },
  {
    id: 'smile-sparkles',
    name: 'Smile Sparkles',
    description: 'Golden sparkles burst around your face when you smile.',
    mechanic: 'Blendshape trigger: (mouthSmileLeft + mouthSmileRight) / 2 > 0.3, intensity scales the sparkle size.',
    draw: drawSmileSparkles,
  },
]

export function getFaceFilter(id: string | null | undefined): FaceFilterDef | null {
  return FACE_FILTERS.find((f) => f.id === id) ?? null
}
