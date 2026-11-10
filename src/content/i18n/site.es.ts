// ─── Site copy (Spanish) ──────────────────────────────────────────────────────
// Same shape as site.en.ts (SiteDict): a missing key fails tsc. Source:
// copy-web-v1-es.md (Comercial y marca, 8 Nov 2026), versions A (hero, About)
// as in English, implemented key by key. Proper names, studio and brand lists
// and historic in-house titles stay as in English.
import { SITE_EN, type SiteDict } from './site.en'

export const SITE_ES: SiteDict = {
  PERSON: {
    ...SITE_EN.PERSON,
    role: 'Director de arte y diseñador interactivo independiente',
    location: 'Valencia, España',
    replies: { text: 'Respondo en 24 h', pending: true },
  },

  // ─── Metadatos por página (copy doc · SEO ES) ──────────────────────────────
  META: {
    home: {
      title: 'Juan C. Fresno — Director de arte y diseñador interactivo independiente',
      description: 'Director de arte y diseñador interactivo independiente, en Valencia. Más de 15 años diseñando productos digitales, marcas y webs.',
    },
    work: {
      title: 'Proyectos',
      description: 'Casos seleccionados y el archivo completo desde 2016: diseño de producto digital, identidad de marca y webs para estudios, agencias y marcas.',
    },
    about: {
      title: 'Sobre mí',
      description: 'Director de arte freelance en Valencia. He trabajado con estudios como Fjord, VML, Hanzo y Saffron, y con marcas como BBVA, Deutsche Bank y Meliá.',
    },
    feed: {
      title: 'Feed',
      description: 'Piezas sueltas, procesos y experimentos visuales de Juan C. Fresno, director de arte y diseñador web en Valencia.',
    },
    lab: {
      title: 'Lab',
      description: 'Experimentos de interacción, código abierto y apps propias. Donde construyo cosas yo mismo, sin brief.',
    },
    journal: {
      title: 'Notas',
      description: 'Notas sobre dirección de arte, interacción y cómo dirigir la IA en el trabajo de diseño.',
    },
    contact: {
      title: 'Contacto',
      description: '¿Estudio o agencia? Escribe a hello@juancfresno.com o reserva una llamada de 15 minutos. Diseñador freelance en Valencia, en remoto.',
    },
    notFound: { title: 'No encontrado' },
  },

  // ─── Home · hero (versión A) ───────────────────────────────────────────────
  HOME: {
    // «Hola» abre la versión española: el bucle empieza y vuelve a «Hola».
    greetings: ['Hola', 'Hello', 'Bon dia', 'Kaixo', 'Olá', 'Bonjour', 'Ciao', 'Hallo', 'Hej'],
    nameLine: 'soy Juan C. Fresno',
    // Non-breaking space after «y»: a line never ends on the conjunction.
    title: 'Director de arte y\u00a0diseñador interactivo independiente',
    disciplines: ['Dirección de arte', 'Diseño digital', 'Experiencia de usuario', 'Identidad de marca', 'Motion e interacción', 'Sistemas de diseño'],
    intro: 'Diseño productos digitales, marcas y webs desde 2012. Trabajo desde Valencia, en remoto, con estudios, agencias y marcas de cualquier tamaño: de la primera idea visual a la última interacción. Lo justo, bien hecho.',
    meta: ['Valencia, España · En remoto', 'Estudios · Agencias · Marcas'],
    signature: 'Lo justo, bien hecho.',
    arcoHint: 'Arrastra ↔ · Scroll',
    labLines: {
      botones: 'Cuatro botones con intención: magnético, columnas, rodillo y scramble.',
      transiciones: '22 transiciones de página, una al lado de otra. La 11a es la que usa esta web.',
      galerias: 'Ocho formas de enseñar 200 imágenes, montadas sobre el feed real.',
    },
    labels: {
      featured: '{ Proyectos destacados ↘',
      allWork: 'Todos los proyectos ↗',
      archive: 'Archivo ↗',
      feed: '{ Feed ↘',
      seeFeed: 'Ver el feed ↗',
      lab: '{ Lab ↘',
      enterLab: 'Entrar al Lab ↗',
    },
  },

  // ─── Intros de página ──────────────────────────────────────────────────────
  INTROS: {
    work: 'Una selección de los últimos años: marcas, webs y producto digital. Unos con estudios y agencias, otros mano a mano con la marca.',
    // Hero de /es/work (Figma 6951:13221). Traducción pendiente de revisar por Copywriter.
    workHero: 'Trabajando con estudios y marcas desde 2012.\nDirección de arte y diseño para producto digital, identidades y experiencias interactivas, con claridad, detalle e intención.',
    feed: 'Una selección de lo que publico: piezas sueltas, procesos y cosas que nunca llegaron a caso. Lo más reciente, primero.',
    lab: 'Lo que hago cuando nadie me lo pide. Construyo cosas yo mismo, sin brief: juego, rompo y aprendo con interacciones, layouts, pequeñas herramientas y mis propias apps. Me mantiene inquieto, y de vez en cuando algo acaba en un proyecto de cliente.',
    archive: 'La lista larga, desde que voy por mi cuenta, en 2016. Casi todo llegó a través de estudios y agencias, así que la columna «Vía» dice quién me llamó. Lo que está bajo NDA va sin nombre.',
    journal: 'Notas sobre el trabajo: decisiones, proceso y cómo dirijo la IA sin que se note. Las primeras entradas, pronto.',
  },

  // ─── Cierre global (salto de línea explícito, sin coma antes de «o») ───────
  CLOSE: {
    label: '{ Hablemos ↘',
    headline: '¿Te faltan manos\no te falta dirección?',
    sub: 'En los dos casos puedo ayudarte. Me sumo a estudios y agencias como un par de manos más, o llevo un proyecto de la primera idea a la última pantalla.',
    call: 'Reserva una llamada de 15 min ↗',
    small: 'Tarifas y dosier para agencias, bajo petición.',
  },

  CASE_CLOSE: {
    text: '¿Tienes algo parecido entre manos?\nHablemos 15 minutos.',
    nda: 'Los detalles, en una llamada.',
  },

  // ─── Contacto ──────────────────────────────────────────────────────────────
  CONTACT: {
    title: '¿Hacemos algo juntos?',
    write: {
      label: 'Escribir',
      text: 'Cuéntame qué es, para cuándo tiene que estar y, más o menos, el presupuesto.',
      promise: 'Respondo en 24 horas.',
    },
    talk: {
      label: 'Hablar',
      cta: 'Reserva una llamada de 15 min',
      text: 'Sin pitch y sin preparar nada. Vemos si encajamos.',
    },
    monoTail: 'Valencia, España · Trabajo en remoto',
    label: '{ Contacto ↘',
    doorWrite: 'Puerta 01 · Escribir',
    doorTalk: 'Puerta 02 · Hablar',
    modesLabel: '{ Cómo trabajo con estudios ↘',
    modes: [
      { id: 'embedded', name: 'Integrado', text: 'Dentro de tu equipo, con tus herramientas y tus rituales, durante semanas o meses.' },
      { id: 'overflow', name: 'Refuerzo', text: 'Cuando hay más trabajo que manos. En marca blanca, si lo necesitas.' },
      { id: 'whole', name: 'Proyecto completo', text: 'De la primera idea visual a la última interacción, con desarrolladores de confianza.' },
    ],
    small: 'Tarifas y dosier para agencias, bajo petición.',
  },

  // ─── Lab ───────────────────────────────────────────────────────────────────
  LAB_FEATURED: {
    slug: 'transiciones',
    head: '002 · Transiciones',
    meta: 'Navegación · 2026',
    text: '22 transiciones de página sobre una web de prueba, una al lado de otra, para elegir antes de comprometerse. De la 11 a la 16 se ve la retícula: la página se desmonta sobre sus 12 columnas y la siguiente se construye encima. La 11a fue idea mía (cae la retícula, se abren los medianiles, se llenan las columnas y las cajas se transforman) y es la transición que usa esta web.',
    live: 'Verla en vivo ↗',
    code: 'Código en GitHub ↗',
  },

  LAB_FEATURED_SPECS: [
    { k: 'Opciones', v: '22' },
    { k: 'Con retícula', v: '11 — 16' },
    { k: 'Favoritas', v: '★ 11a · 11d' },
    { k: 'En producción', v: '11a · Cae la retícula', accent: true },
    { k: 'Duración', v: '≈ 750 ms + ruta' },
  ],

  LAB_FEATURED_FRAMES: [
    { t: '0–186 ms', label: 'Caen las líneas' },
    { t: '120–286 ms', label: 'Se abren los medianiles' },
    { t: '190–355 ms', label: 'Se llenan las columnas' },
    { t: '≈ 750 ms', label: 'Las cajas se transforman · ruta' },
  ],

  LAB_LOG: ['Sin brief · hecho a mano', 'Último cambio · 11a → producción'],

  LAB_LABELS: {
    featured: '{ Destacado ↘',
    experiments: '{ Experimentos ↘',
    products: '{ Productos propios ↘',
    resources: '{ Recursos ↘',
    openSource: 'Código abierto · GitHub ↗',
    runs: 'Funciona en esta web ↗',
    repo: '$ git clone github.com/juancfresno/fresno-lab',
  },

  LAB: [
    { name: 'Tracker', what: 'Control de horas para iPhone y Mac.', status: 'En desarrollo · 2026', dot: 'live' },
    { name: 'Medida', what: 'Control de gastos para iOS.', status: 'iOS', dot: 'on' },
    { name: 'Panel', what: null, status: '2026', dot: 'off' },
    { name: 'FORMA', what: null, status: '—', dot: 'off' },
    { name: 'GLYF', what: null, status: '—', dot: 'off' },
  ],

  EXPERIMENTS: [
    {
      slug: 'botones',
      n: '001',
      name: 'Botones',
      kind: 'Interacción',
      year: '2026',
      what: 'Cuatro botones con intención: magnético, columnas, rodillo y scramble. Sin librerías, se usan con teclado y respetan «reducir movimiento». Cópialos o pásale el prompt a un agente de IA.',
      built: 'CSS + ~80 líneas de JS sin librerías',
      note: null,
      card: 'Cuatro botones con intención: magnético, columnas, rodillo y scramble. Sin librerías, se usan con teclado y respetan «reducir movimiento». Cópialos o pásale el prompt a un agente de IA.',
      how: 'CSS y unas 80 líneas de JavaScript, sin librerías. Funcionan con teclado, respetan «reducir movimiento» y siguen el tema con dos variables.',
    },
    {
      slug: 'transiciones',
      n: '002',
      name: 'Transiciones',
      kind: 'Navegación',
      year: '2026',
      what: '22 transiciones de página, una al lado de otra, para elegir antes de comprometerse. ★ 11a y 11d.',
      built: 'Web Animations API · sin librerías',
      note: '★ 11a y 11d',
      card: '22 transiciones de página, una al lado de otra, para elegir antes de comprometerse.',
      how: 'JavaScript sin librerías, sobre la Web Animations API: una capa por encima de la página, y la página cambia mientras está tapada. Las de retícula miden la página real (márgenes, medianil, columnas y la caja de cada elemento; la retícula es la de esta web, margen 64 y medianil 16 a 1680, líquida) y trabajan con clones recortados por celdas o columnas. Con «reducir movimiento» todo es instantáneo. Esta web usa la 11a, «cae la retícula», entre páginas.',
    },
    {
      slug: 'galerias',
      n: '003',
      name: 'Galerías',
      kind: 'Layout',
      year: '2026',
      what: 'Ocho formas de enseñar 200 imágenes, montadas sobre el feed real: arco, canvas infinito, láminas, tira, mazo, rejilla con zoom, barras y pasarela. ★ 02 Canvas infinito ya mueve el Feed; ★ 01 Arco ya mueve la Home.',
      built: 'Bucle rAF que duerme · virtualizado · zoom FLIP',
      note: '★ 02 Canvas infinito ya mueve el Feed · ★ 01 Arco ya mueve la Home',
      card: 'Ocho formas de enseñar 200 imágenes, montadas sobre el feed real: arco, canvas infinito, láminas, tira, mazo, rejilla con zoom, barras y pasarela.',
      how: 'JavaScript sin librerías: un bucle de requestAnimationFrame por galería que duerme cuando nada se mueve, solo transform y opacity, y virtualización (en el DOM solo existen las piezas visibles, así aguanta 200). El arco y la pasarela son CSS 3D: cada pieza se corta en tiras para poder curvarse o plegarse. Las imágenes cargan según aparecen, con miniaturas de 600 px y el archivo grande solo en el zoom. El zoom es un FLIP desde la miniatura. Con «reducir movimiento» cada galería pasa a ser una rejilla quieta. La versión pública usa imágenes generadas.',
    },
  ],

  // ─── Sobre mí ──────────────────────────────────────────────────────────────
  ABOUT: {
    role: 'Director de arte y diseñador interactivo independiente',
    professional: {
      label: '{ Profesional ↘',
      caption: 'Juan trabajando',
      paragraphs: [
        'Soy director de arte y diseñador interactivo independiente, en Valencia. Diseño para pantallas desde 2012: primero en plantilla, en estudios de Valencia y Madrid; por mi cuenta desde 2016.',
        'Trabajo con estudios, agencias y marcas, grandes y pequeñas. Mi foco es el mismo en todas partes: una dirección visual clara, una interacción bien pensada y productos digitales que no solo se vean bien, sino que funcionen con sentido.',
      ],
    },
    personal: {
      label: '{ Personal ↘',
      caption: 'Juan fuera de la pantalla',
      paragraph: 'Inquieto y bastante autodidacta. Diseño desde 2012 y sigo aprendiendo cada semana: este oficio no se está quieto. Cuando no tengo proyecto, me invento uno; mis apps y experimentos están en el Lab. También di clase de UI/UX durante dos años, y quien más aprendió fui yo.',
      offScreen: { text: 'Fuera de la pantalla: bici de montaña por la costa, gimnasio en casa y más horas de PS5 de las que admitiría.', pending: true },
      footnote: { before: 'También hago objetos urbanos impresos en 3D con otro nombre: ', link: 'Biako ↗', href: 'https://www.instagram.com/biakone', after: ' (@biakone)' },
    },
    servicesLabel: '{ Servicios ↘',
    services: [
      { name: 'Dirección de arte', text: 'Una línea visual clara para una marca o un producto, que llega intacta hasta la última pantalla.', tags: 'Concepto · Dirección visual · Sistemas visuales · Supervisión creativa' },
      { name: 'Diseño web e interactivo', text: 'Webs con movimiento, pensadas para entenderse y disfrutarse. Las llevo a producción con desarrolladores de confianza.', tags: 'Diseño web · Interacción · Motion · Prototipos · Framer · QA visual' },
      { name: 'Producto digital', text: 'Apps y plataformas que se entienden a la primera: estructura, flujos, interfaz y sistema de diseño.', tags: 'Interfaz · Flujos · Prototipos · Sistemas de diseño' },
      { name: 'Identidad de marca', text: 'Identidades pensadas para la pantalla, que aguantan en cualquier formato.', tags: 'Identidad · Rebranding · Logotipo · Sistemas de marca · Guías de marca' },
    ],
    servicesLink: 'Tarifas y dosier para agencias, bajo petición ↘',
    studiosSentence: 'Por el camino he trabajado con estudios y agencias como estos, en marcas como estas.',
    studiosLabel: '{ Estudios y agencias ↘',
    studios: SITE_EN.ABOUT.studios,
    brandsLabel: '{ Marcas ↘',
    brands: SITE_EN.ABOUT.brands,
    brandsTail: 'y otras.',
    experienceLabel: '{ Experiencia ↘',
    figures: [
      { value: '20+', label: 'Estudios y agencias' },
      { value: '60+', label: 'Marcas' },
      { value: '2012', label: 'Desde' },
    ],
    experience: [
      { name: 'Independiente (Fresno©)', role: 'Estudio independiente', how: 'Propio', years: '2016—hoy' },
      { name: 'Forebound', role: 'Dirección creativa y de producto', how: 'Freelance', years: '2025—hoy' },
      { name: 'Saffron', role: 'Diseño', how: 'Freelance', years: '2026' },
      { name: 'Hanzo', role: 'Diseño', how: 'Freelance', years: '2021, 2025', draft: true },
      { name: 'Audax Studio', role: 'Identidad de marca', how: 'Freelance', years: '2024—2025', draft: true },
      { name: 'Emascaro Crossmedia', role: 'Dirección de arte · Hoteles', how: 'Freelance', years: '2024—2025', draft: true },
      { name: 'Accenture Technology', role: 'Línea visual web', how: 'Freelance', years: '2024', draft: true },
      { name: 'Truman Digital', role: 'Diseño', how: 'Freelance', years: '2024', draft: true },
      { name: 'Aspid', role: 'Identidad de marca', how: 'Freelance', years: '2023—2024', draft: true },
      { name: 'VML', role: 'Diseño de producto', how: 'Freelance', years: '2021—2022' },
      { name: 'Fjord · Accenture Song', role: 'Diseño', how: 'Freelance', years: '2019—2023' },
      { name: 'Muskae Design', role: 'Producto digital y UX', how: 'Freelance', years: '2020—2021', draft: true },
      { name: 'Brands&Roses', role: 'Diseño visual', how: 'Freelance', years: '2019—2021', draft: true },
      { name: 'Wildbytes', role: 'Diseño web e interacción', how: 'Freelance', years: '2019—2021' },
      { name: 'Trazos', role: 'Profesor de UI/UX', how: 'Docencia', years: '2018—2020' },
      { name: 'Hanzo', role: 'Visual Designer', how: 'En plantilla', years: '2016—2018' },
    ],
    beforeLine: 'Antes de ir por mi cuenta, pasé cuatro años en plantilla en estudios de Valencia y Madrid.',
    before: [
      { name: 'Redbility', role: 'Visual Designer', how: 'En plantilla', years: '2016' },
      { name: 'Hermanos Clever', role: 'UI & UX Designer', how: 'En plantilla', years: '2014—2016' },
      { name: 'The Cocktail (hoy VML)', role: 'UI & UX Designer', how: 'En plantilla', years: '2014' },
      { name: 'Onestic', role: 'UI & UX Designer', how: 'En plantilla', years: '2012—2014' },
    ],
    dossier: { text: 'Dosier para agencias — bajo petición ↘', href: 'mailto:hello@juancfresno.com?subject=Dosier%20para%20agencias' },
    photos: [
      { ...SITE_EN.ABOUT.photos[0], alt: 'Puesto de trabajo' },
      { ...SITE_EN.ABOUT.photos[1], alt: 'Póster enmarcado apoyado en la pared' },
      { ...SITE_EN.ABOUT.photos[2], alt: 'Juan C. Fresno' },
    ],
  },

  // ─── 404 ───────────────────────────────────────────────────────────────────
  NOT_FOUND: {
    title: '404',
    line: 'Aquí no hay nada. Seguramente lo recorté yo.',
    home: 'Volver al inicio ↘',
    work: 'Ver proyectos ↘',
  },
}
