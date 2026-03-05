'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import s from './LoadingScreen.module.scss'

// ─── Config ──────────────────────────────────────────────────────────────────
const LOAD_MS     = 3200   // total progress animation time
const PAUSE_MS    = 900    // pause at 100% before fading out
const FADE_MS     = 600    // fade-out duration
const START_DELAY = 350    // wait for paint before animating

// ─── SVG: Biako face — dark version (currentColor strokes/fills) ─────────────
// Same geometry as Nav/BiakoFace. Blue band kept as brand accent.
const BiakoFace = () => (
  <svg className={s.faceSvg} viewBox="0 0 25 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M10.6543 20.7341C10.6543 20.7341 11.2181 20.5025 11.406 20.6183C11.5939 20.7341 12.1577 21.1202 12.5712 21.1202C13.0974 21.1202 13.6236 20.6569 13.9242 20.6569C14.2249 20.6569 14.6759 20.8114 14.6759 20.8114C14.7135 20.7341 14.7135 20.6183 14.7135 20.5025C14.7135 20.1164 14.5632 19.8075 14.4504 19.4214" stroke="currentColor" strokeWidth="0.721156" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8.32422 15.8692C8.32422 16.2167 8.58732 16.487 8.92559 16.487C9.26386 16.487 9.52696 16.2167 9.52696 15.8692C9.52696 15.5217 9.26386 15.2515 8.92559 15.2515C8.6249 15.2515 8.32422 15.5217 8.32422 15.8692Z" fill="currentColor"/>
    <path d="M15.7285 15.8692C15.7285 16.2167 15.9916 16.487 16.3299 16.487C16.6682 16.487 16.9313 16.2167 16.9313 15.8692C16.9313 15.5217 16.6682 15.2515 16.3299 15.2515C16.0292 15.2515 15.7285 15.5217 15.7285 15.8692Z" fill="currentColor"/>
    <path d="M14.8633 14.0161C15.5022 14.1705 16.8929 12.7419 17.4567 12.7419C17.9829 12.7806 18.5842 13.7844 18.5842 13.7844" stroke="currentColor" strokeWidth="0.721156" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4.30177 16.2941C4.30177 16.1783 3.36213 15.0586 2.9111 15.2903C2.49766 15.4833 2.30974 17.4138 2.30974 17.7227C2.27215 18.0316 3.1742 19.3443 3.32455 19.9235C3.47489 20.5026 3.4373 21.9698 4.64004 21.854" stroke="currentColor" strokeWidth="1.08173" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20.6508 16.2941C20.6508 16.1783 21.5904 15.0586 22.0414 15.2903C22.4549 15.4833 22.6428 17.4138 22.6428 17.7227C22.6804 18.0316 21.7783 19.3443 21.628 19.9235C21.4777 20.5026 21.5152 21.9698 20.3125 21.854" stroke="currentColor" strokeWidth="1.08173" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4.86523 21.6608C4.86523 21.6608 7.53381 25.9079 8.8493 26.0623C9.07481 26.1009 8.24793 24.9812 8.88689 23.9774C9.26274 23.3982 10.24 22.5488 12.4575 22.5488C13.8482 22.5488 15.953 23.1279 16.3288 23.8615C16.7423 24.6337 16.3288 25.9465 16.3288 25.9465C16.3288 25.9465 19.7115 23.6685 20.1625 21.2747" stroke="currentColor" strokeWidth="0.721156" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20.6505 16.2168C20.6505 16.2168 20.3498 22.5875 19.8236 24.1319C19.5981 24.8269 18.8464 27.1049 16.4033 28.6107C16.4033 28.6107 16.3657 28.6107 16.3657 28.6493C15.5764 29.1126 14.8247 30.5412 12.6072 30.5412C12.532 30.5412 12.4568 30.5412 12.3817 30.5412C12.3065 30.5412 12.2313 30.5412 12.1562 30.5412C9.93861 30.5412 9.67551 29.1512 8.88622 28.6879C8.88622 28.6879 8.84863 28.6879 8.84863 28.6493C6.40557 27.1435 5.8042 24.711 5.42835 24.0933C4.71422 22.8964 4.30078 16.2168 4.30078 16.2168" stroke="currentColor" strokeWidth="1.08173" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.6168 14.4408L7.7227 13.823C7.7227 13.823 6.70789 14.2477 6.33203 15.0585" stroke="currentColor" strokeWidth="0.721156" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11.6677 15.406C11.818 15.7535 12.0059 16.0624 12.0059 16.4871C12.0059 16.7188 11.6301 17.2207 11.6301 17.5296C11.6301 17.9157 11.5173 18.4176 11.818 18.8037" stroke="currentColor" strokeWidth="0.721156" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.541 24.3634C11.1048 24.4406 9.97723 24.5564 14.1116 24.402C14.2244 24.402 14.4123 24.3634 14.4875 24.2861" stroke="currentColor" strokeWidth="0.885356" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3.77625 15.3673C3.66349 11.738 3.73866 11.8924 3.81383 7.79972C3.85142 5.52172 6.10655 3.78427 8.92547 2.89623L9.82752 0.772677L11.8947 1.46766L14.4505 0.541016C14.4505 0.541016 17.0064 0.965727 16.5929 1.93098C16.5177 2.12403 21.1032 4.24759 21.2911 6.21671C21.5918 9.07386 21.5542 15.4445 21.5542 15.4445" stroke="currentColor" strokeWidth="1.08173" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4.26367 16.1396C4.26367 16.1396 4.41401 14.8269 5.76709 12.2014C6.96983 9.88477 5.16572 8.68786 7.08259 6.60291C7.08259 6.60291 9.14979 5.90793 10.2398 6.9504C11.3673 7.95426 12.6828 7.64538 14.1111 7.49094" stroke="currentColor" strokeWidth="1.08173" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20.6512 15.9852C20.6512 15.9852 20.764 14.0933 19.223 11.5836C17.7195 9.07394 20.9143 8.76506 16.5544 6.48706C16.5544 6.48706 16.1409 6.98899 14.1113 7.52953" stroke="currentColor" strokeWidth="1.08173" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11.3672 26.4484C11.3672 26.4484 11.8558 26.0237 12.4948 26.1009C13.1337 26.2168 13.3216 26.4484 13.3216 26.4484" stroke="currentColor" strokeWidth="0.885356" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13.0963 21.352C13.0963 21.6609 12.8332 21.9312 12.5325 21.9312C12.2318 21.9312 11.9688 21.6609 11.9688 21.352C11.9688 21.0431 12.5325 21.159 12.5325 21.159C12.5325 21.159 13.0963 21.0431 13.0963 21.352Z" stroke="currentColor" strokeWidth="0.359898" strokeMiterlimit="10"/>
    {/* Brand accent band across eyes — signature element */}
    <rect y="13.7385" width="25.0001" height="4.16137" fill="#003DFF" fillOpacity="0.9"/>
  </svg>
)

// ─── SVG: Fresno wordmark (currentColor fills) ──────────────────────────────
const FresnoLogo = () => (
  <svg className={s.logoSvg} viewBox="0 0 101 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M95.7348 6.75906C93.0312 6.75906 91.3848 5.47657 91.3848 3.37087C91.3848 1.26516 93.0312 0 95.7348 0C98.4471 0 100.076 1.26516 100.076 3.37087C100.076 5.47657 98.4471 6.75906 95.7348 6.75906ZM95.7348 5.89251C97.9878 5.89251 99.0537 4.97398 99.0537 3.3622C99.0537 1.76775 97.9878 0.849215 95.7348 0.849215C93.4991 0.849215 92.4073 1.76775 92.4073 3.3622C92.4073 4.97398 93.4991 5.89251 95.7348 5.89251ZM95.7608 5.45924C94.1664 5.45924 92.9965 4.76601 92.9965 3.37087C92.9965 1.99306 94.1664 1.28249 95.7608 1.28249C97.2946 1.28249 98.3258 1.89774 98.4731 2.96359H97.2426C97.0346 2.52165 96.5754 2.19236 95.7695 2.19236C94.773 2.19236 94.2444 2.72096 94.2444 3.37087C94.2444 4.03811 94.773 4.55803 95.7695 4.55803C96.558 4.55803 97.0433 4.24608 97.2426 3.79547H98.4731C98.3345 4.83533 97.2946 5.45924 95.7608 5.45924Z" fill="currentColor"/>
    <path d="M81.0179 12C75.8486 12 72.7871 9.87692 72.7871 6V5.98462C72.7871 2.09231 75.8486 0 81.0179 0C86.1871 0 89.2486 2.09231 89.2486 5.98462V6C89.2486 9.87692 86.1871 12 81.0179 12ZM81.0179 9.15385C83.4333 9.15385 85.064 7.98462 85.064 6V5.98462C85.064 3.98462 83.4333 2.83077 81.0179 2.83077C78.6025 2.83077 76.9717 3.92308 76.9717 5.98462V6C76.9717 8.04615 78.6025 9.15385 81.0179 9.15385Z" fill="currentColor"/>
    <path d="M59.9189 11.6922H56.1035V0.261475H60.3958L67.7804 7.29224L67.9035 7.4307V0.261475H71.7189V11.6922H67.442L60.0112 4.64609L59.9189 4.55378V11.6922Z" fill="currentColor"/>
    <path d="M48.2876 12C43.3645 12 41.4107 10.0308 41.3184 7.76923H45.2568C45.3184 8.8 46.0568 9.33846 48.3184 9.33846C50.2414 9.33846 50.9337 8.96923 50.9337 8.33846C50.9337 7.81539 50.7184 7.56923 47.8107 7.26154C42.6568 6.76923 41.7645 5.33846 41.7645 3.46154C41.7645 1.69231 43.2414 0 47.9953 0C52.6414 0 54.4876 1.8 54.6876 4.2H50.903C50.7645 3.38462 50.1953 2.64615 48.1491 2.64615C46.4261 2.64615 45.8414 2.98462 45.8414 3.53846C45.8414 3.96923 45.9645 4.36923 48.2107 4.58462C54.3799 5.16923 55.0107 6.67692 55.0107 8.23077C55.0107 10.7846 52.703 12 48.2876 12Z" fill="currentColor"/>
    <path d="M41.0482 11.6922H28.5098V0.261475H40.8944V3.06147H32.6482V4.61532H40.2328V7.07686H32.6482V8.89224H41.0482V11.6922Z" fill="currentColor"/>
    <path d="M17.3123 11.6922H13.1738V0.261475H21.4508C25.7584 0.261475 27.2969 1.75378 27.2969 3.75378C27.2969 5.35378 26.2508 6.43071 24.4508 6.78455V6.79994C25.7738 7.1384 26.3123 7.56917 26.6969 9.29224L26.8508 9.92301C27.0354 10.7538 27.1892 11.1538 27.42 11.6922H23.1892C23.0354 11.3999 22.9431 11.0922 22.7277 10.1076L22.5738 9.43071C22.42 8.70763 21.82 8.36917 20.1431 8.36917H17.3123V11.6922ZM17.3123 3.06147V5.72301H21.2046C22.4815 5.72301 23.1738 5.19994 23.1738 4.30763C23.1738 3.47686 22.4815 3.06147 21.2046 3.06147H17.3123Z" fill="currentColor"/>
    <path d="M4.13846 11.6922H0V0.261475H12.2923V3.06147H4.13846V4.92301H11.5538V7.66147H4.13846V11.6922Z" fill="currentColor"/>
  </svg>
)

// ─── Component ───────────────────────────────────────────────────────────────
interface Props {
  onComplete: () => void
}

export default function LoadingScreen({ onComplete }: Props) {
  const [progress, setProgress] = useState(0)
  const [complete, setComplete] = useState(false)
  const [fading, setFading]     = useState(false)
  const [entered, setEntered]   = useState(false)  // initial fade-in of elements
  const rafRef  = useRef<number>(undefined)
  const t0Ref   = useRef<number | null>(null)
  const cbRef   = useRef(onComplete)

  // Keep callback ref fresh
  useEffect(() => { cbRef.current = onComplete }, [onComplete])

  // Trigger entry animation on mount
  useEffect(() => {
    const t = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(t)
  }, [])

  // Main progress animation
  useEffect(() => {
    const startTimer = setTimeout(() => {
      const frame = (ts: number) => {
        if (!t0Ref.current) t0Ref.current = ts
        const elapsed  = ts - t0Ref.current
        const raw      = Math.min(elapsed / LOAD_MS, 1)

        // ease-out-cubic: fast start, natural deceleration
        const eased = 1 - Math.pow(1 - raw, 3)
        setProgress(eased)

        if (raw < 1) {
          rafRef.current = requestAnimationFrame(frame)
        } else {
          setProgress(1)
          setComplete(true)

          // Pause at 100%, then fade out
          setTimeout(() => {
            setFading(true)
            setTimeout(() => cbRef.current(), FADE_MS)
          }, PAUSE_MS)
        }
      }

      rafRef.current = requestAnimationFrame(frame)
    }, START_DELAY)

    return () => {
      clearTimeout(startTimer)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const percent    = Math.round(progress * 100)
  // Logo opacity: 0.3 → 0.55 during 0–70%, then 0.55 → 1.0 during 70–100%
  const logoOpacity = progress < 0.7
    ? 0.3  + (progress / 0.7) * 0.25
    : 0.55 + ((progress - 0.7) / 0.3) * 0.45

  return (
    <div className={`${s.screen} ${fading ? s.screenFading : ''}`}>
      <div className={`${s.content} ${entered ? s.contentVisible : ''}`}>
        {/* Inline row: [face] ═══ progress ═══ [logo] */}
        <div className={s.row}>
          <div className={s.face}>
            <BiakoFace />
          </div>

          <div className={s.lineWrap}>
            <div className={s.lineTrack}>
              <div
                className={s.lineFill}
                style={{ transform: `scaleX(${progress})` }}
              />
            </div>
          </div>

          <div className={s.logo} style={{ opacity: logoOpacity }}>
            <FresnoLogo />
          </div>
        </div>

        {/* Info row: counter + yeepa */}
        <div className={s.info}>
          <span className={s.counter}>
            {String(percent).padStart(2, '0')}%
          </span>
          <span className={`${s.yeepa} ${complete ? s.yeepaVisible : ''}`}>
            Yeeeeeepa!
          </span>
        </div>
      </div>
    </div>
  )
}
