// ─── Site content ─────────────────────────────────────────────────────────────
// Single source of copy for the v2 site. Copy marked `pending: true` is a
// placeholder: the page renders it with a visible "pending" tag so gaps are
// obvious on the preview. Real copy comes from the current juancfresno.com
// (index2, /about, /projects, /contact) until the copy review lands.

export const PERSON = {
  name: 'Juan C. Fresno',
  role: 'Independent Designer — Art Direction, Brand, Interactive',
  years: '2012 — 2026',
  disciplines: ['Art direction', 'Visual Design', 'Interaction', 'Brand Identity', 'Strategy', 'Develop'],
  email: 'hello@juancfresno.com',
  location: 'Valencia, Spain',
  // Availability is decided by Juan; shown as pending until he sets it.
  availability: { text: 'Disponible desde —', pending: true },
  callUrl: null as string | null, // 15-min call link, pending
}

export const SOCIALS = [
  { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/juancfresno' },
  { id: 'instagram', label: 'Instagram', href: 'https://instagram.com/juanc.fresno' },
  { id: 'behance', label: 'Behance', href: 'https://www.behance.net/juancfresno' },
  { id: 'dribbble', label: 'Dribbble', href: 'https://dribbble.com/JuanCFresno' },
  { id: 'x', label: 'X', href: 'https://x.com/JuanCFresno' },
] as const

export type SocialId = (typeof SOCIALS)[number]['id']

// Hover previews of each profile (footer + ContactBlock, see
// components/ui/SocialPreview). Files live in public/social/. A network with
// no entry shows nothing; one with only a poster shows the still image.
export const SOCIAL_PREVIEWS: Partial<Record<SocialId, { webm?: string; mp4?: string; poster?: string }>> = {
  behance:   { webm: '/social/behance.webm',   mp4: '/social/behance.mp4',   poster: '/social/behance.jpg' },
  dribbble:  { webm: '/social/dribbble.webm',  mp4: '/social/dribbble.mp4',  poster: '/social/dribbble.jpg' },
  instagram: { webm: '/social/instagram.webm', mp4: '/social/instagram.mp4', poster: '/social/instagram.jpg' },
}

// Projects, cases and archive live in ./cases.ts (data model for /work).

// ─── Home hero · "Home · v0" (6770:9448) ─────────────────────────────────────
export const HOME = {
  name: 'Juan C. Fresno',
  title: 'Independent Art Director & Interactive Designer',
  disciplines: 'Digital products — Art direction — Interaction design — Brand identity — Things.',
  intro: 'Inquieto y autodidacta. Diseño desde 2012 y sigo aprendiendo cada semana, porque este oficio no se está quieto.',
  figures: [
    { label: 'Agencias/Estudios', value: '+30' },
    { label: 'Marcas', value: '+50' },
    { label: 'Proyectos', value: '+100' },
  ],
}

// ─── Page intros (one line under the nav, from the v0 frames) ────────────────
export const INTROS = {
  work: 'Proyectos de los últimos años: marcas, webs y producto digital. Unos con estudios y agencias, otros mano a mano con la marca.',
  feed: 'Lo último que he ido publicando: piezas sueltas, procesos y cosas que no llegan a caso. Por fecha.',
  lab: 'Lo que hago cuando nadie me lo pide: experimentos, apps propias y recursos. Aquí es donde aprendo, y a veces sale algo que acaba en un proyecto.',
  contact: '¿Hacemos algo juntos?',
}

export const LAB = [
  { name: 'Tracker', what: 'Time tracking for iPhone and Mac.', status: 'En desarrollo', year: '2026' },
  { name: 'Medida', what: 'Expenses app for iOS.', status: 'iOS', year: null },
  { name: 'FORMA', what: null, status: null, year: null },
  { name: 'GLYF', what: null, status: null, year: null },
  { name: 'Panel', what: null, status: null, year: '2026' },
]

// Lab experiments: each one is a live demo here plus its source in the public repo.
// Files live in public/lab/<slug>/ (buttons.css, buttons.js, snippet.html, prompt.md).
export const EXPERIMENTS = [
  {
    slug: 'botones',
    n: '001',
    name: 'Botones',
    kind: 'Interacción',
    year: '2026',
    what: 'Cuatro botones con interacción: magnético, columnas, rodillo y scramble. Sin dependencias, listos para copiar o para pedírselos a Claude.',
    how: 'CSS y unas 80 líneas de JavaScript sin librerías. Funcionan con teclado, respetan «reducir movimiento» y se adaptan al tema con dos variables.',
    css: 'buttons.css',
    js: 'buttons.js',
    init: 'fresnoButtons', // global init fn: window[init](root) → cleanup
    files: ['buttons.css', 'buttons.js', 'snippet.html'],
    repo: null as string | null, // public GitHub folder, once the repo exists
  },
  {
    slug: 'transiciones',
    n: '002',
    name: 'Transiciones',
    kind: 'Navegación',
    year: '2026',
    what: 'Veintidós transiciones entre páginas sobre una web de prueba, para verlas una al lado de otra antes de elegir. De la 11 a la 16 la retícula se ve: la página se desmonta sobre sus 12 columnas y la nueva se monta encima. De la 11a a la 11f, seis variantes del wireframe intermedio para comparar ritmos. Las dos con ★ son las que recomiendo.',
    how: 'JavaScript sin librerías con la Web Animations API: un overlay por encima de la página y el cambio de página cuando está tapada. Las de retícula miden la página real (márgenes, medianil, columnas y la caja de cada elemento; la retícula es la de esta web: margen 64 y medianil 16 a 1680, líquida) y trabajan con clones recortados por celdas o columnas. Con «reducir movimiento» todo es instantáneo y el glitch no se reproduce nunca. Esta web usa ahora la 05 (píxeles) entre páginas.',
    css: 'transitions.css',
    js: 'transitions.js',
    init: 'fresnoTransitions',
    files: ['transitions.css', 'transitions.js', 'snippet.html'],
    repo: null as string | null,
  },
]

// ─── About · "About · Desktop" (6770:10229) ───────────────────────────────────
export const ABOUT = {
  role: 'Independent Art Director & Interactive Designer',
  // First sentence is highlighted; the rest reads in the muted tone (as in Figma).
  bioLead: 'Diseño para pantallas desde 2012, y desde 2016 trabajo como independiente en Valencia.',
  bioRest: 'Soy inquieto y bastante autodidacta. He pasado por agencias, consultoras y estudios pequeños; he diseñado para banca, moda, hoteles y energía, y he dado clase de diseño de interfaces. Cuando no tengo proyecto, me invento uno: en el Lab están mis apps y experimentos. Me engancha que este oficio cambie cada año; siempre hay algo nuevo que aprender. Lo justo, bien hecho.',
  services: [
    { name: 'Dirección de arte', text: 'Le doy a una marca o a un producto una línea visual clara, y me aseguro de que llega intacta hasta la última pantalla.', tags: 'Concepto · Dirección visual · Sistemas visuales · Supervisión creativa' },
    { name: 'Diseño web e interacción', text: 'Webs con movimiento, pensadas para entenderse y disfrutarse. Las llevo a producción con desarrolladores de confianza.', tags: 'Diseño web · Interacción · Motion · Prototipos · Framer · QA visual' },
    { name: 'Producto digital', text: 'Apps y plataformas que se entienden a la primera: estructura, flujos, interfaz y sistema de diseño.', tags: 'Interfaz · Flujos · Prototipos · Design systems' },
    { name: 'Identidad de marca', text: 'Identidades pensadas para la pantalla, que aguantan en cualquier formato.', tags: 'Identidad · Rebranding · Logotipo · Sistemas de marca · Guías' },
  ],
  studios: 'Fjord (Accenture Song), Hanzo, VML, Saffron, Goodrebels, Wildbytes, Audax Studio y otros.',
  brands: 'BBVA, Deutsche Bank, Iberdrola, Meliá, Google, Coca-Cola, Movistar, Orange, Seat, Dior, H&M, Sephora, Pull & Bear, Real Madrid C.F., LaLiga, MotoGP, Correos, Acciona, Cepsa, Room Mate Hotels, Standard Chartered, Burger King, Uno de 50 y otras.',
  process: [
    { n: '01', name: 'Entender', text: 'Antes de abrir Figma busco la pregunta difícil: qué tiene que resolver esto y para quién.' },
    { n: '02', name: 'Dirección', text: 'Propongo una dirección clara, no diez. La defiendo y la ajustamos juntos.' },
    { n: '03', name: 'Diseño', text: 'Diseño, prototipo y pruebo pronto. Uso IA para explorar más rápido; decidir sigue siendo cosa mía.' },
    { n: '04', name: 'Producción', text: 'Me quedo hasta que está publicado y se ve como se diseñó.' },
  ],
  experience: [
    { name: 'Fresno©', role: 'Estudio independiente', how: 'Propio', years: '2016 — hoy' },
    { name: 'Forebound', role: 'Dirección creativa y de producto', how: 'Freelance', years: '2025 — hoy' },
    { name: 'Saffron', role: 'Diseño', how: 'Freelance', years: '2026' },
    { name: 'VML', role: 'Diseño de producto', how: 'Freelance', years: '2021 — 2022' },
    { name: 'Fjord · Accenture Song', role: 'Diseño', how: 'Freelance', years: '2019 — 2023' },
    { name: 'Wildbytes', role: 'Diseño web e interacción', how: 'Freelance', years: '2019 — 2021' },
    { name: 'Trazos', role: 'Profesor de UI/UX', how: 'Docencia', years: '2018 — 2020' },
    { name: 'Hanzo', role: 'Visual Designer', how: 'En plantilla', years: '2016 — 2018' },
    { name: 'Redbility', role: 'Visual Designer', how: 'En plantilla', years: '2016' },
    { name: 'Hermanos Clever', role: 'UI & UX Designer', how: 'En plantilla', years: '2014 — 2016' },
    { name: 'The Cocktail (hoy VML)', role: 'UI & UX Designer', how: 'En plantilla', years: '2014' },
    { name: 'Onestic', role: 'UI & UX Designer', how: 'En plantilla', years: '2012 — 2014' },
  ],
  // Photos from the About frame, downloaded from Figma into public/images/about/.
  photos: [
    { src: '/images/about/setup.webp', w: 1000, h: 563, alt: 'Puesto de trabajo' },
    { src: '/images/about/poster.webp', w: 1200, h: 789, alt: 'Póster enmarcado apoyado en la pared' },
    { src: '/images/about/juan.webp', w: 400, h: 400, alt: 'Juan C. Fresno' },
  ],
}

export const CONTACT = {
  kicker: '{ hablemos ↘ }',
  title: 'Contacto',
  text: '¿Tienes un proyecto en mente? Me encantaría saber más. Escríbeme y hablamos.',
}
