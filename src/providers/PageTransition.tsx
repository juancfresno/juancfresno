'use client'

import { createContext, useCallback, useContext, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

// ─── Context ──────────────────────────────────────────────────────────────────
type TransitionCtx = { navigate: (href: string) => void }
const Ctx = createContext<TransitionCtx>({ navigate: () => {} })
export const usePageTransition = () => useContext(Ctx)

// ─── Provider ─────────────────────────────────────────────────────────────────
// Placeholder pixel-dissolve transition + initial loading screen removed —
// a different transition/loading treatment will replace this later. This
// still owns the `navigate` seam so Nav/Footer/ProjectsGallery don't change.
export default function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const navigate = useCallback((href: string) => router.push(href), [router])

  return <Ctx.Provider value={{ navigate }}>{children}</Ctx.Provider>
}
