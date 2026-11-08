import { SITE_URL } from '@/lib/site'
import { PERSON, SOCIALS } from '@/content/site'
import { CASES, caseMedia } from '@/content/cases'

// Structured data. Person on every page (root layout), CreativeWork per case.

const byId = (id: string) => SOCIALS.find((s) => s.id === id)?.href

export const PERSON_ID = `${SITE_URL}/#person`

export const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': PERSON_ID,
  name: PERSON.name,
  jobTitle: PERSON.role,
  url: SITE_URL,
  email: `mailto:${PERSON.email}`,
  address: { '@type': 'PostalAddress', addressLocality: 'Valencia', addressCountry: 'ES' },
  // LinkedIn, Behance, Dribbble, Instagram, X (from SOCIALS, single source).
  sameAs: ['linkedin', 'behance', 'dribbble', 'instagram', 'x'].map(byId).filter(Boolean),
}

export function caseJsonLd(slug: string) {
  const c = CASES[slug]
  if (!c) return null
  const cover = caseMedia(slug)?.cover
  const url = `${SITE_URL}/work/${slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': `${url}#work`,
    name: c.title,
    headline: c.title,
    description: c.lead,
    url,
    inLanguage: 'en',
    dateCreated: c.ficha.year,
    genre: c.chips,
    ...(cover ? { image: `${SITE_URL}${cover.src}` } : {}),
    creator: { '@id': PERSON_ID, '@type': 'Person', name: PERSON.name },
  }
}
