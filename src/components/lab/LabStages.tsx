import s from './labv1.module.scss'

// Drawn stages for the Lab (Figma "Lab · v1.0", 6886:981). Pure markup + CSS,
// no images: the 4 frames of 11a and the three experiment specimens.

const COLS = Array.from({ length: 6 })
// Frame 1: line heights as they fall (from the Figma frame, % of 380 px).
const DROP = [90, 72, 55, 44, 75, 60, 35, 28, 65, 52, 45, 36]

// Featured · 002: 11a in four frames (lines drop → gutters open → columns fill → boxes).
export function FramesStage({ caption, frames }: { caption: string; frames: { t: string; label: string }[] }) {
  return (
    <div className={s.frames} aria-hidden="true">
      <p className={s.framesCap}>{caption}</p>
      <div className={s.framesRow}>
        {frames.map((f, i) => (
          <div key={f.t} className={s.frameCol}>
            <div className={s.frame} data-step={i}>
              {COLS.map((_, c) => (
                <span key={c} className={s.col}>
                  <i style={i === 0 ? { height: `${DROP[c * 2]}%` } : undefined} />
                  <i style={i === 0 ? { height: `${DROP[c * 2 + 1]}%` } : undefined} />
                </span>
              ))}
              {i === 3 && (
                <>
                  <span className={s.box} style={{ top: '6%', height: '13.7%', width: '92%' }}><em>H1 · 40/46</em></span>
                  <span className={s.box} style={{ top: '24%', height: '7.4%', width: '57%' }}><em>P · 18</em></span>
                  <span className={s.box} style={{ top: '34.5%', height: '5.3%', width: '46%' }}><em>P · 11 MONO</em></span>
                  <span className={s.box} style={{ top: '45%', height: '34%', width: '92%' }}><em>IMG 16:9</em></span>
                  <span className={s.box} style={{ top: '83%', height: '11.6%', width: '44%' }}><em>ROW · 03</em></span>
                </>
              )}
            </div>
            <p className={s.frameT}>{f.t}</p>
            <p className={s.frameL}>{f.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ButtonsStage() {
  return (
    <div className={`${s.stage} ${s.stageButtons}`} aria-hidden="true">
      <div className={s.bCell}>
        <span className={s.btn}>Magnetic</span><span className={s.btnDot} />
        <p className={s.cap}>01 Magnetic</p>
      </div>
      <div className={s.bCell}>
        <span className={`${s.btn} ${s.btnCols}`}>{COLS.map((_, i) => <i key={i} />)}<b>Columns</b></span>
        <p className={s.cap}>02 Columns</p>
      </div>
      <div className={s.bCell}>
        <span className={`${s.btn} ${s.btnRoll}`}><b>Roller</b><b>Roller</b></span>
        <p className={s.cap}>03 Roller</p>
      </div>
      <div className={s.bCell}>
        <span className={s.btn}>SCR#MB!E</span>
        <p className={s.cap}>04 Scramble</p>
      </div>
    </div>
  )
}

const OPTS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '11a', '11b', '11c', '11d', '11e', '11f', '12', '13', '14', '15', '16']
export function TransitionsStage() {
  return (
    <div className={`${s.stage} ${s.stageTrans}`} aria-hidden="true">
      <p className={s.cap}>01 — 22 · ★ 11a · 11d</p>
      <div className={s.optGrid}>
        {OPTS.map((o) => (
          <span key={o} className={s.opt} data-star={o === '11a' || o === '11d' || undefined}>
            <i /><em>{o}</em>
          </span>
        ))}
      </div>
    </div>
  )
}

const GLYPHS: { n: string; star?: boolean; kind: string }[] = [
  { n: '01 Arc', star: true, kind: 'arc' }, { n: '02 Canvas', star: true, kind: 'canvas' },
  { n: '03 Plates', kind: 'plates' }, { n: '04 Strip', kind: 'strip' },
  { n: '05 Deck', kind: 'deck' }, { n: '06 Zoom grid', kind: 'zoom' },
  { n: '07 Bars', kind: 'bars' }, { n: '08 Runway', kind: 'runway' },
]
const COUNT: Record<string, number> = { arc: 5, canvas: 12, plates: 3, strip: 5, deck: 4, zoom: 9, bars: 8, runway: 3 }
export function GalleriesStage() {
  return (
    <div className={`${s.stage} ${s.stageGal}`} aria-hidden="true">
      {GLYPHS.map((g) => (
        <div key={g.n} className={s.gCell}>
          <span className={s.glyph} data-kind={g.kind}>
            {Array.from({ length: COUNT[g.kind] }, (_, i) => <i key={i} style={{ ['--i' as string]: i }} />)}
          </span>
          <p className={`${s.cap} ${g.star ? s.capStar : ''}`}>{g.n}{g.star ? ' ★' : ''}</p>
        </div>
      ))}
    </div>
  )
}
