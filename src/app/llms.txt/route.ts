import { SITE_URL } from '@/lib/site'
import { getSite, SOCIALS } from '@/content/site'
import { getCases, getCaseProjects } from '@/content/cases'
import { WIP } from '@/lib/wip'

// /llms.txt — plain summary for language models (llmstxt.org format), built
// from the same content files as the site, so it never says anything new.
export const dynamic = 'force-static'

export function GET() {
  const { META, PERSON, HOME, ABOUT } = getSite('en')
  const CASES = getCases('en')
  const CASE_PROJECTS = getCaseProjects('en')
  const cases = CASE_PROJECTS.map((p) => {
    const c = CASES[p.slug]
    return `- [${c.title}](${SITE_URL}/work/${p.slug}): ${c.lead} (${p.discipline}, ${c.ficha.year})`
  })
  const body = [
    `# ${PERSON.name}`,
    '',
    `> ${META.home.description}`,
    '',
    `${PERSON.role}, ${PERSON.location}. ${HOME.intro}`,
    '',
    '## Services',
    '',
    ...ABOUT.services.map((s) => `- ${s.name}: ${s.text}`),
    '',
    // WIP landing (lib/wip.ts): case and section pages are not live yet.
    ...(WIP ? [
    '## Site',
    '',
    `- The full site (v1.0) is coming soon. Spanish: ${SITE_URL}/es`,
    '',
    ] : [
    '## Case studies',
    '',
    ...cases,
    '',
    '## Pages',
    '',
    `- [Work](${SITE_URL}/work): ${META.work.description}`,
    `- [About](${SITE_URL}/about): ${META.about.description}`,
    `- [Lab](${SITE_URL}/lab): ${META.lab.description}`,
    `- [Feed](${SITE_URL}/feed): ${META.feed.description}`,
    `- [Contact](${SITE_URL}/contact): ${META.contact.description}`,
    `- [Versión en español](${SITE_URL}/es): the same site in Spanish (/es/…, same paths).`,
    '',
    ]),
    '## Contact',
    '',
    `- Email: ${PERSON.email}`,
    ...SOCIALS.map((s) => `- ${s.label}: ${s.href}`),
    '',
  ].join('\n')
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
