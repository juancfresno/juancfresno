import { SITE_URL } from '@/lib/site'
import { META, PERSON, SOCIALS, HOME, ABOUT } from '@/content/site'
import { CASES, CASE_PROJECTS } from '@/content/cases'

// /llms.txt — plain summary for language models (llmstxt.org format), built
// from the same content files as the site, so it never says anything new.
export const dynamic = 'force-static'

export function GET() {
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
    '',
    '## Contact',
    '',
    `- Email: ${PERSON.email}`,
    ...SOCIALS.map((s) => `- ${s.label}: ${s.href}`),
    '',
  ].join('\n')
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
