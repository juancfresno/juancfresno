// ─── Work: index, cases and archive ───────────────────────────────────────────
// Source: Figma file AXxkCCuckrXGKDUCk8lNyQ.
//   · Index rows: "Work · v0" (page ↪ Visual, node 6770:9563), frame "02 · Índice".
//   · Case copy and stats: one frame per case in page ↪ Casos ("Caso · <name>").
//     Copy is taken as it is in Figma; layers marked "· borrador" there are
//     flagged `draft: true` here (rendered the same, kept for the copy review).
//   · Images and their order: the "Behance · bloque" of each case frame; files
//     are built by scripts/build-media.mjs into public/work/<slug>/.
import media from './generated/cases-media.json'

export type Img = { src: string; w: number; h: number }

export type Note = {
  title: string
  text: string
  // Coordinates in the Figma block (1552 px wide), top-left origin.
  dot: [number, number]
  end: [number, number]
  card: [number, number]
}

export type Case = {
  meta: string // "2018 · Concepto propio"
  title: string // big title on the case page (may differ from the index name)
  lead: string
  ficha: { cliente: string; año: string; rol: string; disciplina: string }
  question?: string
  context?: { lead: string; text: string }
  decisions?: { title: string; text: string }[]
  draft?: boolean
  stats: { value: string; label: string }[]
  published: string
  credits: string
  behance?: string
  notes?: { blockHeight: number; items: Note[] }
}

export type Project = {
  slug: string
  name: string
  discipline: string
  client: string // client / studio column
  year: string
  nda?: boolean
  caseStudy?: boolean
  featured?: boolean
}

const M = media as Record<string, { cover: Img; images: Img[] }>
export const caseMedia = (slug: string) => M[slug]

// ─── Index (Work · v0, newest first) ──────────────────────────────────────────
export const PROJECTS: Project[] = [
  { slug: 'signflow', name: 'Signflow', discipline: 'SaaS · Fintech · Legal tech', client: 'Signflow', year: '2026', caseStudy: true, featured: true },
  { slug: 'access', name: 'Access', discipline: 'Identidad visual', client: 'Audax Studio', year: '2025', caseStudy: true },
  { slug: 'educa-projects', name: 'Educa Projects', discipline: 'Identidad visual', client: 'Audax Studio', year: '2025', caseStudy: true },
  { slug: 'likitech', name: 'Likitech', discipline: 'Brand Identity · B2B', client: 'vía Aspid', year: '2025', caseStudy: true, featured: true },
  { slug: 'nda-banca', name: 'Banca · producto digital', discipline: 'Product Design', client: 'vía agencia', year: '2024', nda: true },
  { slug: 'dinamo', name: 'Dinamo', discipline: 'Branding', client: 'Empresa eléctrica', year: '2024', caseStudy: true },
  { slug: 'bonamar', name: 'Bonamar', discipline: 'Branding', client: 'Bonamar · restaurante', year: '2024', caseStudy: true },
  { slug: 'awen', name: 'Awen', discipline: 'Web', client: 'Awen · agencia de marketing', year: '2024', caseStudy: true },
  { slug: 'correos', name: 'Correos', discipline: 'UI · Diseño web', client: 'vía Goodrebels', year: '2024', caseStudy: true },
  { slug: 'selected-logos', name: 'Selected Logos', discipline: 'Logo · Marca', client: 'Varios', year: '2024', caseStudy: true },
  { slug: 'casa-carbon', name: 'Casa Carbon', discipline: 'Branding', client: 'Casacarbón', year: '2022', caseStudy: true },
  { slug: 'nda-moda', name: 'Moda · campaña digital', discipline: 'Art Direction', client: 'vía agencia', year: '2022', nda: true },
  { slug: 'nda-energia', name: 'Energía · sistema visual', discipline: 'Visual System', client: 'vía agencia', year: '2021', nda: true },
  { slug: 'shoeciety', name: 'Shoeciety', discipline: 'App · Interacción', client: 'Concepto propio', year: '2018', caseStudy: true, featured: true },
  { slug: 'google', name: 'Google', discipline: 'UI · UX · Web', client: 'Concepto propio', year: '2016', caseStudy: true },
  { slug: 'super-nintendo', name: 'Super Nintendo', discipline: 'Web · UI · UX', client: 'Concepto propio', year: '2016', caseStudy: true },
]

// ─── Archive: the rest, compact (names as listed on today's /projects) ───────
// Years and studios still to be confirmed by Juan.
export const ARCHIVE: { name: string; discipline: string; year: string | null }[] = [
  { name: 'BBVA', discipline: 'Digital Product', year: null },
  { name: 'La Liga', discipline: 'Interaction Design', year: null },
  { name: 'Repsol', discipline: 'Product Design', year: null },
  { name: 'Acciona', discipline: 'Brand Identity', year: null },
  { name: 'Coca-Cola', discipline: 'Web Experience', year: null },
  { name: 'Iberdrola', discipline: 'Visual System', year: null },
  { name: 'Telefónica', discipline: 'Campaign', year: null },
  { name: 'Vodafone', discipline: 'Creative Direction', year: null },
]

// ─── Cases ────────────────────────────────────────────────────────────────────
export const CASES: Record<string, Case> = {
  shoeciety: {
    meta: '2018 · Concepto propio',
    title: 'Shoeciety',
    lead: 'Una app para quienes viven las zapatillas. Diseño mínimo para que el producto sea lo único que importe.',
    ficha: { cliente: 'Concepto propio', año: '2018', rol: 'Product Design · UI', disciplina: 'App · Interacción' },
    question: '¿Cómo se diseña una tienda de zapatillas en la que la zapatilla sea lo único que importa?',
    context: {
      lead: 'Concepto propio de 2018, pensado para quienes viven las zapatillas.',
      text: 'Una app de producto con una idea fija: la interfaz da un paso atrás para que la zapatilla mande. Diseño simple y mínimo, centrado en el producto.',
    },
    decisions: [
      { title: 'El producto manda', text: 'Fondos neutros y mucho aire. La zapatilla es la única nota de color en pantalla.' },
      { title: 'La marca, como acento', text: 'Cada marca aporta su color solo en momentos concretos, nunca en toda la interfaz.' },
      { title: 'Navegación mínima', text: 'Pocas pantallas y gestos claros para llegar al producto sin pasos de más.' },
    ],
    stats: [{ value: '61,3 mil', label: 'visitas' }, { value: '7,1 mil', label: 'valoraciones' }, { value: '320', label: 'comentarios' }],
    published: 'Publicado en Behance el 12 de junio de 2018. Etiquetas: app · UX · UI · sneakers · interface · product design · interaction.',
    credits: 'Diseño y dirección de arte: Juan C. Fresno · 2018 · Proyecto personal',
    // Annotations from "Caso · Shoeciety · v0" (6728:6380), block 6728:6425.
    notes: {
      blockHeight: 18410,
      items: [
        { title: '03 · Navegación mínima', text: 'Pocas pantallas y gestos claros para llegar al producto sin pasos de más.', dot: [778, 1245], end: [1056, 1099], card: [1056, 1060] },
        { title: '01 · El producto manda', text: 'Fondos neutros y mucho aire. La zapatilla es la única nota de color en pantalla.', dot: [988, 1964], end: [1196, 1699], card: [1196, 1660] },
        { title: '02 · La marca, como acento', text: 'Cada marca aporta su color solo en momentos concretos, nunca en toda la interfaz.', dot: [900, 4103], end: [360, 4377], card: [32, 4330] },
        { title: 'Contexto', text: 'La interfaz da un paso atrás para que la zapatilla mande.', dot: [1234, 6172], end: [384, 6509], card: [56, 6470] },
      ],
    },
  },
  signflow: {
    meta: '2026 · Producto SaaS',
    title: 'Signflow',
    lead: 'Plataforma SaaS de firma digital: un proceso complejo y rígido convertido en un flujo claro, guiado y escalable.',
    ficha: { cliente: 'Signflow', año: '2026', rol: 'UX · Product · UI Design', disciplina: 'SaaS · Fintech · Legal tech' },
    question: '¿Cómo se convierte firmar un contrato, un proceso rígido y legal, en un flujo que cualquiera completa sin dudar?',
    context: {
      lead: 'Plataforma SaaS de firma digital para empresas.',
      text: 'El producto reduce la fricción al firmar documentos con una experiencia clara, guiada y escalable, tanto para equipos internos como para usuarios externos. La UX prioriza claridad, confianza y eficiencia en entornos profesionales y legales.',
    },
    decisions: [
      { title: 'Un paso cada vez', text: 'El envío de un documento se guía por partes: documento, destinatarios y campos, sin pantallas cargadas.' },
      { title: 'Plantillas para escalar', text: 'Los contratos que se repiten se guardan como plantillas reutilizables.' },
      { title: 'Confianza al firmar', text: 'La firma, el momento crítico, en una pantalla clara: escribir o dibujar y confirmar.' },
    ],
    stats: [{ value: '416', label: 'visitas' }, { value: '18', label: 'valoraciones' }, { value: '4', label: 'comentarios' }],
    published: 'Publicado en Behance el 21 de enero de 2026. Herramienta: Figma. Etiquetas: SaaS · product design · UX design · UI design · B2B · digital signatures · fintech · legal tech · web app · design system.',
    credits: 'UX, product y UI design: Juan C. Fresno · Cliente: Signflow · 2026',
    behance: 'https://www.behance.net/gallery/241843645/Signflow-Secure-Digital-Signature-SaaS',
  },
  likitech: {
    meta: '2025 · Rebrand',
    title: 'Likitech',
    lead: 'Rebrand de una empresa industrial B2B: claridad, estructura y un sistema visual para digital y físico.',
    ficha: { cliente: 'Likitech · vía Aspid', año: '2025', rol: 'Art Direction · Visual Design', disciplina: 'Brand Identity · B2B' },
    question: '¿Cómo se ordena la marca de una empresa industrial para que aguante igual en un catálogo que en una pantalla?',
    context: {
      lead: 'Rebrand para Likitech, empresa industrial B2B, con la agencia Aspid en 2025.',
      text: 'Un sistema visual pensado para soportes digitales y físicos: logotipo, color, tarjetas, catálogos de producto, web y redes.',
    },
    stats: [{ value: '252', label: 'visitas' }, { value: '19', label: 'valoraciones' }, { value: '3', label: 'comentarios' }],
    published: 'Publicado en Behance el 4 de febrero de 2026. Etiquetas: brand identity · art direction · visual design · rebrand · industrial design · corporate branding · logo design · minimal.',
    credits: 'Art Direction & Visual Design: Juan C. Fresno · Agencia: Aspid · Cliente: Likitech · 2025',
  },
  access: {
    meta: '2025 · Branding',
    title: 'Access',
    lead: 'Rebranding de Access, marca de recursos humanos, para Audax Studio.',
    ficha: { cliente: 'Audax Studio', año: '2025', rol: 'Branding', disciplina: 'Identidad visual' },
    context: {
      lead: 'Rebranding para Audax Studio, publicado en Behance en noviembre de 2025.',
      text: 'Access es una marca de recursos humanos centrada en crear conexiones y oportunidades a través de las personas. Un sistema visual flexible para soportes digitales y físicos.',
    },
    decisions: [
      { title: 'Geometría y confianza', text: 'Formas geométricas y una paleta de azul y negro para transmitir equilibrio, confianza y estructura, valores clave en recursos humanos.' },
      { title: 'Un lenguaje que se adapta', text: 'Un sistema flexible que funciona igual en digital y en físico, con claridad y coherencia en toda la experiencia de marca.' },
    ],
    stats: [{ value: '572', label: 'visitas' }, { value: '44', label: 'valoraciones' }, { value: '10', label: 'comentarios' }],
    published: 'Publicado en Behance el 6 de noviembre de 2025. Herramientas: Photoshop e Illustrator. Etiquetas: branding · rebranding · visual identity · corporate design · human resources.',
    credits: 'Branding: Juan C. Fresno · Cliente: Audax Studio · 2025',
    behance: 'https://www.behance.net/gallery/238012619/Access-Rebranding',
  },
  'educa-projects': {
    meta: '2025 · Branding',
    title: 'Educa Projects',
    lead: 'Rebranding de Educa Projects, marca educativa, para Audax Studio.',
    ficha: { cliente: 'Audax Studio', año: '2025', rol: 'Branding', disciplina: 'Identidad visual' },
    context: {
      lead: 'Rebranding para Audax Studio, publicado en Behance en noviembre de 2025.',
      text: 'Educa Projects es una marca educativa que impulsa el crecimiento profesional con formación especializada. Un sistema visual flexible para soportes digitales y físicos.',
    },
    decisions: [
      { title: 'Formas que avanzan', text: 'Formas dinámicas y un azul intenso que simbolizan progreso y conocimiento. Tipografía limpia y actual para reforzar su carácter digital y profesional.' },
    ],
    stats: [{ value: '177', label: 'visitas' }, { value: '26', label: 'valoraciones' }, { value: '8', label: 'comentarios' }],
    published: 'Publicado en Behance el 5 de noviembre de 2025. Herramientas: Photoshop e Illustrator. Etiquetas: branding · visual identity · corporate identity · education · logo design.',
    credits: 'Branding: Juan C. Fresno · Cliente: Audax Studio · 2025',
  },
  dinamo: {
    meta: '2024 · Naming y branding',
    title: 'Dinamo',
    lead: 'Nombre e identidad visual para una empresa eléctrica: logotipo, manual de marca y sistema de aplicaciones.',
    ficha: { cliente: 'Empresa eléctrica', año: '2024', rol: 'Naming · Identidad visual', disciplina: 'Branding' },
    question: '¿Cómo se nombra a una empresa eléctrica para que no suene como todas las del sector?',
    context: {
      lead: 'Naming y branding para una empresa de instalaciones eléctricas.',
      text: 'Antes de dibujar nada, análisis del sector, del mercado y del público para fijar un posicionamiento. Después, el nombre, el logotipo, el manual de marca y un sistema de identidad para digital e impresión.',
    },
    decisions: [
      { title: 'Primero, el nombre', text: 'El nombre sale del análisis del sector y del posicionamiento, antes que cualquier forma.' },
      { title: 'Mono y verde eléctrico', text: 'Space Mono como voz tipográfica. Negros y grises de base, verde como acento, amarillo y azul de apoyo.' },
      { title: 'Una marca que se aplica', text: 'Un sistema coherente para digital e impresión: tarjetas, cinta de marca, textil y packaging.' },
    ],
    draft: true,
    stats: [{ value: '1,2 mil', label: 'visitas' }, { value: '146', label: 'valoraciones' }, { value: '25', label: 'comentarios' }],
    published: 'Publicado en Behance el 11 de septiembre de 2024. Etiquetas: logo design · logotype · mark · brand · identity · visual identity · branding.',
    credits: 'Naming, identidad y manual de marca: Juan C. Fresno · Illustrator, Photoshop, InDesign',
    behance: 'https://www.behance.net/gallery/207594623/Dinamo-Naming-Branding',
  },
  bonamar: {
    meta: '2024 · Logotipo',
    title: 'Bonamar',
    lead: 'Logotipo para un restaurante con historia desde 1988. La M está escrita a mano por la madre del propietario.',
    ficha: { cliente: 'Bonamar · restaurante', año: '2024', rol: 'Logotipo', disciplina: 'Branding' },
    question: '¿Cómo se mete la historia de una familia en un logotipo sin tener que contarla?',
    context: {
      lead: 'Logotipo para Bonamar, restaurante abierto desde 1988.',
      text: 'Todo gira alrededor de una letra: la M del nombre, tomada directamente de la escritura de la madre del propietario.',
    },
    decisions: [
      { title: 'La M, de su puño y letra', text: 'La M sale de la escritura de la madre del propietario. Es el vínculo emocional del logotipo y lo que lo hace único.' },
    ],
    draft: true,
    stats: [{ value: '428', label: 'visitas' }, { value: '39', label: 'valoraciones' }, { value: '6', label: 'comentarios' }],
    published: 'Publicado en Behance el 18 de septiembre de 2024. Etiquetas: logo design · logotype · mark · brand · restaurant · identity · visual identity.',
    credits: 'Logotipo: Juan C. Fresno',
  },
  awen: {
    meta: '2024 · Web corporativa',
    title: 'Awen',
    lead: 'Interfaz de usuario para la web corporativa de una agencia de marketing.',
    ficha: { cliente: 'Awen · agencia de marketing', año: '2024', rol: 'UI · UX', disciplina: 'Web' },
    context: {
      lead: 'Interfaz de usuario para la web corporativa de Awen, una agencia de marketing.',
      text: 'Home, servicios, trabajos, sobre nosotros, contacto y 404, en escritorio y móvil.',
    },
    draft: true,
    stats: [{ value: '323', label: 'visitas' }, { value: '16', label: 'valoraciones' }, { value: '2', label: 'comentarios' }],
    published: 'Publicado en Behance el 17 de septiembre de 2024. Etiquetas: ui ux · webdesign · ui design · user interface · landing page · agency · corporate.',
    credits: 'UI/UX: Juan C. Fresno · Figma',
  },
  correos: {
    meta: '2024 · Propuesta',
    title: 'Correos',
    lead: 'Propuestas de línea gráfica para la interfaz de Correos Prepago: web, app e iconografía.',
    ficha: { cliente: 'Correos · vía Goodrebels', año: '2024', rol: '—', disciplina: 'UI · Diseño web' },
    context: {
      lead: 'Propuestas de interfaz para Correos Prepago, presentadas para Goodrebels.',
      text: 'Una tarjeta prepago con web y app propias. Las láminas recogen la línea gráfica propuesta: amarillo de marca, azul de apoyo, fotografía e iconos de línea.',
    },
    stats: [{ value: '9,2 mil', label: 'visitas' }, { value: '443', label: 'valoraciones' }, { value: '83', label: 'comentarios' }],
    published: 'Publicado en Behance el 1 de febrero de 2024. Etiquetas: UI/UX · user interface · correos · clean · modern · proposal · presentation · business · marketing · advertising.',
    credits: 'Juan C. Fresno · Cliente: Goodrebels (Correos Prepago) · Illustrator · Figma',
  },
  'selected-logos': {
    meta: '2024 · Selección',
    title: 'Selected Logos',
    lead: 'Selección de logotipos y marcas, vol. 1. Quince marcas, una por lámina.',
    ficha: { cliente: 'Varios', año: '2024', rol: '—', disciplina: 'Logo · Marca' },
    stats: [{ value: '586', label: 'visitas' }, { value: '34', label: 'valoraciones' }, { value: '5', label: 'comentarios' }],
    published: 'Publicado en Behance el 23 de enero de 2024. Etiquetas: logos · logo collection · logofolio · brand identity · mark · monogram · logo design · branding · identity.',
    credits: 'Juan C. Fresno · Illustrator',
  },
  'casa-carbon': {
    meta: '2022 · Branding',
    title: 'Casacarbón',
    lead: 'Marca para una cocina fantasma con el pollo como protagonista. Humo, hierro, carbón y brasas.',
    ficha: { cliente: 'Casacarbón', año: '2022', rol: 'Identidad · Packaging', disciplina: 'Branding' },
    question: '¿Cómo se hace cercana una marca que no tiene sala, solo cocina?',
    context: {
      lead: 'Casacarbón es una marca bajo el concepto de cocina fantasma: lo familiar y lo cercano, como la comida de tu abuela. El pollo manda; también huevos y tortillas.',
      text: 'Logotipo, adaptaciones a packaging (bolsas y cajas), un pequeño ejercicio de adaptación a web y publicidad para redes sociales.',
    },
    decisions: [
      { title: 'Humo, hierro, carbón y brasas', text: 'La marca se apoya en cuatro materias del horno. Son también su paleta: blanco, gris hierro, negro y rojo brasa.' },
      { title: 'El horno, en el centro', text: 'El horno, tan característico de esta cocina, pasa a ser el símbolo que acompaña al logotipo.' },
      { title: 'Packaging con voz', text: 'El logotipo se adapta a bolsas y cajas, con sellos circulares y mensajes en el tono de la marca.' },
    ],
    draft: true,
    stats: [{ value: '820', label: 'visitas' }, { value: '86', label: 'valoraciones' }, { value: '8', label: 'comentarios' }],
    published: 'Publicado en Behance el 16 de marzo de 2022. Sin etiquetas.',
    credits: 'Identidad, packaging y redes: Juan C. Fresno · Photoshop, Illustrator, Affinity Designer, Figma',
  },
  google: {
    meta: '2016 · Concepto propio',
    title: 'Google Search',
    lead: 'Rediseño conceptual de la búsqueda de Google: una experiencia más limpia y una interfaz actual sin perder el estilo de Google.',
    ficha: { cliente: 'Concepto propio', año: '2016', rol: '—', disciplina: 'UI · UX · Web' },
    question: '¿Cuánto se puede modernizar la búsqueda de Google sin que deje de parecer Google?',
    context: {
      lead: 'Concepto propio de 2016. No es un encargo.',
      text: 'Una experiencia más limpia y una interfaz actual, sin perder el estilo de Google. El concepto recorre la portada y los resultados de web, imágenes, noticias, mapas y libros, además del traductor.',
    },
    decisions: [
      { title: 'La búsqueda, sola en portada', text: 'Un campo, una pregunta —«What are you looking for?»— y el azul de Google a pantalla completa.' },
      { title: 'Un color por vertical', text: 'Web en azul, imágenes en amarillo, noticias en rojo y mapas en verde: los cuatro colores de la marca ordenan los resultados.' },
    ],
    stats: [{ value: '113,6 mil', label: 'visitas' }, { value: '8,5 mil', label: 'valoraciones' }, { value: '607', label: 'comentarios' }],
    published: 'Publicado en Behance el 12 de julio de 2016. Destacado en la galería Interfaz y exp. de usuario. Etiquetas: ux · google · concept · search · google maps · google translate · google image · brand · website · ui.',
    credits: 'Diseño: Juan C. Fresno · 2016 · Concepto propio. Todas las imágenes del diseño pertenecen a sus propietarios.',
    behance: 'https://www.behance.net/gallery/40166825/Google-Search-Design-Concept',
  },
  'super-nintendo': {
    meta: '2016 · Concepto propio',
    title: 'Nintendo Classics',
    lead: 'Una nueva experiencia digital para Nintendo: un viaje por la historia de NES, Game Boy y Super Nintendo.',
    ficha: { cliente: 'Concepto propio', año: '2016', rol: '—', disciplina: 'Web · UI · UX' },
    question: '¿Cómo se cuenta la historia de Nintendo con la tecnología de hoy?',
    context: {
      lead: 'Concepto propio de 2016. No es un encargo.',
      text: 'Nintendo Classics es una vuelta al pasado: la historia de NES, Game Boy y Super Nintendo y sus personajes clásicos, con la opción de convertir la Smart TV en una consola clásica. Una experiencia pensada para todos los dispositivos.',
    },
    decisions: [
      { title: 'La historia como recorrido', text: 'NES, Game Boy y Super Nintendo, consola a consola, con sus juegos y sus personajes.' },
      { title: 'El móvil, como mando', text: '«Your phone, your controller»: el teléfono se convierte en el mando de cada consola.' },
      { title: 'La Smart TV, como consola', text: 'La tele pasa a ser una consola clásica: eliges plataforma y juegas a los clásicos.' },
    ],
    stats: [{ value: '42,6 mil', label: 'visitas' }, { value: '4,5 mil', label: 'valoraciones' }, { value: '251', label: 'comentarios' }],
    published: 'Publicado en Behance el 7 de noviembre de 2016. Destacado en la galería Interfaz y exp. de usuario. Herramientas: Photoshop, Illustrator, Sketch. Etiquetas: Nintendo · Super Mario · games · UI · interface · webdesign · concept · ux · game boy · Super Nintendo.',
    credits: 'Diseño: Juan C. Fresno · 2016 · Concepto propio. Todas las imágenes incluidas en el diseño pertenecen a sus propietarios.',
    behance: 'https://www.behance.net/gallery/44821191/Nintendo-Classics',
  },
}

export const CASE_PROJECTS = PROJECTS.filter((p) => p.caseStudy && CASES[p.slug])
export const projectNumber = (slug: string) => String(PROJECTS.findIndex((p) => p.slug === slug) + 1).padStart(2, '0')

// Rows for the index/hover components.
export const toRow = (p: Project) => ({
  key: p.slug,
  n: projectNumber(p.slug),
  name: p.name,
  discipline: p.discipline,
  client: p.client,
  year: p.year,
  nda: p.nda,
  href: p.caseStudy && CASES[p.slug] ? `/work/${p.slug}` : undefined,
  cover: p.caseStudy ? caseMedia(p.slug)?.cover : undefined,
})
