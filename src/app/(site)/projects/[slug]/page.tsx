type Props = {
  params: Promise<{ slug: string }>
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params

  return (
    <main>
      {/* Project detail — {slug} */}
    </main>
  )
}
