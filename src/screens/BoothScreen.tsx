/** Booth: landing → explainer → live camera → countdown → review (PRD §5.1/§6.3–6.4). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CameraController } from '../lib/camera'
import { newId, putPhoto, requestPersistence, storageEstimate } from '../lib/db'
import { makeThumb, pooledUrl } from '../lib/images'
import { sounds } from '../lib/sound'
import { TEMPLATES, getTemplate } from '../data/templates'
import { emptyComposition } from '../render/compose'
import { useCapture } from '../state/capture'
import { useEditor } from '../state/editor'
import { useSettings } from '../state/settings'
import { toast } from '../state/toast'
import { navigate } from '../route'
import { Button, Chip, ChipRow, ConfirmDialog, Modal, Sheet } from '../components/ui'
import { Icon } from '../components/icons'
import { TemplatePicker } from '../components/pickers'
import { StripCanvas } from '../components/StripCanvas'
import type { StripTemplate } from '../types'

export function BoothScreen() {
  const { phase, templateId, shots, startSession, pushShot, replaceShot, beginRetake, setPhase, endSession } = useCapture()
  const { settings, update } = useSettings()

  const [showExplainer, setShowExplainer] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [flash, setFlash] = useState(false)
  const [storageNote, setStorageNote] = useState<string | null>(null)
  const [retakeOf, setRetakeOf] = useState<number | null>(null)
  const [camState, setCamState] = useState<string>('idle')
  const [canSwitch, setCanSwitch] = useState(false)

  const controllerRef = useRef<CameraController | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const busyRef = useRef(false)
  const retakeRef = useRef<number | null>(null)
  retakeRef.current = retakeOf

  const template = getTemplate(templateId)
  const previewComp = useMemo(() => emptyComposition(templateId), [templateId])
  const controller = () => {
    if (!controllerRef.current) {
      const ctrl = new CameraController()
      ctrl.onState((s) => setCamState(s))
      controllerRef.current = ctrl
    }
    return controllerRef.current
  }

  const stopCamera = useCallback(() => {
    controllerRef.current?.stop()
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  /* attach stream whenever we're live and the video element is fresh */
  useEffect(() => {
    if (phase !== 'live') return
    const ctrl = controllerRef.current
    if (ctrl?.streamActive && videoRef.current && !videoRef.current.srcObject) {
      ctrl.attachToVideo(videoRef.current)
      setCanSwitch(ctrl.hasMultipleCameras)
    }
  }, [phase, camState])

  /* pause/resume with tab visibility */
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        controllerRef.current?.pauseForHidden()
        if (videoRef.current) videoRef.current.srcObject = null
      } else if (useCapture.getState().phase === 'live') {
        void controller()
          .start(controllerRef.current?.activeFacing ?? 'user')
          .then(() => {
            if (videoRef.current) controllerRef.current?.attachToVideo(videoRef.current)
          })
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  /* storage pre-check for honest warnings */
  useEffect(() => {
    void (async () => {
      try {
        const est = await storageEstimate()
        if (!est) setStorageNote('This browser may not keep photos between visits (storage estimates unavailable).')
        else if (est.quota > 0 && est.quota < 60 * 1024 * 1024)
          setStorageNote(`Heads up: only ~${Math.round(est.quota / 1048576)} MB of storage is available — the Gallery fills up fast.`)
      } catch {
        /* ignore */
      }
    })()
  }, [])

  /* hydrate the session template from the persisted preference */
  useEffect(() => {
    const cap = useCapture.getState()
    if (cap.phase === 'idle' && settings.lastTemplateId !== cap.templateId) cap.setTemplate(settings.lastTemplateId)
  }, [settings.lastTemplateId])

  const selectTemplate = (id: string): void => {
    update({ lastTemplateId: id })
    useCapture.getState().setTemplate(id)
  }

  /* ---------- capture ---------- */

  const doCapture = useCallback(async () => {
    const video = videoRef.current
    const ctrl = controllerRef.current
    if (!video || !ctrl || busyRef.current) return
    busyRef.current = true
    try {
      const { blob, width, height, canvas } = await ctrl.captureStill(video, settings.mirrorSave && ctrl.activeFacing === 'user')
      const thumb = await makeThumb(canvas, 360)
      const id = newId()
      const result = await putPhoto({
        id,
        kind: 'capture',
        createdAt: Date.now(),
        width,
        height,
        bytes: blob.size,
        blob,
        thumb,
      })
      // automatic in-app Gallery save — honest failure reporting (D-004)
      if (!result.ok) {
        const reason =
          result.reason === 'quota'
            ? "Storage is full — this photo wasn't saved to the Gallery. Free space to keep saving."
            : "This browser blocked local storage — the photo can't be kept after this session."
        toast(reason, { kind: 'error', sticky: true, action: { label: 'Open Gallery', run: () => navigate('gallery') } })
      } else {
        void requestPersistence()
      }
      const shot = { photoId: id, thumbUrl: pooledUrl(thumb), width, height }
      const target = retakeRef.current
      if (target !== null) {
        replaceShot(shot)
        setRetakeOf(null)
        stopCamera()
        setPhase('review')
      } else {
        pushShot(shot)
        const done = useCapture.getState().shots.length >= template.shots
        if (done) {
          stopCamera()
          setPhase('review')
        }
      }
      setFlash(true)
      window.setTimeout(() => setFlash(false), 260)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Capture failed — please try again.', { kind: 'error' })
    } finally {
      busyRef.current = false
    }
  }, [pushShot, replaceShot, setPhase, settings.mirrorSave, stopCamera, template.shots])

  const runCountdownThenCapture = useCallback(() => {
    if (countdown !== null) return
    const seconds = settings.countdown
    if (seconds === 0) {
      sounds.shutter()
      void doCapture()
      return
    }
    let n = seconds
    setCountdown(n)
    sounds.countdownTick()
    const tick = () => {
      n -= 1
      if (n > 0) {
        setCountdown(n)
        sounds.countdownTick()
        window.setTimeout(tick, 1000)
      } else {
        setCountdown(0)
        sounds.countdownFinal()
        window.setTimeout(() => {
          setCountdown(null)
          sounds.shutter()
          void doCapture()
        }, 550)
      }
    }
    window.setTimeout(tick, 1000)
  }, [countdown, doCapture, settings.countdown])

  /* keyboard: space to capture */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || useCapture.getState().phase !== 'live' || busyRef.current || countdown !== null) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'A') return
      e.preventDefault()
      runCountdownThenCapture()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [runCountdownThenCapture, countdown])

  /* ---------- actions ---------- */

  const startCamera = async (facing: 'user' | 'environment' = 'user') => {
    const ctrl = controller()
    await ctrl.start(facing)
    if (ctrl.currentState === 'granted' && videoRef.current) ctrl.attachToVideo(videoRef.current)
    setCanSwitch(ctrl.hasMultipleCameras)
  }

  const beginSession = async () => {
    setShowExplainer(false)
    startSession(templateId)
    await startCamera('user')
  }

  const composeInStudio = () => {
    const comp = emptyComposition(useCapture.getState().templateId, shots.map((s) => s.photoId))
    useEditor.getState().load(comp)
    endSession()
    navigate('studio')
  }

  const discardSession = () => {
    stopCamera()
    endSession()
    setRetakeOf(null)
  }

  /* ---------- render ---------- */

  if (phase === 'live') {
    return (
      <LiveView
        videoRef={videoRef}
        camState={camState}
        countdown={countdown}
        flash={flash}
        shotsTaken={retakeOf !== null ? undefined : shots.length}
        templateName={template.name}
        templateShots={template.shots}
        onShutter={runCountdownThenCapture}
        onSwitch={() => void startCamera(controllerRef.current?.activeFacing === 'user' ? 'environment' : 'user')}
        canSwitch={canSwitch}
        onStop={() => setConfirmDiscard(true)}
        onRetry={() => void startCamera(controllerRef.current?.activeFacing ?? 'user')}
      />
    )
  }

  if (phase === 'review') {
    return (
      <section aria-label="Review your photos" className="anim-enter">
        <ReviewView
          shots={shots}
          template={template}
          onRetake={(i) => {
            setRetakeOf(i)
            beginRetake(i)
            void startCamera(controllerRef.current?.activeFacing ?? 'user')
          }}
          onCompose={composeInStudio}
          onRetakeAll={() => {
            endSession()
            startSession(templateId)
            void startCamera('user')
          }}
          onDiscard={() => setConfirmDiscard(true)}
        />
      </section>
    )
  }

  /* landing */
  const quickTemplates = TEMPLATES.filter((t) =>
    ['classic-4', 'fourcut-kr', 'hero-4', 'single-polaroid', 'classic-6', 'filmstrip-4'].includes(t.id)
  )
  return (
    <section className="anim-enter" aria-label="Keepsake photobooth">
      <div className="booth-hero">
        <div className="booth-hero-copy">
          <h1>
            A film photobooth
            <br />
            that <em className="script" style={{ color: 'var(--rose-deep)' }}>keeps</em> your moments.
          </h1>
          <p className="muted">
            Take a strip, play with film filters and playful frames, and keep everything in Keepsake's own gallery — right on this
            device. Nothing is ever uploaded.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '20px 0 8px' }}>
            <Button icon="camera" onClick={() => setShowExplainer(true)}>
              Start the Booth
            </Button>
            <Button variant="secondary" icon="gallery" onClick={() => navigate('gallery')}>
              Use Gallery photos
            </Button>
          </div>
          {storageNote ? (
            <p className="tiny" style={{ color: 'var(--gold)', display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }} role="status">
              <Icon name="info" size={16} /> {storageNote}
            </p>
          ) : null}
        </div>
        <HeroStrip />
      </div>

      <div className="layout-picker">
        <div className="layout-picker-controls">
          <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem' }}>Pick a layout</h2>
          <p className="muted tiny">Tap a layout to preview it — change it anytime in the Studio.</p>
          <ChipRow label="Quick layouts">
            {quickTemplates.map((t) => (
              <Chip key={t.id} active={t.id === templateId} onClick={() => selectTemplate(t.id)}>
                {t.name} · {t.shots}
              </Chip>
            ))}
            <Chip onClick={() => setShowTemplates(true)}>
              <Icon name="plus" size={14} /> All {TEMPLATES.length} layouts
            </Chip>
          </ChipRow>
          <p className="tiny muted" style={{ marginTop: 20 }}>Session settings</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Chip onClick={() => update({ countdown: settings.countdown === 0 ? 3 : settings.countdown === 3 ? 5 : 0 })}>
              Countdown {settings.countdown === 0 ? 'off' : `${settings.countdown}s`}
            </Chip>
            <Chip onClick={() => update({ sound: !settings.sound })}>Sound {settings.sound ? 'on' : 'off'}</Chip>
            <Chip onClick={() => update({ mirrorSave: !settings.mirrorSave })}>Mirror save {settings.mirrorSave ? 'on' : 'off'}</Chip>
          </div>
        </div>
        <div className="card layout-preview" aria-label={`Preview of ${template.name} layout`}>
          <div key={templateId} className="anim-enter" style={{ display: 'flex', minHeight: 0 }}>
            <StripCanvas
              comp={previewComp}
              images={{}}
              className="layout-preview-canvas"
              renderOpts={{ placeholder: 'sample', text: false }}
            />
          </div>
          <p className="tiny muted" style={{ textAlign: 'center', marginTop: 10, marginBottom: 0 }}>
            {template.name} · {template.shots} {template.shots === 1 ? 'shot' : 'shots'}
          </p>
        </div>
      </div>

      <Modal open={showExplainer} title="Turn on the camera?" onClose={() => setShowExplainer(false)}>
        <ul style={{ margin: '0 0 16px', paddingLeft: 20, display: 'grid', gap: 8 }}>
          <li>Your browser will ask for camera permission — footage never leaves this device.</li>
          <li>Every photo you take is saved automatically to Keepsake's in-app Gallery.</li>
          <li>Nothing is uploaded, and we never write to your device's photo library.</li>
        </ul>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setShowExplainer(false)}>
            Not now
          </Button>
          <Button icon="camera" onClick={() => void beginSession()}>
            Enable camera
          </Button>
        </div>
      </Modal>

      <Sheet open={showTemplates} title="All layouts" onClose={() => setShowTemplates(false)}>
        <TemplatePicker
          selectedId={templateId}
          onSelect={(id) => {
            selectTemplate(id)
            setShowTemplates(false)
          }}
          images={{}}
        />
      </Sheet>

      <ConfirmDialog
        open={confirmDiscard}
        title="End this session?"
        message="Photos already taken stay safe in your Gallery — this only closes the booth session."
        confirmLabel="End session"
        onConfirm={discardSession}
        onCancel={() => setConfirmDiscard(false)}
      />
    </section>
  )
}

/* ---------- sub-views ---------- */

function camErrorMessage(state: string): { title: string; body: string } | null {
  switch (state) {
    case 'denied':
      return {
        title: 'Camera permission needed',
        body: 'Keepsake is not allowed to use the camera. Allow camera access for this site in your browser settings, then try again.',
      }
    case 'no-device':
      return { title: 'No camera found', body: 'We could not find a camera on this device. You can still build strips from Gallery photos.' }
    case 'busy':
      return { title: 'Camera is busy', body: 'Another app may be using the camera. Close it and try again.' }
    case 'insecure':
      return { title: 'Secure connection required', body: 'Browsers only allow camera access over HTTPS (or localhost).' }
    default:
      return null
  }
}

function LiveView(props: {
  videoRef: React.RefObject<HTMLVideoElement>
  camState: string
  countdown: number | null
  flash: boolean
  shotsTaken?: number
  templateName: string
  templateShots: number
  onShutter: () => void
  onSwitch: () => void
  canSwitch: boolean
  onStop: () => void
  onRetry: () => void
}) {
  const { videoRef, camState, countdown, flash, shotsTaken, templateName, templateShots, onShutter, onSwitch, canSwitch, onStop, onRetry } = props
  const err = camErrorMessage(camState)
  return (
    <section aria-label="Live camera" className="anim-enter">
      <div
        style={{
          position: 'relative',
          background: 'var(--dark-bg)',
          borderRadius: 'var(--r-md)',
          overflow: 'hidden',
          aspectRatio: '3 / 4',
          maxHeight: '66dvh',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <video ref={videoRef} playsInline muted autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        {flash ? (
          <div style={{ position: 'absolute', inset: 0, background: 'var(--surface)', zIndex: 'var(--z-flash)', animation: 'ks-fade 260ms var(--ease-out) reverse both' }} />
        ) : null}
        {countdown !== null && countdown >= 0 ? (
          <div
            key={countdown}
            className="anim-pop"
            style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 30, pointerEvents: 'none' }}
            aria-live="polite"
          >
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'min(28vw, 170px)', color: 'var(--surface)', textShadow: '0 4px 30px rgba(0,0,0,0.45)' }}>
              {countdown === 0 ? '✦' : countdown}
            </span>
          </div>
        ) : null}
        {err ? (
          <div style={{ position: 'absolute', inset: 0, zIndex: 35, display: 'grid', placeItems: 'center', padding: 24, background: 'rgba(34,26,18,0.86)' }}>
            <div role="alert" style={{ textAlign: 'center', color: 'var(--dark-text)', maxWidth: 360 }}>
              <h3 style={{ marginBottom: 8 }}>{err.title}</h3>
              <p className="tiny" style={{ opacity: 0.85, marginBottom: 16 }}>
                {err.body}
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <Button size="sm" onClick={onRetry}>
                  Try again
                </Button>
                <Button size="sm" variant="secondary" onClick={() => navigate('gallery')}>
                  Use Gallery
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 0' }}>
        <button className="icon-btn" aria-label="End session" onClick={onStop}>
          <Icon name="close" />
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <strong className="tiny" style={{ display: 'block' }}>
            {templateName}
          </strong>
          {shotsTaken !== undefined ? (
            <span className="tiny muted">
              {shotsTaken} / {templateShots} shots
            </span>
          ) : (
            <span className="tiny muted">retaking one shot…</span>
          )}
        </div>
        {canSwitch ? (
          <button className="icon-btn" aria-label="Switch camera" onClick={onSwitch}>
            <Icon name="switch" />
          </button>
        ) : (
          <span style={{ width: 44 }} />
        )}
      </div>

      <div style={{ display: 'grid', placeItems: 'center', padding: '20px 0 8px' }}>
        <button
          onClick={onShutter}
          aria-label="Take photo"
          disabled={camState !== 'granted' || countdown !== null}
          className={countdown !== null ? 'shutter shutter-pulse' : 'shutter'}
          style={{
            width: 76,
            height: 76,
            borderRadius: '50%',
            border: '4px solid var(--rose)',
            background: 'radial-gradient(circle at 50% 50%, var(--rose) 62%, var(--surface) 64%)',
            boxShadow: 'var(--shadow-2)',
            cursor: 'pointer',
            transition: 'transform 100ms ease',
          }}
        />
        <p className="tiny muted" style={{ marginTop: 10 }}>
          or press <kbd>Space</kbd>
        </p>
      </div>
    </section>
  )
}

function ReviewView({
  shots,
  template,
  onRetake,
  onCompose,
  onRetakeAll,
  onDiscard,
}: {
  shots: Array<{ photoId: string; thumbUrl: string; width: number; height: number }>
  template: StripTemplate
  onRetake: (i: number) => void
  onCompose: () => void
  onRetakeAll: () => void
  onDiscard: () => void
}) {
  return (
    <div>
      <h2>Review your strip</h2>
      <p className="muted tiny">All photos are already saved in your Gallery. Tap any photo to retake just that one.</p>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', margin: '16px 0 20px' }}>
        {Array.from({ length: template.shots }).map((_, i) => {
          const shot = shots[i]
          return (
            <div key={i} className={`card ${shot ? 'anim-develop' : ''}`} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative', aspectRatio: shot ? `${shot.width} / ${shot.height}` : '4 / 3', background: 'var(--surface-2)' }}>
                {shot ? (
                  <img src={shot.thumbUrl} alt={`Shot ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }} className="muted tiny">
                    empty
                  </div>
                )}
              </div>
              <button className="btn btn-ghost btn-sm" style={{ borderTop: '1px solid var(--line)', borderRadius: 0 }} onClick={() => onRetake(i)}>
                <Icon name="reset" size={16} /> Retake
              </button>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Button icon="wand" onClick={onCompose}>
          Compose in Studio
        </Button>
        <Button variant="secondary" icon="reset" onClick={onRetakeAll}>
          Retake all
        </Button>
        <Button variant="ghost" onClick={onDiscard}>
          End session
        </Button>
      </div>
    </div>
  )
}

function HeroStrip(): React.ReactNode {
  return (
    <div className="hero-strip" aria-hidden="true">
      <div className="hero-frame">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="hero-photo" style={{ animationDelay: `${i * 0.7}s` }} />
        ))}
        <span className="script" style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: 22 }}>
          keepsake ✦
        </span>
      </div>
    </div>
  )
}
