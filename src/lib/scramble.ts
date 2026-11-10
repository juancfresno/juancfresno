// ─── Scramble / decode ("reconstruction") ─────────────────────────────────────
// The nav hover family (Lab 002 · 03 "Scramble del título", the 11d labels):
// characters turn into random glyphs and resolve into the target text from
// left to right. Glyphs come from the TARGET character's script, so a line
// decoding into Japanese scrambles through kana, into Chinese through hanzi,
// into Russian through Cyrillic, and Latin (the name) through A–Z / a–z.
// Letters only: no digits or symbols (%$#&), so the noise reads as type.

import { EASE_ENTER } from '@/components/transition/effects'

// Latin keeps the case of the target character, so the noise has roughly
// the width of the text it becomes. Punctuation and anything else scramble
// through lowercase letters.
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const CYRILLIC = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯабвгдежзиклмнопрстуфхцчшэюя'
const KANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもらりるれろアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモラリルレロ'
const HAN = '的一是不了人我在有他这中大来上国个到说们为子和你地出道也时年得就那要下以生会自着去之过家学对可她里后小么心多天而能好都然没日于起还发成事只作当想看文无开手十用主行方又如前所本见经头面公同三已老从动两长'

const pool = (ch: string) =>
  /[\u3040-\u30ff]/.test(ch) ? KANA
  : /[\u4e00-\u9fff]/.test(ch) ? HAN
  : /[\u0400-\u04ff]/.test(ch) ? CYRILLIC
  : /[a-z\u00e0-\u00ff]/.test(ch) ? LOWER
  : /[A-Z\u00c0-\u00de]/.test(ch) ? UPPER
  : LOWER

const pick = (s: string) => s[Math.floor(Math.random() * s.length)]

// One frame of the decode from `from` to `to`, p in 0…1. Character k starts
// scrambling at 55 % · k/n of the run and lands 45 % later; spaces stay spaces.
export function scrambleFrame(from: string, to: string, p: number): string {
  const a = Array.from(from), b = Array.from(to)
  const n = Math.max(a.length, b.length)
  let out = ''
  for (let k = 0; k < n; k++) {
    const s = (k / n) * 0.55
    const t = b[k] ?? ''
    if (p >= s + 0.45) out += t
    else if (p < s) out += a[k] ?? ''
    else if (t === ' ' || t === ' ') out += t
    else out += pick(pool(t || a[k] || 'A'))
  }
  return out
}

// Runs a decode on an element's text; returns a cancel function.
export function scrambleTo(el: HTMLElement, from: string, to: string, ms: number, done?: () => void): () => void {
  let raf = 0, t0 = 0, last = 0
  const tick = (now: number) => {
    if (!t0) t0 = now
    const p = EASE_ENTER(Math.min(1, (now - t0) / ms)) // same ease as the masks
    // New glyphs ~every 40 ms (25 fps of noise), resolution every frame.
    if (p >= 1 || now - last > 40) { el.textContent = p >= 1 ? to : scrambleFrame(from, to, p); last = now }
    if (p < 1) raf = requestAnimationFrame(tick)
    else done?.()
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}
