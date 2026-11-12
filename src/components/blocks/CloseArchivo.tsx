import { getSite } from '@/content/site'
import type { Locale } from '@/i18n/config'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import s from './closeArchivo.module.scss'

// Close band "04 · Archivo" (Figma 6856:14014): rule, mono label, one line
// and the email, right-aligned. Sits above the global footer.
export default function CloseArchivo({ locale }: { locale: Locale }) {
  const { CLOSE_ARCHIVO, PERSON } = getSite(locale)
  return (
    <section className={s.close} aria-label={CLOSE_ARCHIVO.label.replace('↘', '')}>
      <ElasticLine className={s.rule} />
      <p className={s.label}>{CLOSE_ARCHIVO.label}</p>
      <p className={s.line}>{CLOSE_ARCHIVO.line}</p>
      <a className={`${s.line} ${s.mail}`} href={`mailto:${PERSON.email}`}>{PERSON.email}</a>
    </section>
  )
}
