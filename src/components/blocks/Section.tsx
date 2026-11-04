import clsx from 'clsx'
import s from './blocks.module.scss'

type Props = {
  label?: string
  id?: string
  className?: string
  children: React.ReactNode
}

// Page section: optional mono label on the left column, content on the right.
export default function Section({ label, id, className, children }: Props) {
  return (
    <section id={id} className={clsx(s.section, className)}>
      {label && <p className={s.label}>{label}</p>}
      <div className={s.body}>{children}</div>
    </section>
  )
}
