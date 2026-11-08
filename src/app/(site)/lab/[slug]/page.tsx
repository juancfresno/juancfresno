import fs from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EXPERIMENTS } from '@/content/site'
import Section from '@/components/blocks/Section'
import ContactBlock from '@/components/blocks/ContactBlock'
import Pending from '@/components/blocks/Pending'
import LabDemo from '@/components/lab/LabDemo'
import CopyButton from '@/components/lab/CopyButton'
import s from '@/components/blocks/blocks.module.scss'
import l from '@/components/lab/lab.module.scss'

type Params = { slug: string }

export function generateStaticParams() {
  return EXPERIMENTS.map((e) => ({ slug: e.slug }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const e = EXPERIMENTS.find((x) => x.slug === slug)
  return e ? { title: `${e.n} ${e.name} · Lab`, description: e.what, alternates: { canonical: `/lab/${e.slug}` } } : {}
}

const read = (slug: string, file: string) =>
  fs.readFileSync(path.join(process.cwd(), 'public', 'lab', slug, file), 'utf8')

export default async function ExperimentPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const e = EXPERIMENTS.find((x) => x.slug === slug)
  if (!e) notFound()

  const html = read(slug, 'snippet.html')
  const code = `<!-- HTML -->\n${html}\n<link rel="stylesheet" href="${e.css}">\n<script src="${e.js}"></script>\n\n/* ${e.css} */\n${read(slug, e.css)}\n\n// ${e.js}\n${read(slug, e.js)}`
  const prompt = read(slug, 'prompt.md')

  return (
    <>
    <div className={s.page}>
      <header className={s.hero}>
        <p className={s.heroMeta}>Lab / {e.n} · {e.kind} · {e.year}</p>
        <h1 className={s.heroTitle}>{e.name}</h1>
        <p className={s.text}>{e.what}</p>
      </header>

      <LabDemo slug={slug} html={html} css={e.css} js={e.js} init={e.init} />

      <Section label="Use it">
        <div className={l.actions}>
          <CopyButton label="Copy code" text={code} />
          <CopyButton label="Copy the prompt for an AI agent" text={prompt} />
          {e.repo ? (
            <a className={l.action} href={e.repo} target="_blank" rel="noreferrer">View on GitHub ↗</a>
          ) : (
            <span className={s.text}>GitHub <Pending>public repo</Pending></span>
          )}
        </div>
        <pre className={l.code}><code>{html}</code></pre>
      </Section>

      <Section label="How it’s built">
        <p className={s.text}>{e.how}</p>
        <p className={s.rowTags}>{e.built}</p>
      </Section>

    </div>
    <ContactBlock />
    </>
  )
}
