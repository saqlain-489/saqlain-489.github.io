export const PROFILE = {
  name: 'Saqlain Ahmad',
  role: 'Full-stack & AI engineer',
  lede: 'I build AI agents that run in production, and the full-stack TypeScript apps around them.',
  location: 'Faisalabad, Pakistan',
  email: 'saqlainahmad489@gmail.com',
  github: 'https://github.com/saqlain-489',
  linkedin: 'https://www.linkedin.com/in/saqlain-ahmad-developer/',
  site: 'https://saqlain-489.github.io',
};

export const IMPACT = [
  { value: '≈2 yrs', label: 'building a production EdTech platform end to end' },
  { value: '5 + 6', label: 'backend services and client apps I work across' },
  { value: '−85%', label: 'LLM running cost after routing work to cheaper models' },
  { value: '390+', label: 'automated tests across my public repos' },
];

export const WORK = [
  { tag: 'AI · production', title: 'Multi-agent course generation', text: 'Planner, writer and quality-check agents on Mastra and Azure OpenAI produce complete language-course units. Routing simpler work to cheaper models, with fallbacks, cut running cost by about 85%.' },
  { tag: 'AI · quality', title: 'An evaluation harness for the AI', text: 'Deterministic checks, LLM judges calibrated on known-good units, golden datasets, and a CI gate on every change to the agents.' },
  { tag: 'Real-time · full-stack', title: 'Messaging and class discussions', text: '21 REST endpoints in Node.js, Express and TypeScript, plus the React interface: live updates over Socket.IO, reply threads, reactions and attachments.' },
  { tag: 'Auth · migration', title: 'Firebase to Better Auth', text: 'Moved four backend services and six apps to Better Auth, migrating existing accounts and OAuth edge cases without locking anyone out.' },
  { tag: 'Speech · Python', title: 'Recitation scoring service', text: 'Scores a student\'s recitation from audio with Whisper speech recognition plus Arabic text matching, in Docker on Kubernetes.' },
  { tag: 'Scale · reliability', title: 'Caching, queues, tracing', text: 'Redis caching for leaderboards and quiz results, BullMQ background jobs, and OpenTelemetry tracing across five services.' },
];

export interface Project {
  slug: string;
  eyebrow: string;
  title: string;
  tagline: string;
  points: string[];
  stack: string[];
  metric: string;
  accent: string;
  demo: string;
  repo: string;
  shot: string;
  shotAlt: string;
}

export const PROJECTS: Project[] = [
  {
    slug: 'quizforge',
    eyebrow: 'AI agents · LLM evals',
    title: 'quizforge',
    tagline: 'Turns any document into a quiz where every answer is checked against the source and cited.',
    points: ['Planner, parallel writers, 17 deterministic checks and a two-tier judge', 'Every rejection goes back to the writer as an exact instruction', 'MCP server so Claude Code can call it as a tool'],
    stack: ['TypeScript', 'Mastra', 'Claude API', 'Next.js'],
    metric: '67 tests · 31-case benchmark',
    accent: '#2dd4bf',
    demo: 'https://saqlain-489.github.io/quizforge/',
    repo: 'https://github.com/saqlain-489/quizforge',
    shot: 'shots/quizforge.webp',
    shotAlt: 'The quizforge demo: an answered question with its source quote highlighted in the passage',
  },
  {
    slug: 'recite',
    eyebrow: 'Speech · Arabic · RTL',
    title: 'recite',
    tagline: 'Recite into the mic and watch every word, down to the letter, get checked as you go.',
    points: ['Streams Web Speech results through an alignment engine', 'Correct, substituted, missed and extra words', 'Letter-level colours inside joined Arabic script'],
    stack: ['React', 'TypeScript', 'Web Speech API', 'Vitest'],
    metric: '135 tests',
    accent: '#a78bfa',
    demo: 'https://saqlain-489.github.io/recite/',
    repo: 'https://github.com/saqlain-489/recite',
    shot: 'shots/recite.webp',
    shotAlt: 'Recite after a recitation of Al-Fatiha, with each word coloured and a list of mistakes',
  },
  {
    slug: 'dialdesk',
    eyebrow: 'Real-time · voice AI',
    title: 'dialdesk',
    tagline: 'A browser softphone and call CRM: calls are transcribed in the browser, misses go to an AI receptionist.',
    points: ['Twilio Voice in the browser, Whisper in a Web Worker', 'Tenant isolation and toll-fraud guards on every query', 'AI receptionist on Cloudflare Workers and Azure Voice Live'],
    stack: ['React', 'Express', 'MongoDB', 'Twilio'],
    metric: '115 tests',
    accent: '#67e8f9',
    demo: 'https://saqlain-489.github.io/dialdesk/',
    repo: 'https://github.com/saqlain-489/dialdesk',
    shot: 'shots/dialdesk.webp',
    shotAlt: 'The dialdesk dial page during a call, with the lead queue, a call guide and the call panel',
  },
  {
    slug: 'pk-job-radar',
    eyebrow: 'Data pipeline · automation',
    title: 'pk-job-radar',
    tagline: 'Finds and ranks engineering jobs straight from Pakistani companies’ own careers pages.',
    points: ['7,435 map results narrowed to 577 software companies', 'Eight job-board feeds read in code, no paid APIs', 'A model reads only the pages that changed'],
    stack: ['Node.js', 'SQLite', 'Puppeteer', 'Express'],
    metric: '77 tests',
    accent: '#fbbf24',
    demo: '',
    repo: 'https://github.com/saqlain-489/pk-job-radar',
    shot: 'shots/pk-job-radar.webp',
    shotAlt: 'The pk-job-radar dashboard: matches ranked by score with the reasons for each score',
  },
];

export const STACK: { group: string; items: string[] }[] = [
  { group: 'Languages', items: ['TypeScript', 'JavaScript', 'Python'] },
  { group: 'Frontend', items: ['React', 'Next.js', 'Redux', 'Tailwind CSS', 'Vite'] },
  { group: 'Backend', items: ['Node.js', 'Express', 'Socket.IO', 'BullMQ', 'REST & webhooks'] },
  { group: 'Data', items: ['PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'Prisma'] },
  { group: 'AI', items: ['Mastra', 'Claude API', 'Azure OpenAI', 'Whisper', 'MCP', 'RAG'] },
  { group: 'Infrastructure', items: ['Docker', 'Kubernetes', 'AWS', 'GitHub Actions', 'Cloudflare Workers', 'OpenTelemetry'] },
];
