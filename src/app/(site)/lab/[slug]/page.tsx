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
  return e ? { title: `${e.name} · Lab`, description: e.what } : {}
}

const read = (slug: string, file: string) =>
  fs.readFileSync(path.join(process.cwd(), 'public', 'lab', slug, file), 'utf8')

export default async function ExperimentPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const e = EXPERIMENTS.find((x) => x.slug === slug)
  if (!e) notFound()

  const html = read(slug, 'snippet.html')
  const code = `<!-- HTML -->\n${html}\n<link rel="stylesheet" href="buttons.css">\n<script src="buttons.js"></script>\n\n/* buttons.css */\n${read(slug, 'buttons.css')}\n\n// buttons.js\n${read(slug, 'buttons.js')}`
  const prompt = read(slug, 'prompt.md')

  return (
    <div className={s.page}>
      <header className={s.hero}>
        <p className={s.heroMeta}>Lab / {e.n} · {e.kind} · {e.year}</p>
        <h1 className={s.heroTitle}>{e.name}</h1>
        <p className={s.text}>{e.what}</p>
      </header>

      <LabDemo slug={slug} html={html} />

      <Section label="Úsalo">
        <div className={l.actions}>
          <CopyButton label="Copiar código" text={code} />
          <CopyButton label="Copiar prompt para Claude" text={prompt} />
          {e.repo ? (
            <a className={l.action} href={e.repo} target="_blank" rel="noreferrer">Ver en GitHub ↗</a>
          ) : (
            <span className={s.text}>GitHub <Pending>repo público</Pending></span>
          )}
        </div>
        <pre className={l.code}><code>{html}</code></pre>
      </Section>

      <Section label="Cómo está hecho">
        <p className={s.text}>{e.how}</p>
      </Section>

      <ContactBlock />
    </div>
  )
}
