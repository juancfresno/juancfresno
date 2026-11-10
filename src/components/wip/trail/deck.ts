// Shared queue for every trail variant: a shuffled round shows every piece
// once before any repeats (and never the same piece twice in a row across
// rounds). Nothing loads until `wake()` (first pointer event or idle time);
// then the next AHEAD pieces are decoded in advance. `take()` returns the next
// decoded piece or null (the trail skips a beat rather than breaking order).

export type TrailItem = { src: string; r: number } // r = width / height

const AHEAD = 6

function shuffle(n: number, avoidFirst?: number) {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  if (n > 1 && a[0] === avoidFirst) [a[0], a[n - 1]] = [a[n - 1], a[0]]
  return a
}

export function createDeck(items: TrailItem[]) {
  let order = shuffle(items.length)
  let qi = 0
  let awake = false
  const state = new Map<string, 'loading' | 'ready' | 'failed'>()

  const preload = () => {
    if (!awake) return
    for (let k = 0; k < AHEAD && qi + k < order.length; k++) {
      const { src } = items[order[qi + k]]
      if (state.has(src)) continue
      state.set(src, 'loading')
      const im = new Image()
      im.decoding = 'async'
      im.src = src
      im.decode().then(
        () => state.set(src, 'ready'),
        () => state.set(src, 'failed'),
      )
    }
  }
  const advance = () => {
    qi++
    if (qi >= order.length) {
      order = shuffle(items.length, order[order.length - 1])
      qi = 0
    }
    preload()
  }

  return {
    wake() {
      if (awake) return
      awake = true
      preload()
    },
    take(): TrailItem | null {
      for (let guard = 0; guard < items.length; guard++) {
        const it = items[order[qi]]
        const st = state.get(it.src)
        if (st === 'failed') { advance(); continue }
        if (st !== 'ready') return null
        advance()
        return it
      }
      return null
    },
  }
}

export type Deck = ReturnType<typeof createDeck>
