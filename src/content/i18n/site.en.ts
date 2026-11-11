// ─── Site copy (English) ──────────────────────────────────────────────────────
// Source: copy-web-v1.md (Comercial y marca, 8 Nov 2026), implemented
// verbatim. Anything still unresolved is `null` or `pending: true`; pages
// render it with the dashed <Pending /> tag so gaps stay visible.
// site.es.ts has the same shape (SiteDict): a missing key fails tsc.
// Locale-neutral data (email, socials, lab files) lives in ../site.ts.
import { PERSON_BASE } from '../person'

export const SITE_EN = {
  PERSON: {
    ...PERSON_BASE,
    role: 'Independent Art Director & Interactive Designer',
    location: 'Valencia, Spain',
    // "Replies within 24 h": pending until Juan confirms the promise.
    replies: { text: 'Replies within 24 h', pending: true },
  },

  // ─── Page metadata (copy doc · SEO) ───────────────────────────────────────────
  META: {
    home: {
      title: 'Juan C. Fresno — Independent Art Director & Interactive Designer',
      description: 'Independent Art Director & Interactive Designer based in Valencia. 15+ years shaping digital products, brands and websites.',
    },
    work: {
      title: 'Work',
      description: 'Selected case studies and the full archive since 2016: digital products, brand identities and websites for studios, agencies and brands.',
    },
    about: {
      title: 'About',
      description: 'Independent art director and interactive designer in Valencia. Studios like Fjord, VML, Hanzo and Saffron; brands like BBVA, Deutsche Bank and Meliá.',
    },
    feed: {
      title: 'Feed',
      description: 'Single pieces, work in progress and visual experiments by Juan C. Fresno, art director and interactive designer in Valencia.',
    },
    lab: {
      title: 'Lab',
      description: 'Interaction experiments, open code and my own apps. Where I build things myself, with no brief.',
    },
    journal: {
      title: 'Journal',
      description: 'Notes on art direction, interaction and directing AI in design work.',
    },
    contact: {
      title: 'Contact',
      description: 'Working with a studio or agency? Write to hello@juancfresno.com or book a 15-minute call. Based in Valencia, working remotely.',
    },
    notFound: { title: 'Not found' },
  },

  // ─── Home · hero (version A) ──────────────────────────────────────────────────
  HOME: {
    // "Hello" cycles on hover/focus; the slot is as wide as the widest word.
    greetings: ['Hello', 'Hola', 'Bon dia', 'Kaixo', 'Olá', 'Bonjour', 'Ciao', 'Hallo', 'Hej'],
    nameLine: 'I’m Juan C. Fresno',
    title: 'Independent Art Director & Interactive Designer',
    disciplines: ['Art Direction', 'Digital Design', 'User Experience', 'Brand Identity', 'Motion & Interaction', 'Design Systems'],
    intro: 'I’ve been designing digital products, brands and websites since 2012. I work from Valencia, remotely, with studios, agencies and brands of every size — from the first visual idea to the last interaction. Just enough, done right.',
    meta: ['Valencia, Spain · Remote', 'Studios · Agencies · Brands'],
    signature: 'Just enough, done right.',
    arcoHint: 'Drag ↔ · Scroll',
    labLines: {
      botones: 'Four buttons with a point of view: magnetic, columns, roller and scramble.',
      transiciones: '22 page transitions, side by side. 11a is the one this site uses.',
      galerias: 'Eight ways to show 200 images, built on the real feed.',
      'entradas-pixel': 'Six pixel entrances for the social hover preview, with the real clips.',
    } as Record<string, string>,
    labels: {
      featured: '{ Featured work ↘',
      allWork: 'All work ↗',
      archive: 'Archive ↗',
      feed: '{ Feed ↘',
      seeFeed: 'See the feed ↗',
      lab: '{ Lab ↘',
      enterLab: 'Enter the Lab ↗',
    },
  },

  // ─── Home v1 · Figma "home" 6949:12453, copy verbatim ────────────────────────
  LANDING: {
    line1: 'Hello! I’m Juan C. Fresno,',
    title: 'Independent Art Director & Interactive Designer',
    disciplines: 'Art direction — Digital products — Interaction — Brand identity',
    intro: ['Working with studios and brands since 2012.', 'Art direction and design for digital products, identities and interactive experiences — built with clarity, detail and intent.'],
    contactLabel: 'Let’s collaborate↘',
    contactLine: 'For enquiries, collaborations or new projects',
    feedLabel: '{ Latest from Instagram & Dribbble ↘',
    feedAria: 'Latest posts',
  },

  // ─── Page intros ──────────────────────────────────────────────────────────────
  INTROS: {
    work: 'Selected projects from recent years: brands, websites and digital products. Some with studios and agencies, some directly with the brand.',
    // Work page hero (Figma 6951:13221, Juan's text, 10 Nov 2026). Line break explicit.
    workHero: 'Working with studios and brands since 2012.\nArt direction and design for digital products, identities and interactive experiences — built with clarity, detail and intent.',
    feed: 'A selection of what I post: single pieces, work in progress and things that never became a case study. Newest first.',
    lab: 'This is where I build things myself, with no brief. I play, break things and learn: interactions, layouts, small tools and my own apps. It keeps me restless, and now and then something ends up in client work.',
    archive: 'The longer list, since I went independent in 2016. Most of it came through studios and agencies, so the Via column says who brought me in. Work under NDA stays unnamed.',
    journal: 'Notes on the work: decisions, process, and how I direct AI without it showing. First entries soon.',
  },

  // ─── Global close / pre-footer (every page except Contact and case ends) ─────
  CLOSE: {
    label: '{ Let’s talk ↘',
    headline: 'Short on hands,\nor short on direction?', // explicit line break
    sub: 'Either way, I can help. I join studios and agencies as an extra pair of hands, or take a project from the first idea to the last screen.',
    call: 'Book a 15-min call ↗',
    small: 'Rates and agency dossier on request.',
  },

  // Short close at the end of a case (after the next case).
  CASE_CLOSE: {
    text: 'Something similar in mind?\nLet’s talk for 15 minutes.', // explicit line break
    nda: 'Details on a call.',
  },

  // ─── Contact ──────────────────────────────────────────────────────────────────
  CONTACT: {
    title: 'Shall we make something together?',
    write: {
      label: 'Write',
      text: 'Tell me what it is, when it needs to ship and, roughly, the budget.',
      promise: 'I reply within 24 hours.', // pending, same promise as PERSON.replies
    },
    talk: {
      label: 'Talk',
      cta: 'Book a 15-min call',
      text: 'No pitch, no prep. We see if it’s a fit.',
    },
    monoTail: 'Valencia, Spain · Working remotely',
    label: '{ Contact ↘',
    doorWrite: 'Door 01 · Write',
    doorTalk: 'Door 02 · Talk',
    modesLabel: '{ How I work with studios ↘',
    modes: [
      { id: 'embedded', name: 'Embedded', text: 'Inside your team, with your tools and your rituals, for weeks or months.' },
      { id: 'overflow', name: 'Overflow', text: 'When there’s more work than hands. White label if you need it.' },
      { id: 'whole', name: 'Whole project', text: 'From the first visual idea to the last interaction, with developers I trust.' },
    ],
    small: 'Rates and agency dossier on request.',
  },

  // ─── Lab ──────────────────────────────────────────────────────────────────────
  LAB_FEATURED: {
    slug: 'transiciones',
    head: '002 · Transitions',
    meta: 'Navigation · 2026',
    text: '22 page transitions on a test site, side by side, to choose one before committing. In 11 to 16 the grid shows: the page takes itself apart over its 12 columns and the next one builds on top. 11a was my idea (the grid falls, gutters open, columns fill, boxes morph) and it’s the transition this site uses.',
    live: 'See it live ↗',
    code: 'Code on GitHub ↗',
  },

  // Featured specs table (Figma Lab v1.0, 6886:1142).
  LAB_FEATURED_SPECS: [
    { k: 'Options', v: '22' },
    { k: 'Grid-based', v: '11 — 16' },
    { k: 'Picks', v: '★ 11a · 11d' },
    { k: 'In production', v: '11a · The grid falls', accent: true },
    { k: 'Duration', v: '≈ 750 ms + route' },
  ],

  // The 4 frames of 11a drawn in the featured stage (real timings).
  LAB_FEATURED_FRAMES: [
    { t: '0–186 ms', label: 'Grid lines drop' },
    { t: '120–286 ms', label: 'Gutters open' },
    { t: '190–355 ms', label: 'Columns fill' },
    { t: '≈ 750 ms', label: 'Boxes morph · route' },
  ],

  LAB_LOG: ['No brief · built by hand', 'Last change · 11a → production'],

  LAB_LABELS: {
    featured: '{ Featured ↘',
    experiments: '{ Experiments ↘',
    products: '{ Own products ↘',
    resources: '{ Resources ↘',
    openSource: 'Open source · GitHub ↗',
    runs: 'Runs on this site ↗',
    repo: '$ git clone github.com/juancfresno/fresno-lab',
  },

  // Own products. `what: null` = Juan still owes the line (renders <Pending />).
  LAB: [
    { name: 'Tracker', what: 'Time tracking for iPhone and Mac.' as string | null, status: 'In development · 2026', dot: 'live' as 'live' | 'on' | 'off' },
    { name: 'Medida', what: 'Expense tracking for iOS.', status: 'iOS', dot: 'on' as const },
    { name: 'Panel', what: null, status: '2026', dot: 'off' as const },
    { name: 'FORMA', what: null, status: '—', dot: 'off' as const },
    { name: 'GLYF', what: null, status: '—', dot: 'off' as const },
  ],

  // Lab experiments: each one is a live demo here plus its source in the public repo.
  // Files live in public/lab/<slug>/ (css, js, snippet.html, prompt.md).
  EXPERIMENTS: [
    {
      slug: 'botones',
      n: '001',
      name: 'Buttons',
      kind: 'Interaction',
      year: '2026',
      what: 'Four buttons with a point of view: magnetic, columns, roller and scramble. No libraries, keyboard-friendly, respect reduced motion. Copy them, or hand the prompt to an AI agent.',
      built: 'CSS + ~80 lines of vanilla JS',
      note: null as string | null,
      card: 'Four buttons with a point of view: magnetic, columns, roller and scramble. No libraries, keyboard-friendly, respect reduced motion. Copy them, or hand the prompt to an AI agent.',
      how: 'CSS and about 80 lines of JavaScript, no libraries. They work with the keyboard, respect reduced motion and follow the theme through two variables.',
    },
    {
      slug: 'transiciones',
      n: '002',
      name: 'Transitions',
      kind: 'Navigation',
      year: '2026',
      what: '22 page transitions, side by side, to choose before committing. ★ 11a and 11d.',
      built: 'Web Animations API · no libraries',
      note: '★ 11a and 11d',
      card: '22 page transitions, side by side, to choose before committing.',
      how: 'JavaScript with no libraries, on the Web Animations API: an overlay above the page, and the page swaps while it is covered. The grid-based ones measure the real page (margins, gutter, columns and every element’s box; the grid is this site’s, margin 40 and gutter 16 at 1680, liquid) and work with clones clipped by cells or columns. With reduced motion everything is instant. This site uses 11a, “the grid falls”, between pages.',
    },
    {
      slug: 'galerias',
      n: '003',
      name: 'Galleries',
      kind: 'Layout',
      year: '2026',
      what: 'Eight ways to show 200 images, built on the real feed: arc, infinite canvas, plates, strip, deck, zoom grid, bars and runway. ★ 02 Infinite canvas now runs the Feed; ★ 01 Arc now runs the Home.',
      built: 'rAF loop that sleeps · virtualised · FLIP zoom',
      note: '★ 02 Infinite canvas now runs the Feed · ★ 01 Arc now runs the Home',
      card: 'Eight ways to show 200 images, built on the real feed: arc, infinite canvas, plates, strip, deck, zoom grid, bars and runway.',
      how: 'JavaScript with no libraries: one requestAnimationFrame loop per gallery that sleeps when nothing moves, only transform and opacity, and virtualisation (only the visible pieces exist in the DOM, so it holds 200). The arc and the runway are CSS 3D: each piece is cut into strips so it can curve or fold. Images load as they appear, with 600 px thumbnails and the large file only on zoom. The zoom is a FLIP from the thumbnail. With reduced motion every gallery becomes a still grid. The public version uses generated images.',
    },
    {
      slug: 'entradas-pixel',
      n: '004',
      name: 'Pixel entrances',
      kind: 'Motion',
      year: '2026',
      what: 'Six ways for the social hover preview to appear, with the real clips: the twelve columns it uses today, a fine bitmap, depixelate, 1-bit to colour, from the cursor and a CRT sweep. The exit is the entry played backwards. Pixel size, duration and easing per card.',
      built: 'WebGL2 · one shader · no libraries',
      note: '★ 02 Depixelate now runs the social hover preview' as string | null,
      card: 'Six ways for the social hover preview to appear, with the real clips: fine bitmap, depixelate, 1-bit to colour, from the cursor, CRT sweep, and the twelve columns it uses today.',
      how: 'One WebGL2 context for every card and one fragment shader with a branch per variant; each card copies its frame into its own canvas. The clip is a texture updated every frame, with mipmaps so the big blocks show the mean colour. Cells snap to device pixels and the thresholds are an 8×8 Bayer matrix. The exit is the entry played backwards, and switching halfway stays continuous. With reduced motion it is instant and the clip stays still; without WebGL2, a plain 2D preview.',
    },
  ],

  // ─── About ────────────────────────────────────────────────────────────────────
  ABOUT: {
    role: 'Independent Art Director & Interactive Designer',
    professional: {
      label: '{ Professional ↘',
      caption: 'Juan at work',
      paragraphs: [
        'I’m an independent art director and interactive designer based in Valencia. I’ve been designing for screens since 2012: first in-house at studios in Valencia and Madrid, on my own since 2016.',
        'I work with studios, agencies and brands, big and small. My focus is the same everywhere: a clear visual direction, interaction that’s thought through, and digital products that don’t just look good but make sense.',
      ],
    },
    personal: {
      label: '{ Personal ↘',
      caption: 'Juan off screen',
      paragraph: 'Restless and mostly self-taught. I’ve been designing since 2012 and I still learn something every week; this job doesn’t sit still. When there’s no project, I make one up: my apps and experiments live in the Lab. I also taught UI/UX for two years, which taught me more than it taught anyone.',
      // Pending: comes from memory, not from Figma; Juan confirms.
      offScreen: { text: 'Off screen: mountain biking along the coast, a home gym and more PS5 hours than I’d admit.', pending: true },
      footnote: { before: 'I also make 3D-printed urban objects under another name: ', link: 'Biako ↗', href: 'https://www.instagram.com/biakone', after: ' (@biakone)' },
    },
    servicesLabel: '{ Services ↘',
    services: [
      { name: 'Art Direction', text: 'A clear visual line for a brand or a product, carried intact all the way to the last screen.', tags: 'Concept · Visual direction · Visual systems · Creative supervision' },
      { name: 'Web & Interactive Design', text: 'Websites with motion, made to be understood and enjoyed. I take them to production with developers I trust.', tags: 'Web design · Interaction · Motion · Prototyping · Framer · Visual QA' },
      { name: 'Digital Product', text: 'Apps and platforms that make sense the first time: structure, flows, interface and design system.', tags: 'Interface · Flows · Prototyping · Design systems' },
      { name: 'Brand Identity', text: 'Identities built for screens that hold up in any format.', tags: 'Identity · Rebranding · Logo · Brand systems · Guidelines' },
    ],
    servicesLink: 'Rates and agency dossier on request ↘',
    studiosSentence: 'Along the way I’ve worked with studios and agencies like these, on brands like these.',
    studiosLabel: '{ Studios & agencies ↘',
    studios: ['Fjord (Accenture Song)', 'VML', 'Hanzo', 'Saffron', 'Forebound', 'Wildbytes', 'Audax Studio', 'Emascaro', 'Aspid', 'Muskae Design', 'Brands&Roses', 'Truman Digital', 'The Cocktail', 'Hermanos Clever', 'Redbility', 'Onestic'],
    brandsLabel: '{ Brands ↘',
    brands: ['BBVA', 'Deutsche Bank', 'Iberdrola', 'Meliá', 'Room Mate Hotels', 'Orange', 'Seat', 'Dior', 'H&M', 'Sephora', 'Guess', 'New Balance', 'Douglas', 'Bulgari', 'Securitas Direct', 'Codorníu', 'Correos', 'Universidad Europea', 'AECC', 'Applus+'],
    brandsTail: 'and others.',
    experienceLabel: '{ Experience ↘',
    figures: [
      { value: '20+', label: 'Studios & agencies' as string },
      { value: '60+', label: 'Brands' },
      { value: '2012', label: 'Since' },
    ],
    // `draft: true` = role inferred from invoices (copy doc [borrador]); shown the same.
    experience: [
      { name: 'Independent (Fresno©)', role: 'Independent studio', how: 'Own', years: '2016—now' },
      { name: 'Forebound', role: 'Creative & Product Direction', how: 'Freelance', years: '2025—now' },
      { name: 'Saffron', role: 'Design', how: 'Freelance', years: '2026' },
      { name: 'Hanzo', role: 'Design', how: 'Freelance', years: '2021, 2025', draft: true },
      { name: 'Audax Studio', role: 'Brand Identity', how: 'Freelance', years: '2024—2025', draft: true },
      { name: 'Emascaro Crossmedia', role: 'Art Direction · Hospitality', how: 'Freelance', years: '2024—2025', draft: true },
      { name: 'Accenture Technology', role: 'Web visual line', how: 'Freelance', years: '2024', draft: true },
      { name: 'Truman Digital', role: 'Design', how: 'Freelance', years: '2024', draft: true },
      { name: 'Aspid', role: 'Brand Identity', how: 'Freelance', years: '2023—2024', draft: true },
      { name: 'VML', role: 'Product Design', how: 'Freelance', years: '2021—2022' },
      { name: 'Fjord · Accenture Song', role: 'Design', how: 'Freelance', years: '2019—2023' },
      { name: 'Muskae Design', role: 'Digital Product & UX', how: 'Freelance', years: '2020—2021', draft: true },
      { name: 'Brands&Roses', role: 'Visual Design', how: 'Freelance', years: '2019—2021', draft: true },
      { name: 'Wildbytes', role: 'Web & Interaction Design', how: 'Freelance', years: '2019—2021' },
      { name: 'Trazos', role: 'UI/UX Teacher', how: 'Teaching', years: '2018—2020' },
      { name: 'Hanzo', role: 'Visual Designer', how: 'In-house', years: '2016—2018' },
    ] as { name: string; role: string; how: string; years: string; draft?: boolean }[],
    beforeLine: 'Before going independent, I spent four years in-house at studios in Valencia and Madrid.',
    before: [
      { name: 'Redbility', role: 'Visual Designer', how: 'In-house', years: '2016' },
      { name: 'Hermanos Clever', role: 'UI & UX Designer', how: 'In-house', years: '2014—2016' },
      { name: 'The Cocktail (now VML)', role: 'UI & UX Designer', how: 'In-house', years: '2014' },
      { name: 'Onestic', role: 'UI & UX Designer', how: 'In-house', years: '2012—2014' },
    ],
    dossier: { text: 'Agency dossier — on request ↘', href: 'mailto:hello@juancfresno.com?subject=Agency%20dossier' },
    // Photos from the About frame, downloaded from Figma into public/images/about/.
    photos: [
      { src: '/images/about/setup.webp', w: 1000, h: 563, alt: 'Desk setup' },
      { src: '/images/about/poster.webp', w: 1200, h: 789, alt: 'Framed poster leaning against the wall' },
      { src: '/images/about/juan.webp', w: 400, h: 400, alt: 'Juan C. Fresno' },
    ],
  },

  // ─── 404 ──────────────────────────────────────────────────────────────────────
  NOT_FOUND: {
    title: '404',
    line: 'Nothing here. Probably something I cut.',
    home: 'Back home ↘',
    work: 'See work ↘',
  },
}

export type SiteDict = Widen<typeof SITE_EN>
import type { Widen } from './ui.en'
