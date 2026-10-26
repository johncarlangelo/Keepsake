# Face-filter asset research (2026-10-26) — free, no-API sources

Snap/TikTok lens files are proprietary and non-portable. With MediaPipe Face Landmarker (478
landmarks + blendshapes) any free 2D prop can be anchored — so the practical answer to "how many
filters can we use for free" is effectively unlimited; 20–40 high-quality props are cheap to add
via a generic "prop filter" type (anchor point + face-width scale + head-tilt + optional
blendshape trigger).

## A. Open-source filter libraries with demo assets

- **jeelizFaceFilter** (Apache-2.0 code; demo art is third-party, check per asset)
  https://github.com/jeeliz/jeelizFaceFilter — demos: glasses try-on, dog mask, face replacement,
  makeup. Demos docs: https://jeeliz.github.io/jeelizFaceFilter/helpers/
  Tutorial: https://medium.com/@StartupJeeliz/creating-a-snapchat-like-filter-with-jeelizs-facefilter-api-part-1-creating-your-first-filter-1e7a5000543c
- **MediaPipe official** (Apache-2.0): face_effect glasses model + canonical_face_model.obj (3D
  placement) — https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/face_mesh.md
  and https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker
- **LearnOpenCV tutorial** (code + sample assets: dog filter, sunglasses, mustache)
  https://learnopencv.com/create-snapchat-instagram-filters-using-mediapipe

## B. Free 2D prop libraries

- **SVG Repo** (CC0/MIT per icon) — https://www.svgrepo.com
  e.g. https://www.svgrepo.com/svg/11699/moustache-and-glasses ,
  https://www.svgrepo.com/svg/107273/glasses-and-moustache
- **Openclipart** (all CC0) — https://openclipart.org
- **Pixabay** (liberal license) — https://pixabay.com
- **Kenney** (CC0) — https://kenney.nl/assets
- **VTuber prop directories** — https://vtuber-nook.com/category/character-assets ,
  https://vtresources.carrd.co ,
  free commercial-use PNGtuber pack:
  https://www.deviantart.com/tsuchikabi/art/Commercial-FREE-Download-PNGTuber-Vtuber-Assets-1335268487
- **Game-icons.net** (CC-BY 3.0) — https://game-icons.net

## C. Licensing traps — look, don't take

- StickPNG Snapchat-filter PNGs — personal use only.
  https://www.stickpng.com/img/icons-logos-emojis/snapchat-filters/snapchat-filter-dog-ears
- DeepAR sample filters — licensed to their SDK only. https://www.deepar.ai/face-filters-lenses-masks
- Snap Lens Studio / TikTok Effect House assets — proprietary, platform-locked.
- Banuba SDK — commercial. https://www.banuba.com/facear-sdk/face-filters

## Build proposal (when the owner says go)

1. Generic "prop filter" registry type (anchor, scale, tilt, blendshape trigger).
2. Curate 20–40 props from SVG Repo (CC0) + Openclipart + Pixabay; record license per asset.
3. Port 1–2 jeeliz demo looks as style reference (recreate procedurally where art license is unclear).
4. Optional later: 3D placement via the official canonical face model.
