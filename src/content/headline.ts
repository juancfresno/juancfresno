// ─── Hero headline in other languages (hover / tap cycle) ─────────────────────
// Locale-neutral, safe for client bundles. Each entry is the hero's FIRST line
// in one language: a greeting + "I'm Juan C. Fresno" (the name stays in Latin
// script). The role line never changes (it stays in the page locale). The
// page's own line comes first from its dictionary (site.*.ts); these follow
// it (components/home/HeadlineCycle). Translations: Desarrollo, 10 Nov 2026,
// pending review by Comercial y marca.
// `script` picks the system font fallback (Switzer has no Cyrillic or CJK).

export type HeadlineLine = { lang: string; a: string; script?: 'cyrl' | 'cjk' }

export const HEADLINES: HeadlineLine[] = [
  { lang: 'en', a: 'Hello! I’m Juan C. Fresno,' },
  { lang: 'es', a: '¡Hola! Soy Juan C. Fresno,' },
  { lang: 'ca', a: 'Bon dia! Soc Juan C. Fresno,' },
  { lang: 'eu', a: 'Kaixo! Juan C. Fresno naiz,' },
  { lang: 'pt', a: 'Olá! Sou o Juan C. Fresno,' },
  { lang: 'fr', a: 'Bonjour ! Je suis Juan C. Fresno,' },
  { lang: 'it', a: 'Ciao! Sono Juan C. Fresno,' },
  { lang: 'de', a: 'Hallo! Ich bin Juan C. Fresno,' },
  { lang: 'sv', a: 'Hej! Jag är Juan C. Fresno,' },
  { lang: 'ru', a: 'Привет! Я — Juan C. Fresno,', script: 'cyrl' },
  { lang: 'zh-Hans', a: '你好！我是 Juan C. Fresno，', script: 'cjk' },
  { lang: 'ja', a: 'こんにちは！Juan C. Fresno です。', script: 'cjk' },
]

// The cycle for a page: its own lines first (from the locale dictionary), then
// every other language in the order above.
export function headlineCycle(own: HeadlineLine): HeadlineLine[] {
  return [own, ...HEADLINES.filter((l) => l.lang !== own.lang)]
}
