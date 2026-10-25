/**
 * Booth landing sections (D-030): hero stage, feature bento, how-it-works.
 * Pure presentation — all capture logic stays in BoothScreen.
 */
import { StripCanvas } from './StripCanvas'
import { AuroraBackdrop, BentoFeature, FanStrips, Marquee, SpotlightCard, StepCard } from './showcase'
import { Button } from './ui'
import { Icon } from './icons'
import { FILTERS } from '../data/filters'
import { FRAMES } from '../data/frames'
import { STICKERS } from '../data/stickers'
import { TEMPLATES } from '../data/templates'
import type { Composition } from '../types'

/* ---------- hero ---------- */

export function HeroStage({
  templateLabel,
  storageNote,
  onStart,
  onUseGallery,
}: {
  templateLabel: string
  storageNote: string | null
  onStart: () => void
  onUseGallery: () => void
}) {
  return (
    <section
      aria-label="Keepsake photobooth"
      className="relative overflow-hidden rounded-lg border border-line bg-surface px-6 py-10 shadow-2 wide:px-12 wide:py-16"
    >
      <AuroraBackdrop />
      <div className="relative grid items-center gap-10 [grid-template-columns:minmax(0,1fr)] wide:gap-14 wide:[grid-template-columns:minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="min-w-0">
          <p className="mb-4 inline-flex items-center gap-2 rounded-[999px] border border-line bg-surface/80 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-ink-soft uppercase backdrop-blur animate-enter">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-sage opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-sage" />
            </span>
            Film photobooth · runs entirely on this device
          </p>
          <h1 className="mb-5 text-[clamp(2.2rem,5.5vw,3.4rem)] leading-[1.08] animate-enter [animation-delay:60ms]">
            A film photobooth
            <br />
            that{' '}
            <em className="bg-gradient-to-r from-rose-deep via-rose to-gold bg-clip-text font-script text-[1.25em] font-medium text-transparent">
              keeps
            </em>{' '}
            your moments.
          </h1>
          <p className="muted mb-7 max-w-[46ch] text-lg leading-relaxed animate-enter [animation-delay:120ms]">
            Take a strip, play with film filters and playful frames, and keep everything in Keepsake's own gallery — right on this
            device. <strong className="text-ink">Nothing is ever uploaded.</strong>
          </p>
          <div className="mb-3 flex flex-wrap gap-3 animate-enter [animation-delay:180ms]">
            <Button className="sheen text-base shadow-2" icon="camera" onClick={onStart}>
              Start the Booth
            </Button>
            <Button variant="secondary" icon="gallery" onClick={onUseGallery}>
              Use Gallery photos
            </Button>
          </div>
          {storageNote ? (
            <p role="status" className="flex items-center gap-1.5 text-sm text-gold animate-enter [animation-delay:220ms]">
              <Icon name="info" size={16} /> {storageNote}
            </p>
          ) : null}
        </div>
        <FanStrips className="animate-enter [animation-delay:150ms]" />
      </div>
      <p className="relative mt-10 mb-0 text-center font-mono text-xs text-ink-faint">{templateLabel}</p>
    </section>
  )
}

/* ---------- bento ---------- */

export function FeatureBento({ previewComp, templateLabel }: { previewComp: Composition; templateLabel: string }) {
  const marqueeItems = [...FILTERS.slice(0, 6).map((f) => f.name), ...FRAMES.slice(0, 3).map((f) => f.name), 'No uploads', 'Works offline']
  return (
    <section aria-label="What Keepsake does" className="mt-10 [content-visibility:auto] [contain-intrinsic-size:auto_900px]">
      <Marquee items={marqueeItems} />
      <div className="mt-6 grid gap-4 [grid-template-columns:minmax(0,1fr)] wide:grid-cols-3">
        <SpotlightCard className="flex items-center justify-center gap-6 p-6 wide:col-span-2">
          <div className="hidden w-[120px] shrink-0 wide:block [&>div>div>canvas]:rounded-lg [&>div>div>canvas]:shadow-1">
            <StripCanvas comp={previewComp} images={{}} renderOpts={{ placeholder: 'sample', text: false }} maxCanvasHeight={220} />
          </div>
          <div className="min-w-0">
            <BentoFeature
              icon="layout"
              tone="rose"
              title={`${templateLabel} — plus ${TEMPLATES.length - 1} more layouts`}
              body="Classic 4-cut strips, Korean fourcuts, wide filmframes, single polaroids — unequal slots and mixed sizes included. Switch anytime; your photos stay in reading order."
            />
          </div>
        </SpotlightCard>
        <SpotlightCard className="p-6">
          <BentoFeature
            icon="shield"
            tone="sage"
            title="Private by architecture"
            body="No servers, no accounts, no analytics. Photos live in your browser's own IndexedDB and die with it. The network tab stays empty."
          />
        </SpotlightCard>
        <SpotlightCard className="p-6">
          <BentoFeature
            icon="sliders"
            tone="rose"
            title="Film-grade filters"
            body="Portra warmth, cine stills, disposable flash — live-previewed on your own photo, dial-in intensity per shot."
          />
        </SpotlightCard>
        <SpotlightCard className="p-6">
          <BentoFeature
            icon="sticker"
            tone="gold"
            title={`${FRAMES.length} frames · ${STICKERS.length} stickers · captions`}
            body="Hand-drawn frames, vector stickers you can drag and rotate, script captions and date stamps — all rendered at export quality."
          />
        </SpotlightCard>
        <SpotlightCard className="p-6">
          <BentoFeature
            icon="download"
            tone="rose"
            title="Print-ready export"
            body="PNG at 2–3× native resolution with a share sheet that speaks your platform's language."
          />
        </SpotlightCard>
      </div>
    </section>
  )
}

/* ---------- steps ---------- */

export function HowItWorks(): React.ReactNode {
  return (
    <section aria-label="How it works" className="mt-12 [content-visibility:auto] [contain-intrinsic-size:auto_480px]">
      <h2 className="mb-1 font-display text-2xl">Three steps to a keepsake</h2>
      <p className="muted mb-6 text-sm">From hello to saved-and-shared in about two minutes.</p>
      <div className="grid gap-4 [grid-template-columns:minmax(0,1fr)] wide:grid-cols-3">
        <StepCard n={1} icon="aperture" title="Take photos" body="Grant the camera once, pick a countdown, shoot your strip. Every shot saves to the Gallery automatically — retake any frame you hate." />
        <StepCard n={2} icon="wand" title="Make it yours" body="Lay out the strip, develop the colors, add frames, stickers, and a caption. Undo history runs 40 deep, so experiment freely." />
        <StepCard n={3} icon="heart" title="Keep it forever" body="Export a print-ready PNG, share it straight to your platform, or leave it in the Gallery to rediscover later." />
      </div>
    </section>
  )
}
