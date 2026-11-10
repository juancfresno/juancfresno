// Page themes: pages that override the site's dark/light theme (server-safe).
// Today only Contact, in the brand blue (Figma "Contact" 7014:18145). The
// tokens live in globals.scss under html[data-page-theme] / html[data-chrome];
// PageTransition flips them during the site transition.
export type PageTheme = 'blue' | null

const BLUE = /^(?:\/(?:en|es))?\/contact\/?$/

/** The page theme of a public pathname (/contact, /es/contact → blue). */
export const pageThemeOf = (pathname: string): PageTheme => (BLUE.test(pathname) ? 'blue' : null)

/** Inline <head> script: a direct load of a blue page is born blue (no flash). */
export const PAGE_THEME_SCRIPT = `(function(){try{if(${BLUE.toString()}.test(location.pathname)){var d=document.documentElement.dataset;d.pageTheme='blue';d.chrome='blue'}}catch(e){}})()`

/** Apply a page theme to <html> at once: the page and its chrome. */
export function applyPageTheme(t: PageTheme, part: 'page' | 'chrome' | 'both' = 'both') {
  const d = document.documentElement.dataset
  if (part !== 'chrome') { if (t) d.pageTheme = t; else delete d.pageTheme }
  if (part !== 'page') { if (t) d.chrome = t; else delete d.chrome }
}

export const currentPageTheme = (): PageTheme =>
  (document.documentElement.dataset.pageTheme as PageTheme) ?? null
