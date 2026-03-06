import type { FeedItem } from './types'

/**
 * Interleave items from both sources, alternating Dribbble ↔ Instagram.
 * Each source is sorted by date (newest first) before interleaving.
 */
export function mergeFeedItems(
  instagram: FeedItem[],
  dribbble: FeedItem[],
): FeedItem[] {
  const ig = [...instagram].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
  const dr = [...dribbble].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  if (ig.length === 0) return dr
  if (dr.length === 0) return ig

  const merged: FeedItem[] = []
  const max = Math.max(ig.length, dr.length)

  for (let i = 0; i < max; i++) {
    if (i < dr.length) merged.push(dr[i])
    if (i < ig.length) merged.push(ig[i])
  }

  return merged
}
