// FRESNO© wordmark (paths in fresnoPaths.ts), inlined so its fill follows the
// theme (currentColor).
import { FRESNO_H, FRESNO_PATHS, FRESNO_W } from './fresnoPaths'

export default function FresnoLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${FRESNO_W} ${FRESNO_H}`} fill="currentColor" role="img" aria-label="Fresno©" xmlns="http://www.w3.org/2000/svg">
      {FRESNO_PATHS.map((d) => <path key={d.slice(0, 24)} d={d} />)}
    </svg>
  )
}
