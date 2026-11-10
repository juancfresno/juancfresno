// ─── Feed: curated selection ─────────────────────────────────────────────────
// /feed (Canvas and Rejilla) shows ONLY these pieces, in this order. The full
// feed (generated/feed.json, 201 pieces) stays intact in FEED.
//
// To edit: add, remove or reorder ids from src/content/generated/feed.json
// (field "id"). Order = the canvas order: each slot of the tile
// (feed-canvas.json, 30 slots) takes the next unused id with its ratio
// (4:3 / 4:5 / 9:16), else the next unused id (cover-cropped). With fewer ids
// than slots, the extra slots cycle from the start; ids beyond 30 only show in
// Rejilla. The number in captions and the zoom ("NNN / 30") is the position here.
//
// Default (08/11/2026): Diseño's Figma tile "Feed · Canvas" (6867:1129) in its
// slot order. Its 30 frames were carousel slides of 21 feed posts (the feed
// keeps one image per post), so the 21 posts come first and 9 recent 4:3
// pieces fill the rest until Juan curates the list.
export const FEED_SELECTION: string[] = [
  '04_DUnJ_shAe0I', // Likitech Rebrand · 2026-02
  '27050472', // Likitech - Business Card · 2026-02
  '07_DUQu7oYDs-O', // Rebranding Likitech. · 2026-02
  '01_DU7sVCkIAxk', // PlayerUp App — Score Screen · 2026-02
  '03_DUpu1QUDd28', // PlayerUp — onboarding UI. · 2026-02
  '27062869', // Player Up — App · 2026-02
  '13_DTgBhluDyxa', // Educa Projects - Brand in Use · 2026-01
  '14_DTa398VjZiN', // Educa Projects Brand Identity · 2026-01
  '02_DU3s9P3AB6J', // Responsive Web UI - Layout System · 2026-02
  '27090937', // Drip — Desktop & Mobile UI · 2026-02
  '05_DUh89WziPiM', // Aplicaciones digitales de la identidad. · 2026-02
  '09_DUD9zf4gSzt', // Y de vez en cuando también le damos a los poster · 2026-01
  '25904396', // ➞ MUSIC PLAYER UI · 2025-04
  '27062940', // Minimal Blog UI · 2026-02
  '27077840', // cta—interaction · 2026-02
  '10_DT92aBtjfrJ', // Lo más divertido del proceso es jugar con los co · 2026-01
  '12_DTr1QX1lID2', // Subtle interaction applied to a gallery module · 2026-01
  '06_DUV_XX0DDC0', // Propuestas de portadas para catálogo. · 2026-02
  '08_DUNYnebjJ2L', // January recap. · 2026-02
  '11_DTw-b68lfm2', // Distintas composiciones para módulos con interac · 2026-01
  '17_DHs5se2qHw5', // ⇨ LOGO DESIGN — CARLOS VARA · 2025-03
  '25477741', // 025setup- · 2025-01
  '24995609', // awen stickers. · 2024-10
  '24966544', // Awen website. · 2024-10
  '24950770', // Awen UI · 2024-09
  '24947833', // awen _ naming + branding · 2024-09
  '24934052', // Picnic magazine. · 2024-09
  '24931142', // Patterns · 2024-09
  '24929265', // Creative assets · 2024-09
  '24909945', // Correos icons · 2024-09
]
