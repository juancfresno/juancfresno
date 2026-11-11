import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import Link from 'next/link'
import { getSite, getUi } from '@/content/site'
import { localePath } from '@/i18n/config'
import { localeOf, type LangParams } from '@/i18n/server'
import ContactBlock from '@/components/blocks/ContactBlock'
import Pending from '@/components/blocks/Pending'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import { FramesStage, ButtonsStage, TransitionsStage, GalleriesStage, PixelsStage } from '@/components/lab/LabStages'
import v from '@/components/blocks/v0.module.scss'
import l from '@/components/lab/labv1.module.scss'

type Props = { params: Promise<LangParams> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const loc = await localeOf(params)
  const { META } = getSite(loc)
  return pageMeta({ locale: loc, path: '/lab', title: META.lab.title, description: META.lab.description })
}

const STAGES: Record<string, (p: { labels: string[] }) => React.ReactElement> = { botones: ButtonsStage, transiciones: TransitionsStage, galerias: GalleriesStage, 'entradas-pixel': PixelsStage }

function Head({ label, link }: { label: string; link?: React.ReactNode }) {
  return (
    <div className={l.head}>
      <ElasticLine className={l.headRule} />
      <div className={l.headRowLabel}><p>{label}</p>{link}</div>
    </div>
  )
}

// Lab v1.0 — Figma "Lab · v1.0 · 1680" (6886:981): giant "Lab" + page index
// + log, intro; featured 002 with the 4 frames of 11a and a specs table;
// experiments as specimen cards with drawn stages; own products as a shelf
// with status dots; resources; global close.
export default async function LabPage({ params }: Props) {
  const loc = await localeOf(params)
  const { LAB, LAB_FEATURED, LAB_FEATURED_SPECS, LAB_FEATURED_FRAMES, LAB_LABELS, LAB_LOG, EXPERIMENTS, INTROS } = getSite(loc)
  const ui = getUi(loc)
  const href = (p: string) => localePath(loc, p)
  const F = LAB_FEATURED
  const featured = EXPERIMENTS.find((e) => e.slug === F.slug)
  const labels: Record<string, string[]> = { botones: ui.lab.buttons, galerias: ui.lab.galleries, 'entradas-pixel': ui.lab.pixels }

  return (
    <div className={v.page}>
      <header className={`${l.mod} ${l.header}`}>
        <div className={l.headRow}>
          <h1 className={l.h1}>{ui.lab.h1}</h1>
          <ul className={l.index} aria-label={ui.lab.onPage}>
            {EXPERIMENTS.map((e) => (
              <li key={e.slug}>
                <Link href={href(`/lab/${e.slug}`)}>
                  <span className={l.ixN}>{e.n}</span>
                  <span className={l.ixName}>{e.name}</span>
                  <span className={l.ixK} data-star={e.slug === F.slug || undefined}>{e.kind}{e.slug === F.slug ? ' · ★' : ''}</span>
                </Link>
              </li>
            ))}
            <li><a href="#products"><span className={l.ixN}>—</span><span className={l.ixName}>{ui.lab.products}</span><span className={l.ixK}>{String(LAB.length).padStart(2, '0')}</span></a></li>
            <li><a href="#resources"><span className={l.ixN}>—</span><span className={l.ixName}>{ui.lab.resources}</span><span className={l.ixK}>{ui.lab.openSource}</span></a></li>
          </ul>
          <div className={l.log}>{LAB_LOG.map((x) => <p key={x}>{x}</p>)}</div>
        </div>
        <div className={l.intro}><p>{INTROS.lab}</p></div>
      </header>

      <section className={`${l.mod} ${l.alt}`} aria-labelledby="lab-featured">
        <Head label={LAB_LABELS.featured} link={<Link href={href(`/lab/${F.slug}`)}>{LAB_LABELS.runs}</Link>} />
        <div className={l.specimen}>
          <FramesStage caption={ui.lab.framesCaption} frames={LAB_FEATURED_FRAMES} />
          <div className={l.info}>
            <p className={l.bigN} aria-hidden="true">002</p>
            <h2 id="lab-featured" className={l.infoTitle}><span className={v.srOnly}>002 · </span>{featured?.name}</h2>
            <p className={l.infoMeta}>{F.meta}</p>
            <p className={l.body}>{F.text}</p>
            <ul className={l.specs}>
              {LAB_FEATURED_SPECS.map((x) => (
                <li key={x.k} data-accent={x.accent || undefined}><span>{x.k}</span><span>{x.v}</span></li>
              ))}
            </ul>
            <p className={l.links}>
              <Link href={href(`/lab/${F.slug}`)}>{F.live}</Link>
              <span>{F.code}</span>
              <Pending>{ui.pending.repo}</Pending>
            </p>
          </div>
        </div>
      </section>

      <section className={l.mod} aria-label={ui.lab.experiments}>
        <Head label={LAB_LABELS.experiments} />
        <ul className={l.cards}>
          {EXPERIMENTS.map((e) => {
            const Stage = STAGES[e.slug]
            return (
              <li key={e.slug}>
                <Link href={href(`/lab/${e.slug}`)} className={l.card}>
                  {Stage && <Stage labels={labels[e.slug] ?? []} />}
                  <span className={l.cardTitle}><span className={l.cardN}>{e.n}</span><span className={l.cardName}>{e.name}</span></span>
                  <span className={l.cardMeta}>{e.kind} · {e.year}</span>
                  <span className={l.cardText}>{e.card}</span>
                  <span className={l.built}><span>{ui.lab.howBuilt}</span><span>{e.built}</span></span>
                  {e.note && <span className={l.note}>{e.note}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <section id="products" className={`${l.mod} ${l.alt}`} aria-label={ui.lab.products}>
        <Head label={LAB_LABELS.products} />
        <ol className={l.shelf}>
          {LAB.map((x, i) => (
            <li key={x.name} className={l.product}>
              <span className={l.mono10}>{String(i + 1).padStart(2, '0')}</span>
              <span className={l.pName}>{x.name}</span>
              <span className={l.pWhat} data-pending={x.what ? undefined : ''}>
                {x.what ?? <>{ui.lab.oneLine} <Pending>{ui.pending.oneLine}</Pending></>}
              </span>
              <span className={l.pStatus} data-dot={x.dot}><i aria-hidden="true" />{x.status}</span>
            </li>
          ))}
        </ol>
      </section>

      <section id="resources" className={l.mod} aria-label={ui.lab.resources}>
        <Head label={LAB_LABELS.resources} />
        <div className={l.resRow}>
          <p className={l.resLink}>{LAB_LABELS.openSource}<Pending>{ui.pending.repo}</Pending></p>
          <code className={l.repo}>{LAB_LABELS.repo}</code>
        </div>
      </section>

      <ContactBlock locale={loc} />
    </div>
  )
}
