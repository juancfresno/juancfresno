// Where the small FRESNO© ring sits once docked in the header's top-right
// corner. Shared by the About donut (LogoDonut) and the nav morph (NavDonut),
// so both land on the same spot.
export const DOCK_W = 128       // ring width, desktop
export const DOCK_W_SMALL = 84  // ring width ≤ 768
export const DOCK_Y = 92        // ring centre, px from the top of the viewport
// Page margin (--m in globals.scss), mirrored in JS.
export const pageMargin = (w: number) => Math.max(20, 0.02381 * w)
