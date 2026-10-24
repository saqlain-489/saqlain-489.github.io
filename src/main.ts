import './style.css';
import { Timer } from 'three';
import {
  siAnthropic, siCloudflareworkers, siDocker, siExpress, siGithub, siGithubactions, siJavascript, siKubernetes,
  siModelcontextprotocol, siMongodb, siMysql, siNextdotjs, siNodedotjs, siOpentelemetry, siPostgresql, siPrisma,
  siPython, siReact, siRedis, siRedux, siSocketdotio, siTailwindcss, siTypescript, siVite, type SimpleIcon,
} from 'simple-icons';
import { IMPACT, PROFILE, PROJECTS, STACK, WORK } from './content';
import { createConstellation, NODES } from './scene/constellation';

const params = new URLSearchParams(location.search);
const capture = params.get('capture');
if (capture) {
  document.documentElement.classList.add('capture-root');
  document.body.classList.add('capture', `capture-${capture}`);
}

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/* ------------------------------------------------------------------ */
/* Icons                                                                */
/* ------------------------------------------------------------------ */

const BRAND: Record<string, SimpleIcon> = {
  TypeScript: siTypescript, JavaScript: siJavascript, Python: siPython, React: siReact, 'Next.js': siNextdotjs,
  Redux: siRedux, 'Tailwind CSS': siTailwindcss, Vite: siVite, 'Node.js': siNodedotjs, Express: siExpress,
  'Socket.IO': siSocketdotio, PostgreSQL: siPostgresql, MongoDB: siMongodb, Redis: siRedis, MySQL: siMysql,
  Prisma: siPrisma, 'Claude API': siAnthropic, MCP: siModelcontextprotocol, Docker: siDocker, Kubernetes: siKubernetes,
  'GitHub Actions': siGithubactions, 'Cloudflare Workers': siCloudflareworkers, OpenTelemetry: siOpentelemetry,
};
// Brands whose marks can't be redistributed get a neutral monogram instead of a logo.
const MONO: Record<string, [string, string]> = {
  BullMQ: ['MQ', '#f87171'], 'REST & webhooks': ['{}', '#94a3b8'], Mastra: ['M', '#e2e8f0'], 'Azure OpenAI': ['AI', '#67e8f9'],
  Whisper: ['W', '#a78bfa'], RAG: ['R', '#fbbf24'], AWS: ['aws', '#fbbf24'],
};

function luminance(hex: string): number {
  const n = parseInt(hex, 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function techIcon(name: string): string {
  const b = BRAND[name];
  if (b) {
    const fill = luminance(b.hex) < 0.06 ? '#e2e8f0' : `#${b.hex}`;
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="${fill}" d="${b.path}"/></svg>`;
  }
  const [txt, bg] = MONO[name] ?? [name[0], '#2dd4bf'];
  return `<span class="mono" style="background:${bg}">${esc(txt)}</span>`;
}

const ICON = {
  github: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${siGithub.path}"/></svg>`,
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.98-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="5" fill="currentColor" opacity=".18"/><text x="12" y="16.5" text-anchor="middle" font-family="DM Sans Variable, sans-serif" font-weight="700" font-size="11" fill="currentColor">in</text></svg>',
};

/* ------------------------------------------------------------------ */
/* Content                                                              */
/* ------------------------------------------------------------------ */

$('#role').textContent = PROFILE.role;
$('#name').textContent = PROFILE.name;
$('#lede').textContent = PROFILE.lede;
$('#loc').textContent = PROFILE.location;
$<HTMLAnchorElement>('#gh').href = PROFILE.github;
$<HTMLAnchorElement>('#gh').innerHTML = `${ICON.github} GitHub`;
$<HTMLAnchorElement>('#mail').href = `mailto:${PROFILE.email}`;
$<HTMLAnchorElement>('#mail').innerHTML = `${ICON.mail} Email me`;

$('#impact-grid').innerHTML = IMPACT.map((s) => `<div class="tile reveal"><div class="v">${esc(s.value)}</div><div class="l">${esc(s.label)}</div></div>`).join('');

$('#work-grid').innerHTML = WORK.map((w) => `
  <article class="reveal"><span class="tag">${esc(w.tag)}</span><h3>${esc(w.title)}</h3><p>${esc(w.text)}</p></article>`).join('');

$('#project-grid').innerHTML = PROJECTS.map((p) => `
  <article class="project reveal" id="p-${p.slug}" style="--accent:${p.accent}">
    <div class="body">
      <p class="eyebrow"><span class="dot"></span>${esc(p.eyebrow)}</p>
      <h3>${esc(p.title)}</h3>
      <p class="tagline">${esc(p.tagline)}</p>
      <ul>${p.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="row"><div class="stackchips">${p.stack.map((s) => `<span>${esc(s)}</span>`).join('')}</div><span class="metric">${esc(p.metric)}</span></div>
      <div class="links">
        ${p.demo ? `<a class="btn primary" href="${p.demo}" target="_blank" rel="noopener">${ICON.play} Live demo</a>` : ''}
        <a class="btn" href="${p.repo}" target="_blank" rel="noopener">${ICON.github} Code</a>
      </div>
    </div>
    <div class="shot" aria-hidden="true">
      <div class="frame"><div class="bar"><i></i><i></i><i></i><u>${esc((p.demo || p.repo).replace(/^https:\/\//, ''))}</u></div>
        <img src="${import.meta.env.BASE_URL}${p.shot}" alt="${esc(p.shotAlt)}" loading="${capture ? 'eager' : 'lazy'}" decoding="async" width="1600" height="1000"></div>
    </div>
  </article>`).join('');

$('#stack-grid').innerHTML = STACK.map((g) => `
  <div class="group reveal"><h3>${esc(g.group)}</h3>
    <div class="items">${g.items.map((i) => `<span class="tech">${techIcon(i)}${esc(i)}</span>`).join('')}</div></div>`).join('');

$('#contact-cta').innerHTML = `
  <a class="btn primary" href="mailto:${PROFILE.email}">${ICON.mail} ${esc(PROFILE.email)}</a>
  <a class="btn" href="${PROFILE.linkedin}" target="_blank" rel="noopener">${ICON.linkedin} LinkedIn</a>
  <a class="btn" href="${PROFILE.github}" target="_blank" rel="noopener">${ICON.github} GitHub</a>`;

if (capture === 'readme') {
  const box = document.createElement('div');
  box.id = 'readme-buttons';
  box.innerHTML = `
    <a class="btn primary" id="btn-site">${ICON.play} Open the interactive 3D version</a>
    <a class="btn" id="btn-email">${ICON.mail} Email me</a>
    <a class="btn" id="btn-linkedin">${ICON.linkedin} LinkedIn</a>
    <a class="btn" id="btn-demos">${ICON.arrow} Live demos</a>`;
  document.body.append(box);
}

/* Reveal on scroll */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

/* ------------------------------------------------------------------ */
/* The 3D hero                                                          */
/* ------------------------------------------------------------------ */

const hero = $('.hero');
const canvas = $<HTMLCanvasElement>('#scene');
const mobile = () => innerWidth < 760;
const shiftFor = () => (capture === 'hero' ? 0.215 : mobile() ? 0 : 0.17);
const ratio = () => (capture ? 1 : Math.min(devicePixelRatio, mobile() ? 1.5 : 2));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tall = () => !capture && hero.clientWidth / hero.clientHeight < 0.9;
// On tall screens the pipeline gets the space between the nav and the text block.
const freeBand = (): [number, number] => {
  const h = hero.clientHeight;
  const navBottom = $('.nav').getBoundingClientRect().bottom - hero.getBoundingClientRect().top;
  const copyTop = $('.hero-copy').getBoundingClientRect().top - hero.getBoundingClientRect().top;
  return [Math.max(0.05, (navBottom + 16) / h), Math.min(0.6, (copyTop - 22) / h)];
};

const scene = createConstellation({ canvas, width: hero.clientWidth, height: hero.clientHeight, pixelRatio: ratio(), shift: shiftFor(), stars: mobile() ? 650 : 1100, calm: capture === 'hero', portrait: tall(), band: tall() ? freeBand() : undefined });

const labelsEl = $('#labels');
const labels = NODES.map((n) => {
  const d = document.createElement('div');
  d.className = 'label';
  d.innerHTML = `<b>${esc(n.label)}</b><span>${esc(n.sub)}</span>`;
  labelsEl.append(d);
  return d;
});
function placeLabels() {
  scene.project().forEach((p, i) => {
    labels[i].style.left = `${p.x}px`;
    labels[i].style.top = `${p.y}px`;
    labels[i].style.opacity = p.depth < 1 ? '1' : '0';
  });
}

const w = window as unknown as { __renderAt?: (t: number) => void; __ready?: boolean };

if (capture === 'hero') {
  w.__renderAt = (t) => { scene.renderAt(t); placeLabels(); };
  document.fonts.ready.then(() => { w.__renderAt!(0); w.__ready = true; });
} else {
  const timer = new Timer();
  timer.connect(document);
  const view = { yaw: 0, pitch: 0 };
  const aim = { yaw: 0, pitch: 0 };
  let drag: { x: number; y: number } | null = null;
  let visible = true;
  let staticT = 4.2;

  const tooltip = $('#tooltip');
  const showTip = (clientX: number, clientY: number) => {
    const rect = hero.getBoundingClientRect();
    const node = scene.pick(clientX, clientY, rect);
    hero.style.cursor = drag ? 'grabbing' : node ? 'pointer' : 'grab';
    if (!node) { tooltip.classList.remove('show'); return; }
    const p = scene.project()[NODES.indexOf(node)];
    tooltip.innerHTML = `<b style="color:#${node.color.toString(16).padStart(6, '0')}">${esc(node.label)}</b><p>${esc(node.detail)}</p>`;
    tooltip.style.left = `${Math.min(rect.width - 280, Math.max(12, p.x - 130))}px`;
    tooltip.style.top = `${Math.max(80, p.y - 150)}px`;
    tooltip.classList.add('show');
  };

  hero.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('a, button, .hero-copy')) return;
    drag = { x: e.clientX, y: e.clientY };
    hero.setPointerCapture(e.pointerId);
  });
  hero.addEventListener('pointermove', (e) => {
    if (drag) {
      aim.yaw = Math.max(-0.9, Math.min(0.9, aim.yaw - (e.clientX - drag.x) * 0.004));
      aim.pitch = Math.max(-0.12, Math.min(0.45, aim.pitch + (e.clientY - drag.y) * 0.003));
      drag = { x: e.clientX, y: e.clientY };
      if (reduced) frame(performance.now());
    } else if (e.pointerType === 'mouse') {
      const r = hero.getBoundingClientRect();
      aim.yaw = ((e.clientX - r.left) / r.width - 0.5) * 0.14;
      aim.pitch = ((e.clientY - r.top) / r.height - 0.5) * 0.06;
    }
    showTip(e.clientX, e.clientY);
  });
  const release = () => { drag = null; hero.style.cursor = 'grab'; };
  hero.addEventListener('pointerup', release);
  hero.addEventListener('pointercancel', release);
  hero.addEventListener('pointerleave', () => { tooltip.classList.remove('show'); if (!drag) { aim.yaw = 0; aim.pitch = 0; } });
  hero.addEventListener('click', (e) => {
    const node = scene.pick(e.clientX, e.clientY, hero.getBoundingClientRect());
    if (node) $('#projects').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(hero);

  function frame(now: number) {
    timer.update(now);
    view.yaw += (aim.yaw - view.yaw) * 0.07;
    view.pitch += (aim.pitch - view.pitch) * 0.07;
    scene.renderAt(reduced ? staticT : timer.getElapsed(), view);
    placeLabels();
  }
  const loop = (now: number) => {
    if (visible && !document.hidden) frame(now);
    requestAnimationFrame(loop);
  };
  if (reduced) frame(performance.now());
  else requestAnimationFrame(loop);
  document.fonts.ready.then(() => scene.resize(hero.clientWidth, hero.clientHeight, ratio(), shiftFor(), tall(), tall() ? freeBand() : undefined));

  addEventListener('resize', () => {
    scene.resize(hero.clientWidth, hero.clientHeight, ratio(), shiftFor(), tall(), tall() ? freeBand() : undefined);
    if (reduced) frame(performance.now());
  });
  hero.style.cursor = 'grab';
  staticT = 4.2;
}
