import { SOCIALS } from '@/content/site'
import s from './close.module.scss'

// Small social links; `data-social` hooks them to the shared hover clip
// (components/ui/SocialPreview).
export default function Socials({ className }: { className?: string }) {
  return (
    <ul className={`${s.socials} ${className ?? ''}`} aria-label="Social profiles">
      {SOCIALS.map((x) => (
        <li key={x.id}>
          <a href={x.href} target="_blank" rel="noopener noreferrer" data-social={x.id}>{x.label} ↗</a>
        </li>
      ))}
    </ul>
  )
}
