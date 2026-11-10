'use client'

import NoSignal from '@/components/notfound/NoSignal'

// 404 · "No signal" (components/notfound/NoSignal): analog TV snow with RGB
// tears and a broadcast error card. Client component: not-found files get no
// params, the locale comes from the layout's provider. Title per locale and
// noindex: [...rest]/page.tsx.
export default function NotFound() {
  return <NoSignal />
}
