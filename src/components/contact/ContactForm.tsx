'use client'

import { FormEvent, useState } from 'react'
import { useInView } from '@/hooks/useInView'
import ElasticLine from '@/components/ui/ElasticLine/ElasticLine'
import s from './ContactForm.module.scss'

// ── Scroll-reveal wrapper ────────────────────────────────────────────────────
function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.1 })

  return (
    <div
      ref={ref}
      className={`${s.reveal} ${inView ? s.revealVisible : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ContactForm() {
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className={s.page}>
      {/* Header */}
      <Reveal>
        <span className={s.label}>{'{ hablemos \u2198 }'}</span>
        <h1 className={s.title}>Contacto</h1>
      </Reveal>

      <ElasticLine className={s.divider} />

      {/* Two-column layout */}
      <div className={s.columns}>
        {/* Left: intro */}
        <Reveal className={s.intro} delay={100}>
          <p className={s.introText}>
            &iquest;Tienes un proyecto en mente? Me encantar&iacute;a saber m&aacute;s.
            Escr&iacute;beme y hablamos.
          </p>
          <div className={s.introMeta}>
            <a href="mailto:hello@juancfresno.com" className={s.email}>
              hello@juancfresno.com
            </a>
            <span className={s.location}>Valencia, Spain</span>
          </div>
        </Reveal>

        {/* Right: form */}
        <Reveal className={s.formWrap} delay={200}>
          {sent ? (
            <div className={s.successMsg}>
              <span className={s.successIcon}>&check;</span>
              <p>Mensaje enviado. Te respondo pronto.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={s.form}>
              <div className={s.field}>
                <label htmlFor="c-name" className={s.fieldLabel}>Nombre</label>
                <input
                  id="c-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  className={s.fieldInput}
                />
              </div>

              <div className={s.field}>
                <label htmlFor="c-email" className={s.fieldLabel}>Email</label>
                <input
                  id="c-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className={s.fieldInput}
                />
              </div>

              <div className={s.field}>
                <label htmlFor="c-subject" className={s.fieldLabel}>Asunto</label>
                <input
                  id="c-subject"
                  name="subject"
                  type="text"
                  className={s.fieldInput}
                />
              </div>

              <div className={s.field}>
                <label htmlFor="c-message" className={s.fieldLabel}>Mensaje</label>
                <textarea
                  id="c-message"
                  name="message"
                  required
                  rows={6}
                  className={`${s.fieldInput} ${s.fieldTextarea}`}
                />
              </div>

              <button type="submit" className={s.submit}>
                Enviar mensaje
              </button>
            </form>
          )}
        </Reveal>
      </div>
    </div>
  )
}
