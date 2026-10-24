# saqlain-489.github.io

My portfolio site, and the source of every image on my [GitHub profile](https://github.com/saqlain-489).

**Live:** [saqlain-489.github.io](https://saqlain-489.github.io/)

## The hero

A three.js scene of the multi-agent pipeline I build: a planner hands work to parallel writers, deterministic checks reject a draft and send it back, it passes, a judge escalates it for a second look, and it ships. On the site you can drag to orbit it and hover an agent to see what it does.

- **One timeline, two outputs.** Every motion is a pure function of time and repeats every 8 seconds (`renderAt(t)` in [`src/scene/constellation.ts`](src/scene/constellation.ts)). The site plays it live. The README renders 192 frames of it headlessly and encodes them as a seamless looping WebP.
- **Small enough for a README.** In capture mode the camera, grid and stars hold still, so frames differ only where agents and packets move. libwebp then stores just those regions.
- **Bloom-driven glow.** HDR emissive orbs with a fresnel rim, additive streaks along the edges, then `UnrealBloomPass` and an `OutputPass` with ACES tone mapping.
- **HTML labels.** Node labels are DOM elements placed from projected 3D positions, so they stay crisp and selectable instead of blooming like the orbs.
- **Respectful by default.** With `prefers-reduced-motion` the scene renders one still frame, and the README serves a still image. The scene also pauses when it scrolls out of view or the tab is hidden.

## Run it

```bash
npm install
npm run dev
npm run build
```

Regenerate the README images (needs a puppeteer install for headless Chrome, plus `ffmpeg` and Python with Pillow):

```bash
PUPPETEER_MODULE=/path/to/node_modules/puppeteer npm run render:readme -- ../saqlain-489/assets
```

## Credits

Fonts: Space Grotesk, DM Sans and JetBrains Mono (SIL Open Font License), via Fontsource. Brand icons: [Simple Icons](https://simpleicons.org) (CC0). Brands whose marks can't be redistributed get neutral monograms instead.

Code: MIT © 2026 Saqlain Ahmad
