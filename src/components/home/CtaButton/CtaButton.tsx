import s from './CtaButton.module.scss'

interface Props {
  href: string
  label: string
}

// ─── CtaButton — solid black pill (button/bg/neutral). On hover the label
// does a 3D rotateX flip: the visible text rotates away while an identical
// duplicate layer rotates in behind it, matching Figma's Cta6 component
// (two stacked text layers, built for a flip — not a color change). ────────
export default function CtaButton({ href, label }: Props) {
  return (
    <a href={href} className={s.cta}>
      <span className={s.flip}>
        <span className={`${s.face} ${s.faceFront}`}>{label}</span>
        <span className={`${s.face} ${s.faceBack}`} aria-hidden="true">
          {label}
        </span>
      </span>
    </a>
  )
}
