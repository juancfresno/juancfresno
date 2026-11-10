// ─── Hero headline in other languages (hover / tap cycle) ─────────────────────
// Locale-neutral, safe for client bundles. Each entry is the two hero lines in
// one language: a greeting + "I'm Juan C. Fresno" (the name stays in Latin
// script) and the role. The page's own locale comes first from its dictionary
// (site.*.ts); these are the visual variants that follow it
// (components/home/HeadlineCycle). Translations: Desarrollo, 10 Nov 2026,
// pending review by Comercial y marca. es = the closed Spanish role.
// `script` picks the system font fallback (Switzer has no Cyrillic or CJK).

export type HeadlineLine = { lang: string; a: string; b: string; script?: 'cyrl' | 'cjk' }

export const HEADLINES: HeadlineLine[] = [
  { lang: 'en', a: 'Hello! I’m Juan C. Fresno,', b: 'Independent Art Director & Interactive Designer' },
  { lang: 'es', a: '¡Hola! Soy Juan C. Fresno,', b: 'Director de arte y diseñador interactivo independiente' },
  { lang: 'ca', a: 'Bon dia! Soc Juan C. Fresno,', b: 'Director d’art i dissenyador interactiu independent' },
  { lang: 'eu', a: 'Kaixo! Juan C. Fresno naiz,', b: 'Arte-zuzendari eta diseinatzaile interaktibo independentea' },
  { lang: 'pt', a: 'Olá! Sou o Juan C. Fresno,', b: 'Diretor de arte e designer interativo independente' },
  { lang: 'fr', a: 'Bonjour ! Je suis Juan C. Fresno,', b: 'Directeur artistique et designer interactif indépendant' },
  { lang: 'it', a: 'Ciao! Sono Juan C. Fresno,', b: 'Art director e designer interattivo indipendente' },
  { lang: 'de', a: 'Hallo! Ich bin Juan C. Fresno,', b: 'Unabhängiger Art Director und Interaction Designer' },
  { lang: 'sv', a: 'Hej! Jag är Juan C. Fresno,', b: 'Oberoende art director och interaktionsdesigner' },
  { lang: 'ru', a: 'Привет! Я — Juan C. Fresno,', b: 'Независимый арт-директор и интерактивный дизайнер', script: 'cyrl' },
  { lang: 'zh-Hans', a: '你好！我是 Juan C. Fresno，', b: '独立艺术总监与交互设计师', script: 'cjk' },
  { lang: 'ja', a: 'こんにちは！Juan C. Fresno です。', b: 'インディペンデントのアートディレクター／インタラクティブデザイナー', script: 'cjk' },
]

// The cycle for a page: its own lines first (from the locale dictionary), then
// every other language in the order above.
export function headlineCycle(own: HeadlineLine): HeadlineLine[] {
  return [own, ...HEADLINES.filter((l) => l.lang !== own.lang)]
}
