// Renders the GitHub profile README images from this site: the animated 3D hero, each section, each
// project card and the link buttons. Usage:
//   PUPPETEER_MODULE=/path/to/node_modules/puppeteer node scripts/render-readme.mjs [outDir] [--only=hero|sections]
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outDir = resolve(args.find((a) => !a.startsWith('--')) ?? join(root, '../saqlain-489/assets'));
const only = args.find((a) => a.startsWith('--only='))?.split('=')[1];
const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_MODULE ?? 'puppeteer');

const FPS = 24;
const LOOP = 8;
const kb = (f) => `${Math.round(statSync(f).size / 1024)} KB`;
const webp = (png, out, q = 84) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-pix_fmt', 'yuva420p', '-quality', String(q), '-compression_level', '6', out]);

mkdirSync(outDir, { recursive: true });
const server = await createServer({ root, server: { port: 5181, strictPort: true }, logLevel: 'error' });
await server.listen();
const base = 'http://localhost:5181/';
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

try {
  if (!only || only === 'hero') {
    const frames = join(root, 'frames');
    rmSync(frames, { recursive: true, force: true });
    mkdirSync(frames, { recursive: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 440, deviceScaleFactor: 1 });
    await page.goto(`${base}?capture=hero`, { waitUntil: 'networkidle0' });
    await page.waitForFunction('window.__ready === true', { timeout: 60000 });
    const total = FPS * LOOP;
    for (let i = 0; i < total; i++) {
      await page.evaluate((t) => window.__renderAt(t), i / FPS);
      await page.screenshot({ path: join(frames, `hero-${String(i).padStart(3, '0')}.png`), omitBackground: true });
      if (i % 24 === 0) process.stdout.write(`hero frame ${i}/${total}\n`);
    }
    // The still for visitors who ask for reduced motion: the moment the draft passes the checks.
    await page.evaluate((t) => window.__renderAt(t), 4.35);
    await page.screenshot({ path: join(frames, 'still.png'), omitBackground: true });
    webp(join(frames, 'still.png'), join(outDir, 'hero-still.webp'), 88);
    execFileSync('python3', ['-I', join(root, 'scripts/encode-webp.py'), join(frames, 'hero-*.png'), join(outDir, 'hero.webp'), String(FPS), '82', '24'], { stdio: 'inherit' });
    console.log(`hero.webp ${kb(join(outDir, 'hero.webp'))}, hero-still.webp ${kb(join(outDir, 'hero-still.webp'))}`);
    await page.close();
  }

  if (!only || only === 'sections') {
    const page = await browser.newPage();
    await page.setViewport({ width: 1180, height: 900, deviceScaleFactor: 2 });
    await page.goto(`${base}?capture=readme`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0), { timeout: 30000 });
    const tmp = join(root, 'frames');
    mkdirSync(tmp, { recursive: true });
    const shots = [
      ['#impact .impact', 'impact'],
      ['#work .wrap', 'work'],
      ['#projects .head', 'projects-head'],
      ['#p-quizforge', 'card-quizforge'],
      ['#p-recite', 'card-recite'],
      ['#p-dialdesk', 'card-dialdesk'],
      ['#p-pk-job-radar', 'card-pk-job-radar'],
      ['#stack .wrap', 'stack'],
    ];
    for (const [sel, name] of shots) {
      const el = await page.$(sel);
      if (!el) throw new Error(`missing element ${sel}`);
      const png = join(tmp, `${name}.png`);
      await el.screenshot({ path: png, omitBackground: true });
      webp(png, join(outDir, `${name}.webp`));
      console.log(`${name}.webp ${kb(join(outDir, `${name}.webp`))}`);
    }
    // Buttons keep a transparent background so they sit cleanly on GitHub's light and dark themes.
    await page.evaluate(() => { document.documentElement.style.background = 'transparent'; document.body.style.background = 'transparent'; });
    for (const id of ['btn-site', 'btn-email', 'btn-linkedin', 'btn-demos']) {
      const el = await page.$(`#${id}`);
      const png = join(tmp, `${id}.png`);
      await el.screenshot({ path: png, omitBackground: true });
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-lossless', '1', join(outDir, `${id}.webp`)]);
      console.log(`${id}.webp ${kb(join(outDir, `${id}.webp`))}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
