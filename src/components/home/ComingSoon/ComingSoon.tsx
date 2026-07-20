import Image from 'next/image'
import { BehanceLogo, InstagramLogo, DribbbleLogo, LinkedInLogo } from '@/components/ui/SocialLogos/SocialLogos'
import GlitchSocialLink from '@/components/ui/GlitchSocialLink/GlitchSocialLink'
import s from './ComingSoon.module.scss'

// ─── Social links — mirrors Footer.tsx SOCIALS, plus glitch-hover config ────
const SOCIALS = [
  {
    id: 'behance',
    label: 'Behance',
    href: 'https://www.behance.net/juancfresno',
    logo: <BehanceLogo />,
    letter: 'B',
    color: '#1769ff',
    width: 79,
    height: 15,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    href: 'https://instagram.com/juancfresno',
    logo: <InstagramLogo />,
    letter: 'I',
    color: '#e4405f',
    width: 83,
    height: 24,
  },
  {
    id: 'dribbble',
    label: 'Dribbble',
    href: 'https://dribbble.com/my-playbook',
    logo: <DribbbleLogo />,
    letter: 'D',
    color: '#ea4c89',
    width: 77,
    height: 22,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/juancfresno',
    logo: <LinkedInLogo />,
    letter: 'L',
    color: '#0a66c2',
    width: 77,
    height: 21,
  },
]

// ─── ComingSoon — static holding page, matches Figma node 9:170 1:1 ─────────
export default function ComingSoon() {
  return (
    <div className={s.page}>
      <div className={s.content}>
        {/* SMIL-animated (breathing + blinking) — must stay a raw <img>, never optimized/inlined-and-stripped */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/juancfresno-character-idle.svg"
          alt=""
          width={72}
          height={252}
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
          {SOCIALS.map(({ id, ...social }) => (
            <GlitchSocialLink key={id} {...social} />
          ))}
        </nav>

        <a href="mailto:hello@juancfresno.com" className={s.cta}>
          hello@juancfresno.com
        </a>
      </div>

      <div className={s.reel}>
        <Image
          src="/images/reel.jpg"
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
