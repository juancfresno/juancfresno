'use client'

import { useEffect } from 'react'

export default function ContactPage() {
  // Switch body background for this light page
  useEffect(() => {
    const prev = document.body.style.backgroundColor
    document.body.style.backgroundColor = '#F2F8FC'
    return () => { document.body.style.backgroundColor = prev }
  }, [])

  return (
    <main style={{ minHeight: '100vh' }}>
      {/* Contact — content coming soon */}
    </main>
  )
}
