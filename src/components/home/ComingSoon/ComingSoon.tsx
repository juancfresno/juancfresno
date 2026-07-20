import Image from 'next/image'
import { BehanceLogo, InstagramLogo, DribbbleLogo, LinkedInLogo } from '@/components/ui/SocialLogos/SocialLogos'
import GlitchSocialIcon from '@/components/ui/GlitchSocialIcon/GlitchSocialIcon'
import CtaButton from '@/components/home/CtaButton/CtaButton'
import s from './ComingSoon.module.scss'

const REEL_IMAGE = '/images/reel.jpg'

// ─── Social links — mirrors Footer.tsx SOCIALS ───────────────────────────────
const SOCIALS = [
  { id: 'behance', label: 'Behance', href: 'https://www.behance.net/juancfresno', Icon: BehanceLogo },
  { id: 'instagram', label: 'Instagram', href: 'https://instagram.com/juancfresno', Icon: InstagramLogo },
  { id: 'dribbble', label: 'Dribbble', href: 'https://dribbble.com/my-playbook', Icon: DribbbleLogo },
  { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/juancfresno', Icon: LinkedInLogo },
]

// ─── ComingSoon — static holding page, matches Figma node 9:170 1:1 ─────────
export default function ComingSoon() {
  return (
    <div className={s.page}>
      <div className={s.content}>
        {/* SMIL-animated (breathing + blinking) — must stay a raw <img>, never optimized/inlined-and-stripped */}
        {/* Rendered size matches Figma node 9:570 (~21x71px), not the SVG's native 72x252 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/juancfresno-character-idle.svg"
          alt=""
          width={21}
          height={71}
          className={s.character}
        />

        <div className={s.intro}>
          <p className={s.headline}>
            Juan C. Fresno — Independent Product Designer &amp; Digital Art Director
          </p>
          <p className={s.tagline}>
            Product Design — Digital Art Direction — Brand Systems — Interaction
          </p>
        </div>

        <p className={s.description}>
          Diseño productos digitales, interfaces y sistemas visuales para marcas, agencias y equipos que necesitan una dirección clara.
          <br />
          Trabajo entre producto, marca e interacción, conectando estructura, identidad visual y experiencia en un mismo sistema.
        </p>

        <p className={s.description}>
          La nueva web está en proceso. Mientras tanto, puedes seguir mi trabajo en los enlaces de abajo.
        </p>

        <nav className={s.social} aria-label="Redes sociales">
          {SOCIALS.map(({ id, label, href, Icon }) => (
            <GlitchSocialIcon
              key={id}
              href={href}
              label={label}
              icon={<Icon />}
              className={s.socialLink}
            />
          ))}
        </nav>

        <CtaButton href="mailto:hello@juancfresno.com" label="hello@juancfresno.com" />
      </div>

      <div className={s.reel}>
        <Image
          src={REEL_IMAGE}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 38vw"
          className={s.reelImg}
          priority
        />
      </div>
    </div>
  )
}
