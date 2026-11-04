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
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/juancfresno' },
  { label: 'Instagram', href: 'https://instagram.com/juanc.fresno' },
  { label: 'Behance', href: 'https://www.behance.net/juancfresno' },
  { label: 'Dribbble', href: 'https://dribbble.com/JuanCFresno' },
  { label: 'X', href: 'https://x.com/JuanCFresno' },
]

export type Project = {
  slug: string
  name: string
  discipline: string
  year: string | null
  client: string | null
  studio: string | null // "para @estudio"
  url: string | null
  featured?: boolean
  caseStudy?: boolean
  cover: string // image under /public/images
}

// Names and disciplines as listed today on /projects ("09 cases").
// Years, clients, studios and links are still to be confirmed by Juan.
export const PROJECTS: Project[] = [
  { slug: 'bbva', name: 'BBVA', discipline: 'Digital Product', year: null, client: 'BBVA', studio: null, url: null, featured: true, caseStudy: true, cover: '/images/01.webp' },
  { slug: 'google', name: 'Google', discipline: 'Art Direction', year: null, client: 'Google', studio: null, url: null, featured: true, caseStudy: true, cover: '/images/02.webp' },
  { slug: 'la-liga', name: 'La Liga', discipline: 'Interaction Design', year: null, client: 'La Liga', studio: null, url: null, featured: true, caseStudy: true, cover: '/images/03.webp' },
  { slug: 'repsol', name: 'Repsol', discipline: 'Product Design', year: null, client: 'Repsol', studio: null, url: null, cover: '/images/04.webp' },
  { slug: 'acciona', name: 'Acciona', discipline: 'Brand Identity', year: null, client: 'Acciona', studio: null, url: null, cover: '/images/05.webp' },
  { slug: 'coca-cola', name: 'Coca-Cola', discipline: 'Web Experience', year: null, client: 'Coca-Cola', studio: null, url: null, cover: '/images/06.webp' },
  { slug: 'iberdrola', name: 'Iberdrola', discipline: 'Visual System', year: null, client: 'Iberdrola', studio: null, url: null, cover: '/images/07.webp' },
  { slug: 'telefonica', name: 'Telefónica', discipline: 'Campaign', year: null, client: 'Telefónica', studio: null, url: null, cover: '/images/08.webp' },
  { slug: 'vodafone', name: 'Vodafone', discipline: 'Creative Direction', year: null, client: 'Vodafone', studio: null, url: null, cover: '/images/09.webp' },
]

export const LAB = [
  { name: 'Tracker', what: 'Time tracking for iPhone and Mac.', status: 'En desarrollo', year: '2026' },
  { name: 'Medida', what: 'Expenses app for iOS.', status: 'iOS', year: null },
  { name: 'FORMA', what: null, status: null, year: null },
  { name: 'GLYF', what: null, status: null, year: null },
  { name: 'Panel', what: null, status: null, year: '2026' },
]

export const ABOUT = {
  // Current /about copy, verbatim (missing accents fixed).
  bio: [
    'Desde 2012 trabajo de forma independiente como Art Director & Digital Designer, colaborando con marcas, agencias y equipos en proyectos digitales de distinta escala.',
    'Trabajo desde Valencia, España, adaptándome a diferentes contextos, ritmos y formas de trabajo, tanto con clientes pequeños como con grandes organizaciones.',
    'Mi foco está en definir líneas visuales claras, cuidar la interacción y construir productos digitales que no solo se vean bien, sino que funcionen con sentido.',
  ],
  // Proposed in the architecture doc; pending Juan's copy.
  modes: [
    { name: 'Marca blanca', text: 'Diseño dentro del proyecto del estudio, que firma el trabajo.' },
    { name: 'Refuerzo de equipo', text: 'Me integro en el equipo durante unas semanas.' },
    { name: 'Proyecto entero', text: 'Llevo la dirección de arte de principio a fin.' },
  ],
  services: [
    { name: 'Dirección Creativa & Arte', text: 'Defino la dirección visual de marcas y productos digitales, estableciendo un criterio claro y coherente desde el concepto hasta la ejecución.', tags: 'Art direction · Visual direction · Concept development · Visual systems · Creative guidance' },
    { name: 'Producto Digital', text: 'Diseño productos y experiencias digitales claras, funcionales y bien pensadas, cuidando tanto la estructura como la interacción y el detalle visual.', tags: 'UI design · Interaction design · Product thinking · Prototyping · User flows · Design systems' },
    { name: 'Branding', text: 'Creo y desarrollo identidades visuales sólidas que funcionan en contextos digitales y se adaptan a distintos formatos y necesidades.', tags: 'Brand identity · Rebranding · Logo design · Visual identity · Brand systems · Guidelines' },
    { name: 'Desarrollo web', text: 'Desarrollo webs funcionales y bien ejecutadas, colaborando con perfiles técnicos para llevar el diseño a producción con fidelidad y calidad.', tags: 'Frontend collaboration · Web implementation · Framer · CMS · Developer handoff · QA visual' },
  ],
  // Verbatim from /about. "VML KingeClient" and "Cinces Capitol" look like typos: Juan to confirm.
  studios: ['Invisible Geeks', 'Accenture Song', 'Fjord', 'Hanzo', 'VML KingeClient', 'Wildbytes'],
  clients: ['Acciona', 'Bankia', 'BBVA', 'Cepsa', 'Cinces Capitol', 'Coca-Cola', 'Correos', 'Google', 'Iberdrola', 'La Liga', 'Moto GP', 'Movistar', 'Orange', 'Pull & Bear', 'Real Madrid C.F.', 'Room Mate Hotels', 'Standard Chartered', 'Uno de 50', 'Sephora', 'Burger King', 'Melia'],
  tools: 'Figma · Notion · Claude · Swift · Framer',
}

export const CONTACT = {
  kicker: '{ hablemos ↘ }',
  title: 'Contacto',
  text: '¿Tienes un proyecto en mente? Me encantaría saber más. Escríbeme y hablamos.',
}
