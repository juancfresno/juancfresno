'use client'

import { useEffect, useRef, useState } from 'react'

interface UseInViewOptions {
  /** Visibility ratio to trigger (0–1). Default 0.15 */
  threshold?: number
  /** Root margin for earlier/later trigger. Default "0px 0px -60px 0px" */
  rootMargin?: string
  /** Only trigger once (then disconnect). Default true */
  once?: boolean
}

/**
 * Returns a ref and an `inView` boolean.
 * Attach `ref` to any element — `inView` becomes true once visible.
 */
export function useInView<T extends HTMLElement = HTMLElement>({
  threshold = 0.15,
  rootMargin = '0px 0px -60px 0px',
  once = true,
}: UseInViewOptions = {}) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  return { ref, inView }
}
