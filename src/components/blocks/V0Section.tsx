import Link from 'next/link'
import clsx from 'clsx'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import v from './v0.module.scss'

type Props = {
  label: string
  href?: string
  id?: string
  aside?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

// v0 section: ElasticLine on top, then the mono "{ label ↘" (a link when
// `href` is set) with an optional right-hand slot, then the content.
export default function V0Section({ label, href, id, aside, className, children }: Props) {
  return (
    <section id={id} className={clsx(v.section, className)} aria-label={label.replace(/[{}↘]/g, '').trim()}>
      <ElasticLine className={v.rule} />
      <div className={v.sectionHead}>
        {href ? <Link href={href} className={v.label}>{label}</Link> : <p className={v.label}>{label}</p>}
        {aside}
      </div>
      {children}
    </section>
  )
}
