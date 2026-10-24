/**
 * CameraController: getUserMedia lifecycle with explicit permission states.
 * One instance per live session; callers must call stop() (see ARCHITECHTURE §3).
 */

export type CameraState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'no-device'
  | 'busy'
  | 'insecure'

export type Facing = 'user' | 'environment'

type Listener = (state: CameraState) => void

export class CameraController {
  private stream: MediaStream | null = null
  private listeners = new Set<Listener>()
  private state: CameraState = 'idle'
  private facing: Facing = 'user'
  private deviceCount = 1

  get currentState(): CameraState {
    return this.state
  }
  get activeFacing(): Facing {
    return this.facing
  }
  get hasMultipleCameras(): boolean {
    return this.deviceCount > 1
  }
  get streamActive(): boolean {
    return this.stream?.active ?? false
  }

  onState(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private setState(s: CameraState): void {
    this.state = s
    for (const fn of this.listeners) fn(s)
  }

  async start(facing: Facing = this.facing): Promise<void> {
    this.stop()
    this.facing = facing
    if (!window.isSecureContext) {
      this.setState('insecure')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.setState('no-device')
      return
    }
    this.setState('requesting')
    try {
      const count = await this.countCameras()
      this.deviceCount = count
      const constraints: MediaStreamConstraints = {
        audio: false,
        video:
          facing === 'environment'
            ? { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
            : { facingMode: { ideal: 'user' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      this.attachStream(stream)
      this.setState('granted')
    } catch (err) {
      this.setState(this.mapError(err))
    }
  }

  private attachStream(stream: MediaStream): void {
    this.stream = stream
    const track = stream.getVideoTracks()[0]
    track?.addEventListener('ended', () => {
      // Camera grabbed by another app or device lost
      if (this.stream === stream) this.stop()
    })
  }

  private async countCameras(): Promise<number> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices.filter((d) => d.kind === 'videoinput').length || 1
    } catch {
      return 1
    }
  }

  private mapError(err: unknown): CameraState {
    if (err instanceof DOMException) {
      switch (err.name) {
        case 'NotAllowedError':
        case 'SecurityError':
          return 'denied'
        case 'NotFoundError':
        case 'OverconstrainedError':
        case 'DevicesNotFoundError':
          return 'no-device'
        case 'NotReadableError':
        case 'TrackStartError':
          return 'busy'
      }
    }
    return 'busy'
  }

  async switchCamera(): Promise<void> {
    if (!this.stream) return
    await this.start(this.facing === 'user' ? 'environment' : 'user')
  }

  attachToVideo(video: HTMLVideoElement): void {
    video.srcObject = this.stream
    void video.play().catch(() => {
      /* autoplay policy: video is muted+playsInline, play() after gesture normally succeeds */
    })
  }

  /** Capture the current frame of a playing video element to a JPEG blob. */
  async captureStill(video: HTMLVideoElement, mirror: boolean): Promise<{ blob: Blob; width: number; height: number; canvas: HTMLCanvasElement }> {
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) throw new Error('Camera frame not ready')
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable for capture')
    if (mirror) {
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.92))
    if (!blob) throw new Error('Capture encoding failed')
    return { blob, width: w, height: h, canvas }
  }

  stop(): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop()
      this.stream = null
    }
    if (this.state !== 'idle') this.setState('idle')
  }

  /** Release the stream but remember we had permission (for visibilitychange pause). */
  pauseForHidden(): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop()
      this.stream = null
    }
  }
}
