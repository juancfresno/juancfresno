import { SITE_URL } from '@/lib/site'
import { absoluteUrl } from '@/lib/seo'
import { HTML_LANG, type Locale } from '@/i18n/config'
import { getSite, SOCIALS } from '@/content/site'
import { getCases, caseMedia } from '@/content/cases'

// Structured data. Person on every page (root layout), CreativeWork per case.
// One @id for the person in every language; texts and URLs per locale.

const byId = (id: string) => SOCIALS.find((s) => s.id === id)?.href

export const PERSON_ID = `${SITE_URL}/#person`

export function personJsonLd(l: Locale) {
  const { PERSON } = getSite(l)
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
    name: PERSON.name,
    jobTitle: PERSON.role,
    url: absoluteUrl(l, '/'),
    email: `mailto:${PERSON.email}`,
    knowsLanguage: ['es', 'en'],
    address: { '@type': 'PostalAddress', addressLocality: 'Valencia', addressCountry: 'ES' },
    // LinkedIn, Behance, Dribbble, Instagram, X (from SOCIALS, single source).
    sameAs: ['linkedin', 'behance', 'dribbble', 'instagram', 'x'].map(byId).filter(Boolean),
  }
}

export function caseJsonLd(l: Locale, slug: string) {
  const c = getCases(l)[slug]
  if (!c) return null
  const cover = caseMedia(slug)?.cover
  const url = absoluteUrl(l, `/work/${slug}`)
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': `${url}#work`,
    name: c.title,
    headline: c.title,
    description: c.lead,
    url,
    inLanguage: HTML_LANG[l],
    dateCreated: c.ficha.year,
    genre: c.chips,
    ...(cover ? { image: `${SITE_URL}${cover.src}` } : {}),
    creator: { '@id': PERSON_ID, '@type': 'Person', name: getSite(l).PERSON.name },
  }
}
