import fs from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import { notFound } from 'next/navigation'
import { getSite, getUi, EXPERIMENT_SLUGS } from '@/content/site'
import { LOCALES } from '@/i18n/config'
import { localeOf } from '@/i18n/server'
import Section from '@/components/blocks/Section'
import ContactBlock from '@/components/blocks/ContactBlock'
import Pending from '@/components/blocks/Pending'
import LabDemo from '@/components/lab/LabDemo'
import CopyButton from '@/components/lab/CopyButton'
import s from '@/components/blocks/blocks.module.scss'
import l from '@/components/lab/lab.module.scss'

type Params = { lang: string; slug: string }

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => EXPERIMENT_SLUGS.map((slug) => ({ lang, slug })))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const loc = await localeOf(params)
  const e = getSite(loc).EXPERIMENTS.find((x) => x.slug === slug)
  return e ? pageMeta({ locale: loc, path: `/lab/${e.slug}`, title: `${e.n} ${e.name} · Lab`, description: e.what }) : {}
}

const read = (slug: string, file: string) =>
  fs.readFileSync(path.join(process.cwd(), 'public', 'lab', slug, file), 'utf8')

export default async function ExperimentPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const loc = await localeOf(params)
  const ui = getUi(loc)
  const e = getSite(loc).EXPERIMENTS.find((x) => x.slug === slug)
  if (!e) notFound()

  const html = read(slug, 'snippet.html')
  const code = `<!-- HTML -->\n${html}\n<link rel="stylesheet" href="${e.css}">\n<script src="${e.js}"></script>\n\n/* ${e.css} */\n${read(slug, e.css)}\n\n// ${e.js}\n${read(slug, e.js)}`
  const prompt = read(slug, 'prompt.md')

  return (
    <>
    <div className={s.page}>
      <header className={s.hero}>
        <p className={s.heroMeta}>{ui.lab.crumb} / {e.n} · {e.kind} · {e.year}</p>
        <h1 className={s.heroTitle}>{e.name}</h1>
        <p className={s.text}>{e.what}</p>
      </header>

      <LabDemo slug={slug} html={html} css={e.css} js={e.js} init={e.init} />

      <Section label={ui.lab.useIt}>
        <div className={l.actions}>
          <CopyButton label={ui.lab.copyCode} text={code} />
          <CopyButton label={ui.lab.copyPrompt} text={prompt} />
          {e.repo ? (
            <a className={l.action} href={e.repo} target="_blank" rel="noreferrer">{ui.lab.github}</a>
          ) : (
            <span className={s.text}>{ui.lab.githubShort} <Pending>{ui.pending.repo}</Pending></span>
          )}
        </div>
        <pre className={l.code} tabIndex={0} aria-label={ui.lab.source}><code>{html}</code></pre>
      </Section>

      <Section label={ui.lab.howBuilt}>
        <p className={s.text}>{e.how}</p>
        <p className={s.rowTags}>{e.built}</p>
      </Section>

    </div>
    <ContactBlock locale={loc} />
    </>
  )
}
