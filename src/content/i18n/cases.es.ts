// ─── Work copy (Spanish): index rows, archive and cases ──────────────────────
// Same shape as cases.en.ts (WorkDict). Source: copy-web-v1-es.md (8 Nov
// 2026). Neutral fields (Behance links, note coordinates, draft/copyEn flags)
// come from the English case by spread. Context and decisions are stored for
// every case, but render only where `copyEn` is true (same visibility as in
// English until Juan decides, question 1 of the ES doc).
// The archive isn't duplicated: the English rows go through a vocabulary map
// (category, role, via and the descriptor after the project name), as the
// copy doc asks; its table is the expected result.
import type { ArchiveRow, Case, CaseSlug } from '../cases'
import { WORK_EN, type WorkDict } from './cases.en'

const CATEGORY: Record<string, string> = {
  'Brand · Design System': 'Marca · Sistema de diseño',
  'Brand Identity': 'Identidad de marca',
  'Art Direction · Hospitality': 'Dirección de arte · Hoteles',
  'Web · Art Direction': 'Web · Dirección de arte',
  'Digital Product': 'Producto digital',
  'Brand Identity · Web': 'Identidad de marca · Web',
  'Campaign · Digital': 'Campaña · Digital',
  'Digital Product · Web': 'Producto digital · Web',
  Interactive: 'Interactivo',
  'Digital Product · UX': 'Producto digital · UX',
  'Digital Product · Design System': 'Producto digital · Sistema de diseño',
  Interaction: 'Interacción',
  Teaching: 'Docencia',
  'UX · Presentation': 'UX · Presentación',
}
const ROLE: Record<string, string> = {
  Design: 'Diseño',
  'Look & feel · visual development': 'Look & feel · desarrollo visual',
  'Web visual line': 'Línea visual web',
  'Art Direction · Visual Design': 'Dirección de arte · Diseño visual',
  'Visual proposals · brandbook': 'Propuestas visuales · brandbook',
  'Digital designer (support)': 'Diseñador digital (apoyo)',
  'Visual design': 'Diseño visual',
  'Design / UX': 'Diseño / UX',
  'Digital product & UX': 'Producto digital y UX',
  'UX · design system': 'UX · sistema de diseño',
  'UI / interaction design': 'UI / diseño de interacción',
  'UI/UX teacher': 'Profesor de UI/UX',
  'Graphic line': 'Línea gráfica',
}
const VIA: Record<string, string> = {
  Direct: 'Directo',
  'Accenture · via Malt': 'Accenture · vía Malt',
  'Fjord · Accenture Song (via Arelance)': 'Fjord · Accenture Song (vía Arelance)',
}
// Proper names stay; only the descriptor after "·" (or a generic row) changes.
const PROJECT: Record<string, string> = {
  'El Zorro Gris · design retainer': 'El Zorro Gris · iguala de diseño',
  'Deone · website': 'Deone · web',
  'Bal Ventures · website': 'Bal Ventures · web',
  'Fudigital · emails & checkout': 'Fudigital · emails y checkout',
  'Access · rebrand': 'Access · rebranding',
  'Educa Projects · rebrand': 'Educa Projects · rebranding',
  'H&N · visual universe': 'H&N · universo visual',
  'Klapper · case sheets': 'Klapper · fichas de casos',
  'Likitech · rebrand': 'Likitech · rebranding',
  'Entradium · redesign + covers': 'Entradium · rediseño + portadas',
  'IVF Life · brandbook, posters, templates': 'IVF Life · brandbook, carteles, plantillas',
  'Kuzidesign · website + branding': 'Kuzidesign · web + branding',
  Undisclosed: 'Confidencial',
  'Deutsche Bank · AEM migration': 'Deutsche Bank · migración a AEM',
  'DCN · website': 'DCN · web',
  'Creand · websites': 'Creand · webs',
  'OnTheRoad · tourism': 'OnTheRoad · turismo',
  'UX mobile / desktop + design system': 'UX móvil / escritorio + sistema de diseño',
  'H&M · microsite': 'H&M · micrositio',
  'Universidad Europea · search & newsletters': 'Universidad Europea · buscador y newsletters',
  'Roadis · website': 'Roadis · web',
  'App animations': 'Animaciones de app',
  'UI/UX classes': 'Clases de UI/UX',
  'Femm · website': 'Femm · web',
  'Beer & Food · website': 'Beer & Food · web',
  'Blink Shell · iOS / macOS app': 'Blink Shell · app iOS / macOS',
  'Room Mate · website': 'Room Mate · web',
  'Live@BBVA Net Cash CIB · CX · board presentation': 'Live@BBVA Net Cash CIB · CX · presentación al comité',
  'Applus iTeuve · iOS / Android app': 'Applus iTeuve · app iOS / Android',
}
const tr = (m: Record<string, string>, v: string) => m[v] ?? v
const ARCHIVE: ArchiveRow[] = WORK_EN.ARCHIVE.map((r) => ({
  ...r,
  project: tr(PROJECT, r.project),
  via: tr(VIA, r.via),
  category: tr(CATEGORY, r.category),
  role: tr(ROLE, r.role),
}))

const EN = WORK_EN.CASES
const d = (title: string, text: string) => ({ title, text })

const CASES: Record<CaseSlug, Case> = {
  shoeciety: {
    ...EN.shoeciety,
    meta: '2018 · Proyecto personal',
    chips: ['App', 'Interacción', 'Diseño de producto'],
    lead: 'Una app para quienes viven las zapatillas. Diseño mínimo para que el producto sea lo único que importe.',
    ficha: { client: 'Proyecto personal', year: '2018', role: 'Diseño de producto · UI' },
    question: '¿Cómo se diseña una tienda de zapatillas en la que la zapatilla sea lo único que importa?',
    context: {
      lead: 'Concepto propio de 2018, pensado para quienes viven las zapatillas.',
      text: 'Una app de producto con una idea fija: la interfaz da un paso atrás para que mande la zapatilla. Simple, mínima, el producto primero.',
    },
    decisions: [
      d('El producto manda', 'Fondos neutros y mucho aire. La zapatilla es el único color en pantalla.'),
      d('La marca, como acento', 'Cada marca pone su color solo en momentos concretos, nunca en toda la interfaz.'),
      d('Navegación mínima', 'Pocas pantallas y gestos claros, para llegar al producto sin pasos de más.'),
    ],
    credits: 'Diseño y dirección de arte: Juan C. Fresno · Proyecto personal · 2018 · Destacado en Behance.',
    recognition: 'Destacado en Behance.',
    notes: EN.shoeciety.notes && {
      ...EN.shoeciety.notes,
      items: EN.shoeciety.notes.items.map((n, i) => ({
        ...n,
        ...[
          d('03 · Navegación mínima', 'Pocas pantallas y gestos claros, para llegar al producto sin pasos de más.'),
          d('01 · El producto manda', 'Fondos neutros y mucho aire. La zapatilla es el único color en pantalla.'),
          d('02 · La marca, como acento', 'Cada marca pone su color solo en momentos concretos, nunca en toda la interfaz.'),
          d('Contexto', 'La interfaz da un paso atrás para que mande la zapatilla.'),
        ][i],
      })),
    },
  },
  signflow: {
    ...EN.signflow,
    meta: '2026 · Producto SaaS',
    chips: ['SaaS', 'Fintech', 'Legal tech'],
    lead: 'SaaS de firma digital: un proceso rígido y complejo convertido en un flujo claro, guiado y que escala.',
    ficha: { client: 'Signflow', year: '2026', role: 'UX · Producto · Diseño UI' },
    question: '¿Cómo se convierte la firma de un contrato, un proceso legal y rígido, en un flujo que cualquiera completa sin dudar?',
    context: {
      lead: 'Plataforma SaaS de firma digital para empresas.',
      text: 'El producto quita fricción a la firma de documentos con una experiencia clara, guiada y escalable, tanto para equipos internos como para usuarios externos. La UX pone primero la claridad, la confianza y la eficiencia, en entornos profesionales y legales.',
    },
    decisions: [
      d('Un paso cada vez', 'El envío de un documento se guía por partes: documento, destinatarios y campos, sin pantallas cargadas.'),
      d('Plantillas para escalar', 'Los contratos que se repiten se guardan como plantillas reutilizables.'),
      d('Confianza al firmar', 'La firma, el momento crítico, en una pantalla clara: escribir o dibujar, y confirmar.'),
    ],
    credits: 'Diseño y dirección de arte: Juan C. Fresno · Cliente: Signflow · 2026',
  },
  likitech: {
    ...EN.likitech,
    meta: '2025 · Rebranding',
    chips: ['Identidad de marca', 'B2B'],
    lead: 'Rebranding de una empresa industrial B2B: claridad, estructura y un único sistema visual para digital e impresión.',
    ficha: { client: 'Likitech', via: 'Aspid', year: '2025', role: 'Dirección de arte · Diseño visual' },
    question: '¿Cómo se ordena la marca de una empresa industrial para que aguante igual en un catálogo que en una pantalla?',
    context: {
      lead: 'Rebranding de Likitech, empresa industrial B2B, con la agencia Aspid en 2025.',
      text: 'Un sistema visual pensado para digital e impresión: logotipo, color, tarjetas, catálogos de producto, web y redes.',
    },
    credits: 'Diseño y dirección de arte: Juan C. Fresno · Estudio: Aspid · Cliente: Likitech · 2025',
  },
  access: {
    ...EN.access,
    meta: '2025 · Branding',
    chips: ['Identidad visual'],
    lead: 'Rebranding de Access, una marca de recursos humanos, con Audax Studio.',
    ficha: { client: 'Access', via: 'Audax Studio', year: '2025', role: 'Branding' },
    context: {
      lead: 'Rebranding hecho con Audax Studio en 2025.',
      text: 'Access es una marca de recursos humanos que gira en torno a crear conexiones y oportunidades a través de las personas. Un sistema visual flexible para digital e impresión.',
    },
    decisions: [
      d('Geometría y confianza', 'Formas geométricas y una paleta de azul y negro para transmitir equilibrio, confianza y estructura, lo que importa en recursos humanos.'),
      d('Un lenguaje que se adapta', 'Un sistema flexible que funciona igual en digital y en impresión, con claridad y coherencia en toda la experiencia de marca.'),
    ],
    credits: 'Diseño y dirección de arte: Juan C. Fresno · Estudio: Audax Studio · Cliente: Access · 2025',
  },
  'educa-projects': {
    ...EN['educa-projects'],
    meta: '2025 · Branding',
    chips: ['Identidad visual'],
    lead: 'Rebranding de Educa Projects, una marca educativa, con Audax Studio.',
    ficha: { client: 'Educa Projects', via: 'Audax Studio', year: '2025', role: 'Branding' },
    context: {
      lead: 'Rebranding hecho con Audax Studio en 2025.',
      text: 'Educa Projects es una marca educativa que impulsa el crecimiento profesional con formación especializada. Un sistema visual flexible para digital e impresión.',
    },
    decisions: [
      d('Formas que avanzan', 'Formas dinámicas y un azul intenso que hablan de progreso y conocimiento. Tipografía limpia y actual para reforzar su carácter digital y profesional.'),
    ],
    credits: 'Diseño y dirección de arte: Juan C. Fresno · Estudio: Audax Studio · Cliente: Educa Projects · 2025',
  },
  dinamo: {
    ...EN.dinamo,
    meta: '2024 · Naming y branding',
    chips: ['Naming', 'Branding'],
    lead: 'Nombre e identidad visual para una empresa eléctrica: logotipo, manual de marca y aplicaciones.',
    ficha: { client: 'Empresa eléctrica', year: '2024', role: 'Naming · Identidad visual' },
    question: '¿Cómo se le pone nombre a una empresa eléctrica para que no suene como todas las del sector?',
    context: {
      lead: 'Naming y branding para una empresa de instalaciones eléctricas.',
      text: 'Antes de dibujar nada, un análisis del sector, del mercado y del público para fijar una posición. Después, el nombre, el logotipo, el manual de marca y un sistema de identidad para digital e impresión.',
    },
    decisions: [
      d('Primero, el nombre', 'El nombre sale del análisis del sector y del posicionamiento, antes que cualquier forma.'),
      d('Mono y verde eléctrico', 'Space Mono como voz tipográfica. Negros y grises de base, verde como acento, amarillo y azul de apoyo.'),
      d('Una marca que se aplica', 'Un sistema coherente para digital e impresión: tarjetas, cinta de marca, ropa y packaging.'),
    ],
    credits: 'Diseño y dirección de arte: Juan C. Fresno · Cliente: Empresa eléctrica · 2024',
  },
  bonamar: {
    ...EN.bonamar,
    meta: '2024 · Logotipo',
    chips: ['Logotipo', 'Branding'],
    lead: 'Logotipo para un restaurante familiar abierto desde 1988. La M la escribe a mano la madre del propietario.',
    ficha: { client: 'Bonamar · restaurante', year: '2024', role: 'Logotipo' },
    question: '¿Cómo se mete la historia de una familia en un logotipo sin tener que contarla?',
    context: {
      lead: 'Logotipo para Bonamar, un restaurante abierto desde 1988.',
      text: 'Todo gira alrededor de una letra: la M del nombre, sacada tal cual de la letra de la madre del propietario.',
    },
    decisions: [
      d('La M, de su puño y letra', 'La M sale de la escritura de la madre del propietario. Es el vínculo emocional del logotipo y lo que lo hace único.'),
    ],
    credits: 'Diseño y dirección de arte: Juan C. Fresno · Cliente: Bonamar · restaurante · 2024',
  },
  awen: {
    ...EN.awen,
    meta: '2024 · Web corporativa',
    chips: ['Web'],
    lead: 'Interfaz para la web corporativa de una agencia de marketing.',
    ficha: { client: 'Awen · agencia de marketing', year: '2024', role: 'UI · UX' },
    context: {
      lead: 'La interfaz de la web corporativa de Awen, una agencia de marketing.',
      text: 'Home, servicios, trabajos, nosotros, contacto y 404, en escritorio y móvil.',
    },
    credits: 'Diseño y dirección de arte: Juan C. Fresno · Cliente: Awen · agencia de marketing · 2024',
  },
  correos: {
    ...EN.correos,
    meta: '2024 · Propuesta',
    chips: ['UI', 'Diseño web'],
    lead: 'Propuestas de línea visual para Correos Prepago: web, app e iconografía.',
    ficha: { client: 'Correos', via: 'Goodrebels', year: '2024', role: 'UI · Diseño web' },
    context: {
      lead: 'Propuestas de interfaz para Correos Prepago, presentadas para Goodrebels.',
      text: 'Una tarjeta prepago con web y app propias. Las láminas recogen la línea visual propuesta: amarillo de marca, azul de apoyo, fotografía e iconos de línea.',
    },
    credits: 'Diseño y dirección de arte: Juan C. Fresno · Estudio: Goodrebels · Cliente: Correos · 2024',
  },
  'selected-logos': {
    ...EN['selected-logos'],
    meta: '2024 · Selección',
    chips: ['Logotipo', 'Marca'],
    lead: 'Selección de logotipos y marcas, vol. 1. Quince marcas, una por lámina.',
    ficha: { client: 'Varios', year: '2024', role: 'Diseño de logotipos' },
    credits: 'Diseño y dirección de arte: Juan C. Fresno · Cliente: Varios · 2024',
  },
  'casa-carbon': {
    ...EN['casa-carbon'],
    meta: '2022 · Branding',
    chips: ['Branding', 'Packaging'],
    lead: 'Marca para una cocina fantasma con el pollo como protagonista. Humo, hierro, carbón y brasas.',
    ficha: { client: 'Casacarbón', year: '2022', role: 'Identidad · Packaging' },
    question: '¿Cómo se hace cercana una marca que no tiene sala, solo cocina?',
    context: {
      lead: 'Casacarbón es una marca de cocina fantasma que va de lo familiar y lo cercano, como la comida de tu abuela. Manda el pollo; también huevos y tortillas.',
      text: 'Logotipo, packaging (bolsas y cajas), una pequeña adaptación a web y anuncios para redes.',
    },
    decisions: [
      d('Humo, hierro, carbón y brasas', 'La marca se apoya en cuatro materias del horno. Son también su paleta: blanco, gris hierro, negro y rojo brasa.'),
      d('El horno, en el centro', 'El horno, tan propio de esta cocina, pasa a ser el símbolo que acompaña al logotipo.'),
      d('Packaging con voz', 'El logotipo se adapta a bolsas y cajas, con sellos redondos y mensajes en el tono de la marca.'),
    ],
    credits: 'Diseño y dirección de arte: Juan C. Fresno · Cliente: Casacarbón · 2022',
  },
  google: {
    ...EN.google,
    meta: '2016 · Proyecto personal',
    chips: ['UI', 'UX', 'Web'],
    lead: 'Rediseño conceptual de la búsqueda de Google: más limpia, más actual y sin dejar de ser Google.',
    ficha: { client: 'Proyecto personal', year: '2016', role: 'UI · UX' },
    question: '¿Cuánto se puede modernizar la búsqueda de Google sin que deje de parecer Google?',
    context: {
      lead: 'Concepto propio de 2016. No es un encargo.',
      text: 'Una experiencia más limpia y una interfaz actual, sin perder el estilo de Google. El concepto recorre la portada y los resultados de web, imágenes, noticias, mapas y libros, además del traductor.',
    },
    decisions: [
      d('La búsqueda, sola en portada', 'Un campo, una pregunta («What are you looking for?») y el azul de Google a pantalla completa.'),
      d('Un color por vertical', 'Web en azul, imágenes en amarillo, noticias en rojo y mapas en verde: los cuatro colores de la marca ordenan los resultados.'),
    ],
    credits: 'Diseño y dirección de arte: Juan C. Fresno · Proyecto personal · 2016 · Destacado en la galería UI/UX de Behance. Todas las imágenes del diseño pertenecen a sus propietarios.',
  },
  'super-nintendo': {
    ...EN['super-nintendo'],
    meta: '2016 · Proyecto personal',
    chips: ['Web', 'UI', 'UX'],
    lead: 'Una experiencia digital para Nintendo: un viaje por NES, Game Boy y Super Nintendo.',
    ficha: { client: 'Proyecto personal', year: '2016', role: 'Web · UI · UX' },
    question: '¿Cómo se cuenta la historia de Nintendo con la tecnología de hoy?',
    context: {
      lead: 'Concepto propio de 2016. No es un encargo.',
      text: 'Nintendo Classics es una vuelta atrás: la historia de NES, Game Boy y Super Nintendo y sus personajes clásicos, con la opción de convertir la Smart TV en una consola clásica. Una experiencia pensada para cualquier dispositivo.',
    },
    decisions: [
      d('La historia como recorrido', 'NES, Game Boy y Super Nintendo, consola a consola, con sus juegos y sus personajes.'),
      d('El móvil, como mando', '«Your phone, your controller»: el teléfono se convierte en el mando de cada consola.'),
      d('La Smart TV, como consola', 'La tele pasa a ser una consola clásica: eliges plataforma y juegas a los clásicos.'),
    ],
    credits: 'Diseño y dirección de arte: Juan C. Fresno · Proyecto personal · 2016 · Destacado en la galería UI/UX de Behance. Todas las imágenes del diseño pertenecen a sus propietarios.',
  },
}

export const WORK_ES: WorkDict = {
  PROJECTS: {
    signflow: { name: 'Signflow', discipline: 'SaaS · Fintech · Legal tech', client: 'Signflow' },
    access: { name: 'Access', discipline: 'Identidad visual', client: 'Audax Studio' },
    'educa-projects': { name: 'Educa Projects', discipline: 'Identidad visual', client: 'Audax Studio' },
    likitech: { name: 'Likitech', discipline: 'Identidad de marca · B2B', client: 'vía Aspid' },
    'nda-banca': { name: 'Banca · producto digital', discipline: 'Diseño de producto', client: 'vía agencia' },
    dinamo: { name: 'Dinamo', discipline: 'Naming · Branding', client: 'Empresa eléctrica' },
    bonamar: { name: 'Bonamar', discipline: 'Logotipo · Branding', client: 'Bonamar · restaurante' },
    awen: { name: 'Awen', discipline: 'Web', client: 'Awen · agencia de marketing' },
    correos: { name: 'Correos', discipline: 'UI · Diseño web', client: 'vía Goodrebels' },
    'selected-logos': { name: 'Selected Logos', discipline: 'Logotipo · Marca', client: 'Varios' },
    'casa-carbon': { name: 'Casacarbón', discipline: 'Branding · Packaging', client: 'Casacarbón' },
    'nda-moda': { name: 'Moda · campaña digital', discipline: 'Dirección de arte', client: 'vía agencia' },
    'nda-energia': { name: 'Energía · sistema visual', discipline: 'Sistema visual', client: 'vía agencia' },
    shoeciety: { name: 'Shoeciety', discipline: 'App · Interacción', client: 'Proyecto personal' },
    google: { name: 'Google Search', discipline: 'UI · UX · Web', client: 'Proyecto personal' },
    'super-nintendo': { name: 'Nintendo Classics', discipline: 'Web · UI · UX', client: 'Proyecto personal' },
  },
  ARCHIVE,
  CASES,
}
