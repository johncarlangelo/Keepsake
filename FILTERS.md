# Face filters

Keepsake's face filters are Snap/Instagram-style props anchored to your face, powered by
**MediaPipe Face Landmarker** (Apache-2.0) running **entirely on your device** — the model
(~3.7 MB) and WASM runtime are bundled in this repository and load lazily the first time you pick
a filter. No API calls, nothing uploaded, no cloud.

## The filters

| # | Filter | What it does | How it works |
| --- | --- | --- | --- |
| 1 | **Sunglasses** | Dark rounded lenses sized to each eye, with bridge, temples, and a lens glint. | Anchored to the eye-corner landmarks (33/133 and 263/362), rotated by the inter-eye angle so they follow head tilt. |
| 2 | **Heart Eyes** | Red hearts with a highlight, planted over both eyes. | Anchored to the eye centers, rotated with head tilt. |
| 3 | **Blush** | A soft rosy radial glow on both cheeks. | Radial gradients on the cheek landmarks (50/280), sized to face width. |
| 4 | **Party Hat** | A striped cone with a pom-pom, perched on the head. | Anchored to the forehead landmark (10), tilted with the eye line. |
| 5 | **Doggo** | Floppy ears and a button nose — and the tongue lolls out when you open your mouth. | Ears anchored to the temples (127/356), nose to the tip (1); the tongue is driven by the **jawOpen** blendshape. |
| 6 | **Smile Sparkles** | Golden sparkles burst and twinkle around your face as you smile. | Blendshape trigger: the average of **mouthSmileLeft/Right** crosses 0.3; smile intensity scales the sparkle size. |

## How they behave

- **Live preview** — props track your face in real time over the mirrored camera feed
  (detection runs ~15 Hz with smoothing; the video itself stays at full frame rate).
- **Baked into captures** — the props are drawn onto the photo at shutter time, exactly as you
  see them in the preview, so filtered faces persist through strips and exports. Nothing is
  re-applied later; the original photo's filter is part of it.
- **Opt-in and lazy** — nothing loads until you pick a filter in the booth; picking "No filter"
  stops the loop entirely. Detection pauses with the tab and the session.
- **Performance guard** — detection runs at a fixed ~15 Hz budget regardless of camera fps, uses
  the GPU delegate when available (WASM CPU fallback otherwise), and all drawing is procedural
  (no image assets).

## Adding a filter

Add a definition to `src/data/faceFilters.ts` (`FACE_FILTERS`): an `id`, a `name`, a `draw`
function written against the landmark points (pixel space), and optional blendshape triggers.
The booth picker, the docs table above, and the bake pipeline pick it up automatically.
