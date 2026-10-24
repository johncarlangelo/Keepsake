/** Synthesized shutter & countdown sounds via WebAudio. Gesture-gated, failure-silent (D-011). */

let ctx: AudioContext | null = null
let enabled = true

export function setSoundEnabled(on: boolean): void {
  enabled = on
}

function audio(): AudioContext | null {
  if (!enabled) return null
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function blip(freq: number, durationMs: number, gain = 0.08, type: OscillatorType = 'sine'): void {
  const ac = audio()
  if (!ac) return
  try {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(gain, ac.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + durationMs / 1000)
    osc.connect(g).connect(ac.destination)
    osc.start()
    osc.stop(ac.currentTime + durationMs / 1000)
  } catch {
    /* silent degradation by design */
  }
}

function shutterBurst(): void {
  const ac = audio()
  if (!ac) return
  try {
    // click: short high blip + noise tap
    blip(1250, 50, 0.1, 'square')
    const len = Math.floor(ac.sampleRate * 0.04)
    const buffer = ac.createBuffer(1, len, ac.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2)
    }
    const src = ac.createBufferSource()
    src.buffer = buffer
    const g = ac.createGain()
    g.gain.value = 0.12
    src.connect(g).connect(ac.destination)
    src.start()
  } catch {
    /* silent */
  }
}

export const sounds = {
  countdownTick: () => blip(880, 90, 0.06),
  countdownFinal: () => blip(1320, 140, 0.08),
  shutter: shutterBurst,
}
