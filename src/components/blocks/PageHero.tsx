import s from './pageHero.module.scss'

// Page hero "02 · Hero" (Figma Feed 6965:15202, Lab 6965:15227): a ficha column
// with the page letter on the left, and on the right the page name ("/ Feed",
// right-aligned, 24 px), the intro, then a ruled one-line note.
export default function PageHero({ letter, name, intro, note }: { letter: string; name: string; intro: string; note: string }) {
  const lines = intro.split('\n')
  return (
    <header className={s.hero}>
      <div className={s.ficha} aria-hidden="true">{letter}</div>
      <div className={s.cab}>
        <h1 className={s.name}>/ {name}</h1>
        <p className={s.intro}>
          {lines.map((t, i) => (i === 0 ? t : <span key={i}><br />{t}</span>))}
        </p>
        <p className={s.note}>{note}</p>
      </div>
    </header>
  )
}
