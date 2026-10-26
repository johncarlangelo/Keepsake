/** Booth: landing → explainer → live camera → countdown → review (PRD §5.1/§6.3–6.4). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CameraController } from '../lib/camera'
import { getPhoto, newId, putPhoto, requestPersistence, storageEstimate } from '../lib/db'
import { makeThumb, pooledUrl } from '../lib/images'
import { liveClipDurationMs, pickLiveMime, startLiveClip, supportsLiveCapture, type LiveRecording } from '../lib/liveclip'
import { FACE_FILTERS, getFaceFilter, type FaceFrame } from '../data/faceFilters'
import { FaceFilterLayer } from '../components/FaceFilterLayer'
import { canvasToBlob } from '../lib/images'
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
  /** selected face filter for the session (null = off) + latest smoothed face for the bake */
  const [faceFilterId, setFaceFilterId] = useState<string | null>(null)
  const faceRef = useRef<FaceFrame | null>(null)
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

  /* ---------- live clip recording (Phase 20, D-034) ---------- */

  const recordingRef = useRef<LiveRecording | null>(null)
  const recordingUntilRef = useRef(0)

  /** Abort without saving (session ended / discarded). */
  const cancelLiveRecording = useCallback(() => {
    const rec = recordingRef.current
    if (rec) {
      recordingRef.current = null
      rec.cancel()
    }
  }, [])

  /** Start recording the raw camera stream so the clip spans countdown + shutter. */
  const beginLiveRecording = useCallback(() => {
    if (!useSettings.getState().settings.livePhoto) return
    const stream = controllerRef.current?.cameraStream
    if (!stream) return
    const mime = pickLiveMime()
    if (!mime) return
    cancelLiveRecording()
    const durationMs = liveClipDurationMs(useSettings.getState().settings.countdown)
    const rec = startLiveClip(stream, mime, durationMs)
    if (rec) {
      recordingRef.current = rec
      recordingUntilRef.current = Date.now() + durationMs
    }
  }, [cancelLiveRecording])

  /** Finalize the clip and attach it to the stored photo (additive, honest failures). */
  const settleLiveClip = useCallback(async (photoId: string): Promise<void> => {
    const rec = recordingRef.current
    if (!rec) return
    recordingRef.current = null
    const clip = await rec.stop().catch(() => null)
    if (!clip || clip.size === 0) return
    const stored = await getPhoto(photoId)
    if (!stored) return
    const res = await putPhoto({ ...stored, live: { blob: clip, mime: clip.type || rec.mime, bytes: clip.size } })
    if (!res.ok) {
      toast('The photo saved, but its live clip didn\'t fit in storage.', { kind: 'error' })
    }
  }, [])
  useEffect(() => () => cancelLiveRecording(), [cancelLiveRecording])

  /* ---------- capture ---------- */

  const doCapture = useCallback(async () => {
    const video = videoRef.current
    const ctrl = controllerRef.current
    if (!video || !ctrl || busyRef.current) return
    busyRef.current = true
    try {
      const mirroredCapture = settings.mirrorSave && ctrl.activeFacing === 'user'
      const { width, height, canvas } = await ctrl.captureStill(video, mirroredCapture)
      // face filters bake into the capture like the mirror does — the overlay
      // keeps the latest smoothed face; drawing matches the canvas' mirror flag
      const face = faceFilterId ? faceRef.current : null
      const filter = face ? getFaceFilter(faceFilterId) : null
      let blob: Blob | null = null
      if (face && filter) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.save()
          if (mirroredCapture) {
            ctx.translate(canvas.width, 0)
            ctx.scale(-1, 1)
          }
          filter.draw(
            ctx,
            { pts: face.pts.map((p) => ({ x: p.x * width, y: p.y * height })), bs: face.bs },
            { time: performance.now() }
          )
          ctx.restore()
        }
        blob = await canvasToBlob(canvas, 'image/jpeg', 0.92)
        if (!blob) blob = null
      } else {
        blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.92))
      }
      if (!blob) throw new Error('Capture encoding failed')
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
        mirrored: settings.mirrorSave && ctrl.activeFacing === 'user',
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
        await settleLiveClip(id)
        stopCamera()
        setPhase('review')
      } else {
        pushShot(shot)
        const done = useCapture.getState().shots.length >= template.shots
        if (done) {
          await settleLiveClip(id)
          stopCamera()
          setPhase('review')
        } else {
          void settleLiveClip(id)
          if (useSettings.getState().settings.continuous) {
            // continuous mode: roll into the next countdown, but never while the
            // live clip for this shot is still recording
            cancelAuto()
            const liveTail = recordingUntilRef.current - Date.now() + 150
            autoTimerRef.current = window.setTimeout(() => {
              autoTimerRef.current = null
              if (useCapture.getState().phase !== 'live') return
              if (!useSettings.getState().settings.continuous) return
              runCaptureRef.current()
            }, Math.max(900, liveTail))
          }
        }
      }
      setFlash(true)
      window.setTimeout(() => setFlash(false), 260)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Capture failed — please try again.', { kind: 'error' })
    } finally {
      busyRef.current = false
    }
  }, [faceFilterId, pushShot, replaceShot, settleLiveClip, setPhase, settings.mirrorSave, stopCamera, template.shots])

  const runCountdownThenCapture = useCallback(() => {
    if (countdown !== null) return
    const seconds = settings.countdown
    if (seconds === 0) {
      beginLiveRecording()
      sounds.shutter()
      void doCapture()
      return
    }
    beginLiveRecording()
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
  }, [beginLiveRecording, countdown, doCapture, settings.countdown])
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
    cancelLiveRecording()
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
          liveEnabled={settings.livePhoto && supportsLiveCapture()}
          faceFilterId={faceFilterId}
          onFaceFilterChange={setFaceFilterId}
          faceRef={faceRef}
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

      {/* start flow: layouts scroll, settings + Continue stay pinned (D-031) */}
      <Sheet
        open={showStart}
        title="Choose your layout"
        onClose={() => setShowStart(false)}
        footer={
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              <Chip onClick={() => update({ countdown: settings.countdown === 0 ? 3 : settings.countdown === 3 ? 5 : 0 })}>
                Countdown {settings.countdown === 0 ? 'off' : `${settings.countdown}s`}
              </Chip>
              <Chip onClick={() => update({ sound: !settings.sound })}>Sound {settings.sound ? 'on' : 'off'}</Chip>
              <Chip onClick={() => update({ mirrorSave: !settings.mirrorSave })}>Mirror {settings.mirrorSave ? 'on' : 'off'}</Chip>
              <Chip active={settings.continuous} onClick={() => update({ continuous: !settings.continuous })}>
                Continuous {settings.continuous ? 'on' : 'off'}
              </Chip>
              <Chip active={settings.livePhoto} onClick={() => update({ livePhoto: !settings.livePhoto })}>
                Live {settings.livePhoto ? 'on' : 'off'}
              </Chip>
            </div>
            <p className="muted text-xs leading-snug">
              {settings.livePhoto
                ? supportsLiveCapture()
                  ? 'Each shot keeps a ~3s live clip — press and hold it in the Gallery to replay.'
                  : 'Live clips need MediaRecorder (iOS 14.5+ or a modern browser) — unavailable here.'
                : 'Continuous fires every shot back-to-back — no shutter presses needed.'}
            </p>
            <Button
              className="sheen w-full"
              icon="camera"
              onClick={() => {
                setShowStart(false)
                setShowExplainer(true)
              }}
            >
              Continue · {template.shots} {template.shots === 1 ? 'shot' : 'shots'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div
            aria-label={`Preview of ${template.name} layout`}
            className="flex items-center gap-3 rounded-md border border-line bg-surface-2/60 p-2.5"
          >
            <div key={templateId} className="animate-enter h-16 w-12 shrink-0 [&>div>div>canvas]:rounded-md">
              <StripCanvas comp={previewComp} images={{}} renderOpts={{ placeholder: 'sample', text: false }} maxCanvasHeight={64} />
            </div>
            <div className="min-w-0">
              <strong className="block text-sm">{template.name}</strong>
              <p className="muted text-xs">
                {template.shots} {template.shots === 1 ? 'shot' : 'shots'} · tap any layout below to preview it
              </p>
            </div>
          </div>
          <TemplatePicker selectedId={templateId} onSelect={selectTemplate} images={{}} />
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
  liveEnabled: boolean
  faceFilterId: string | null
  onFaceFilterChange: (id: string | null) => void
  faceRef: React.MutableRefObject<FaceFrame | null>
  continuous: boolean
  onToggleContinuous: (v: boolean) => void
  onShutter: () => void
  onSwitch: () => void
  canSwitch: boolean
  onStop: () => void
  onRetry: () => void
}) {
  const { videoRef, camState, countdown, flash, shotsTaken, templateName, templateShots, liveEnabled, faceFilterId, onFaceFilterChange, faceRef, continuous, onToggleContinuous, onShutter, onSwitch, canSwitch, onStop, onRetry } = props
  const err = camErrorMessage(camState)
  return (
    <section aria-label="Live camera" className="animate-enter mx-auto max-w-2xl">
      <div className="relative mx-auto aspect-[3/4] max-h-[66dvh] w-full overflow-hidden rounded-md bg-dark-bg shadow-2 ring-1 ring-dark-line/60">
        <video ref={videoRef} playsInline muted autoPlay className="size-full -scale-x-100 object-cover" />
        {/* face-filter overlay: draws props over the mirrored feed */}
        <FaceFilterLayer videoRef={videoRef} filterId={faceFilterId} faceRef={faceRef} />
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
          <strong className="block text-sm">
            {templateName}
            {liveEnabled ? (
              <span className="ml-2 inline-flex items-center gap-1 align-middle text-[10px] font-bold tracking-widest text-rose-deep">
                <span className="inline-block size-1.5 animate-pulse rounded-full bg-rose" aria-hidden="true" /> LIVE
              </span>
            ) : null}
          </strong>
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

      {/* face filters (Phase 21): lazy-load the tracker only when one is picked */}
      <div className="mt-3 flex justify-center">
        <div
          role="group"
          aria-label="Face filters"
          className="flex max-w-full gap-2 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <Chip active={faceFilterId === null} onClick={() => onFaceFilterChange(null)}>
            No filter
          </Chip>
          {FACE_FILTERS.map((f) => (
            <Chip key={f.id} active={faceFilterId === f.id} onClick={() => onFaceFilterChange(f.id)} disabled={camState !== 'granted'}>
              {f.name}
            </Chip>
          ))}
        </div>
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
