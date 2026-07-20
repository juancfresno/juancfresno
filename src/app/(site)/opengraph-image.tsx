import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#10100e',
          color: '#fcfcf7',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 22,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: 'rgba(252, 252, 247, 0.5)',
            marginBottom: 28,
          }}
        >
          Juan C. Fresno
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.15,
            maxWidth: 920,
          }}
        >
          Independent Product Designer &amp; Digital Art Director
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 24,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#003dff',
            marginTop: 40,
          }}
        >
          Product Design — Art Direction — Brand Systems — Interaction
        </div>
      </div>
    ),
    { ...size }
  )
}
