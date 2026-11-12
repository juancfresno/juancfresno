'use client'

import { useRef, useEffect } from 'react'
import { register } from './engine'

interface Props {
  className?: string
}

/**
 * Interactive divider: a 1 px string with fixed ends. Near the cursor it
 * leans, latches on and stretches; let go (or press-drag and release) and it
 * twangs, the wave travelling and reflecting along the line. Physics, pointer
 * handling and the single shared rAF loop live in `engine.ts`.
 */
export default function ElasticLine({ className }: Props) {
  const svgRef  = useRef<SVGSVGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const svg  = svgRef.current
    const path = pathRef.current
    if (!svg || !path) return
    return register(svg, path)
  }, [])

  return (
    <svg
      ref={svgRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '1px', overflow: 'visible' }}
      aria-hidden="true"
    >
      <path
        ref={pathRef}
        d="M 0 0.5 L 1 0.5"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  )
}
