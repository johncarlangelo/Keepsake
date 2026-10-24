/** Booth: landing → explainer → live camera → countdown → review (PRD §5.1/§6.3–6.4). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CameraController } from '../lib/camera'
import { newId, putPhoto, requestPersistence, storageEstimate } from '../lib/db'
import { makeThumb, pooledUrl } from '../lib/images'
import { sounds } from '../lib/sound'
import { getTemplate } from '../data/templates'
import { emptyComposition } from '../render/compose'
import { useCapture } from '../state/capture'
import { useEditor } from '../state/editor'
import { useSettings } from '../state/settings'
import { toast } from '../state/toast'
import { navigate } from '../route'
import { Button, Chip, ConfirmDialog, Card, Modal, Segmented, Sheet } from '../components/ui'
import { Icon } from '../components/icons'
import { AuroraBackdrop } from '../components/showcase'
import { TemplatePicker } from '../components/pickers'
import { StripCanvas } from '../components/StripCanvas'
import { HeroStage, FeatureBento, HowItWorks } from '../components/booth-sections'
import type { StripTemplate } from '../types'

export function BoothScreen() {
  const { phase, templateId, shots, startSession, pushShot, replaceShot, beginRetake, setPhase, endSession } = useCapture()
  const { settings, update } = useSettings()

  const [showExplainer, setShowExplainer] = useState(false)
  const [showStart, setShowStart] = useState(false)
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
  /** pending auto-capture in continuous mode (cancelled on session end/unmount) */
  const autoTimerRef = useRef<number | null>(null)
  const cancelAuto = () => {
    if (autoTimerRef.current !== null) {
      window.clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
    }
  }
  /** latest runCountdownThenCapture, callable from timers without stale closures */
  const runCaptureRef = useRef<() => void>(() => {})

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

  useEffect(() => () => {
    cancelAuto()
    stopCamera()
  }, [stopCamera])

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
        } else if (useSettings.getState().settings.continuous) {
          // continuous mode: roll straight into the next shot's countdown
          cancelAuto()
          autoTimerRef.current = window.setTimeout(() => {
            autoTimerRef.current = null
            if (useCapture.getState().phase !== 'live') return
            if (!useSettings.getState().settings.continuous) return
            runCaptureRef.current()
          }, 900)
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
  runCaptureRef.current = runCountdownThenCapture

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
    cancelAuto()
    stopCamera()
    endSession()
    setRetakeOf(null)
  }

  /* ---------- render ---------- */

  if (phase === 'live') {
    return (
      <>
        <LiveView
          videoRef={videoRef}
          camState={camState}
          countdown={countdown}
          flash={flash}
          shotsTaken={retakeOf !== null ? undefined : shots.length}
          templateName={template.name}
          templateShots={template.shots}
          continuous={settings.continuous}
          onToggleContinuous={(v) => update({ continuous: v })}
          onShutter={runCountdownThenCapture}
          onSwitch={() => void startCamera(controllerRef.current?.activeFacing === 'user' ? 'environment' : 'user')}
          canSwitch={canSwitch}
          onStop={() => setConfirmDiscard(true)}
          onRetry={() => void startCamera(controllerRef.current?.activeFacing ?? 'user')}
        />
        {/* the dialog must live in every phase branch — the X button was dead
            because this dialog previously rendered on the landing branch only */}
        <ConfirmDialog
          open={confirmDiscard}
          title="End this session?"
          message="Photos already taken stay safe in your Gallery — this only closes the booth session."
          confirmLabel="End session"
          onConfirm={discardSession}
          onCancel={() => setConfirmDiscard(false)}
        />
      </>
    )
  }

  if (phase === 'review') {
    return (
      <>
        <section aria-label="Review your photos" className="animate-enter">
          <ReviewView
            shots={shots}
            template={template}
            onRetake={(i) => {
              cancelAuto()
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
        <ConfirmDialog
          open={confirmDiscard}
          title="End this session?"
          message="Photos already taken stay safe in your Gallery — this only closes the booth session."
          confirmLabel="End session"
          onConfirm={discardSession}
          onCancel={() => setConfirmDiscard(false)}
        />
      </>
    )
  }

  /* landing — layout selection lives in the start flow, not here (D-031) */
  return (
    <section className="animate-enter" aria-label="Keepsake photobooth">
      <HeroStage
        templateLabel={`${template.name} · ${template.shots} ${template.shots === 1 ? 'shot' : 'shots'}`}
        storageNote={storageNote}
        onStart={() => setShowStart(true)}
        onUseGallery={() => navigate('gallery')}
      />

      <FeatureBento previewComp={previewComp} templateLabel={template.name} />
      <HowItWorks />

      {/* closing CTA band */}
      <Card className="relative mt-12 overflow-hidden py-10 text-center">
        <AuroraBackdrop />
        <div className="relative">
          <p className="font-display text-2xl">Ready for your close-up?</p>
          <p className="muted mx-auto mb-6 mt-2 max-w-[42ch] text-sm">
            Pick a layout, grant the camera once, and your first strip is about two minutes away.
          </p>
          <Button className="sheen" icon="camera" onClick={() => setShowStart(true)}>
            Start the Booth
          </Button>
        </div>
      </Card>

      <Modal open={showExplainer} title="Turn on the camera?" onClose={() => setShowExplainer(false)}>
        <ul className="mb-4 grid list-disc gap-2 pl-5">
          <li>Your browser will ask for camera permission — footage never leaves this device.</li>
          <li>Every photo you take is saved automatically to Keepsake's in-app Gallery.</li>
          <li>Nothing is uploaded, and we never write to your device's photo library.</li>
        </ul>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowExplainer(false)}>
            Not now
          </Button>
          <Button icon="camera" onClick={() => void beginSession()}>
            Enable camera
          </Button>
        </div>
      </Modal>

      {/* start flow: layout choice + session settings, then the camera explainer */}
      <Sheet open={showStart} title="Choose your layout" onClose={() => setShowStart(false)}>
        <div className="flex flex-col gap-5">
          <div aria-label={`Preview of ${template.name} layout`} className="flex flex-col items-center">
            <div key={templateId} className="animate-enter flex max-h-[240px] justify-center [&>div>div>canvas]:rounded-lg [&>div>div>canvas]:shadow-1">
              <StripCanvas comp={previewComp} images={{}} renderOpts={{ placeholder: 'sample', text: false }} maxCanvasHeight={220} />
            </div>
            <p className="muted mt-2 text-sm">
              {template.name} · {template.shots} {template.shots === 1 ? 'shot' : 'shots'}
            </p>
          </div>
          <TemplatePicker selectedId={templateId} onSelect={selectTemplate} images={{}} />
          <div>
            <p className="muted mb-2 text-sm">Session settings</p>
            <div className="flex flex-wrap gap-2">
              <Chip onClick={() => update({ countdown: settings.countdown === 0 ? 3 : settings.countdown === 3 ? 5 : 0 })}>
                Countdown {settings.countdown === 0 ? 'off' : `${settings.countdown}s`}
              </Chip>
              <Chip onClick={() => update({ sound: !settings.sound })}>Sound {settings.sound ? 'on' : 'off'}</Chip>
              <Chip onClick={() => update({ mirrorSave: !settings.mirrorSave })}>Mirror save {settings.mirrorSave ? 'on' : 'off'}</Chip>
              <Chip active={settings.continuous} onClick={() => update({ continuous: !settings.continuous })}>
                Continuous {settings.continuous ? 'on' : 'off'}
              </Chip>
            </div>
            <p className="muted mt-2 text-[0.8125rem]">Continuous fires every shot back-to-back — no shutter presses needed.</p>
          </div>
          <Button
            className="sheen"
            icon="camera"
            onClick={() => {
              setShowStart(false)
              setShowExplainer(true)
            }}
          >
            Continue · {template.shots} {template.shots === 1 ? 'shot' : 'shots'}
          </Button>
        </div>
      </Sheet>
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
  continuous: boolean
  onToggleContinuous: (v: boolean) => void
  onShutter: () => void
  onSwitch: () => void
  canSwitch: boolean
  onStop: () => void
  onRetry: () => void
}) {
  const { videoRef, camState, countdown, flash, shotsTaken, templateName, templateShots, continuous, onToggleContinuous, onShutter, onSwitch, canSwitch, onStop, onRetry } = props
  const err = camErrorMessage(camState)
  return (
    <section aria-label="Live camera" className="animate-enter mx-auto max-w-2xl">
      <div className="relative mx-auto aspect-[3/4] max-h-[66dvh] w-full overflow-hidden rounded-md bg-dark-bg shadow-2 ring-1 ring-dark-line/60">
        <video ref={videoRef} playsInline muted autoPlay className="size-full -scale-x-100 object-cover" />
        {/* film-frame corners over the feed */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-3 rounded-sm border border-white/15" />
        {flash ? (
          <div className="absolute inset-0 z-[var(--z-flash)] bg-surface [animation:ks-fade_260ms_var(--ease-brand)_reverse_both]" />
        ) : null}
        {countdown !== null && countdown >= 0 ? (
          <div
            key={countdown}
            className="pointer-events-none absolute inset-0 z-30 grid place-items-center animate-pop"
            aria-live="polite"
          >
            <span className="font-display text-[min(28vw,170px)] font-bold text-surface drop-shadow-[0_4px_30px_rgba(0,0,0,0.45)]">
              {countdown === 0 ? '✦' : countdown}
            </span>
          </div>
        ) : null}
        {err ? (
          <div className="absolute inset-0 z-35 grid place-items-center bg-[rgba(34,26,18,0.86)] p-6">
            <div role="alert" className="max-w-[360px] text-center text-dark-text">
              <h3 className="mb-2">{err.title}</h3>
              <p className="mb-4 text-sm opacity-85">{err.body}</p>
              <div className="flex justify-center gap-2">
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

      <div className="flex items-center gap-3 pt-4">
        <button
          aria-label="End session"
          onClick={onStop}
          className={[
            'inline-flex size-11 items-center justify-center rounded-[999px] border border-line',
            'bg-surface/85 text-ink-soft backdrop-blur transition-colors duration-150',
            'hover:bg-surface hover:text-ink active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
          ].join(' ')}
        >
          <Icon name="close" />
        </button>
        <div className="flex-1 text-center">
          <strong className="block text-sm">{templateName}</strong>
          {shotsTaken !== undefined ? (
            <span className="muted text-sm">
              {shotsTaken} / {templateShots} shots
            </span>
          ) : (
            <span className="muted text-sm">retaking one shot…</span>
          )}
        </div>
        {canSwitch ? (
          <button
            aria-label="Switch camera"
            onClick={onSwitch}
            className={[
              'inline-flex size-11 items-center justify-center rounded-[999px] border border-line',
              'bg-surface/85 text-ink-soft backdrop-blur transition-colors duration-150',
              'hover:bg-surface hover:text-ink active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
            ].join(' ')}
          >
            <Icon name="switch" />
          </button>
        ) : (
          <span className="w-11" />
        )}
      </div>

      {/* capture mode: manual shutter presses or continuous auto-fire (D-031) */}
      <div className="flex justify-center pt-4">
        <Segmented
          label="Capture mode"
          value={continuous ? 'continuous' : 'manual'}
          onChange={(v) => onToggleContinuous(v === 'continuous')}
          options={[
            { value: 'manual', label: 'Manual' },
            { value: 'continuous', label: 'Continuous' },
          ]}
        />
      </div>

      <div className="grid place-items-center py-5">
        <button
          onClick={onShutter}
          aria-label="Take photo"
          disabled={camState !== 'granted' || countdown !== null}
          className="group relative size-[76px] rounded-full border-4 border-rose shadow-2 transition-transform duration-100 active:scale-95 disabled:opacity-50"
          style={{ background: 'radial-gradient(circle at 50% 50%, var(--color-rose) 62%, var(--color-surface) 64%)' }}
        >
          {countdown !== null ? (
            <span aria-hidden="true" className="absolute -inset-1 animate-shutter-ring rounded-full border-[3px] border-rose" />
          ) : null}
        </button>
        <p className="muted mt-2.5 text-sm" aria-live="polite">
          {continuous ? 'Continuous — every shot fires automatically' : (
            <>
              or press <kbd>Space</kbd>
            </>
          )}
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
      <p className="muted text-sm">All photos are already saved in your Gallery. Tap any photo to retake just that one.</p>
      <div className="my-4 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
        {Array.from({ length: template.shots }).map((_, i) => {
          const shot = shots[i]
          return (
            <div
              key={i}
              className={shot ? 'animate-develop overflow-hidden rounded-md border border-line bg-surface shadow-1' : 'overflow-hidden rounded-md border border-line bg-surface shadow-1'}
            >
              <div className="relative bg-surface-2" style={{ aspectRatio: shot ? `${shot.width} / ${shot.height}` : '4 / 3' }}>
                {shot ? (
                  <img src={shot.thumbUrl} alt={`Shot ${i + 1}`} className="size-full object-cover" />
                ) : (
                  <div className="muted absolute inset-0 grid place-items-center text-sm">empty</div>
                )}
              </div>
              <button
                className={[
                  'ghost flex w-full min-h-9 items-center justify-center gap-2 rounded-none px-4 text-sm font-semibold',
                  'border-t border-line text-ink-soft transition-colors duration-150 hover:bg-surface-2 hover:text-ink',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                ].join(' ')}
                onClick={() => onRetake(i)}
              >
                <Icon name="reset" size={16} /> Retake
              </button>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-2.5">
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
