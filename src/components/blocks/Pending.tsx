import s from './blocks.module.scss'

// Marks copy that is still a placeholder, so gaps are visible on the preview.
// Mirrors Figma v1/pending (6878:85): dashed 1 px, mono 9, "Pending · <what>".
export default function Pending({ children }: { children?: React.ReactNode }) {
  return <span className={s.pending}>Pending{children ? <> · {children}</> : null}</span>
}
