import type { Metadata } from 'next'
import ComingSoon from '@/components/home/ComingSoon/ComingSoon'

const TITLE = 'Juan C. Fresno — Independent Product Designer & Digital Art Director'
const DESCRIPTION =
  'Creo productos digitales, webs e identidades visuales pensadas para destacar, funcionar y crecer. La nueva web está en proceso.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function HomePage() {
  return <ComingSoon />
}
