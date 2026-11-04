import s from './blocks.module.scss'

// Marks copy that is still a placeholder, so gaps are visible on the preview.
export default function Pending({ children = 'pendiente' }: { children?: React.ReactNode }) {
  return <span className={s.pending}>{children}</span>
}
