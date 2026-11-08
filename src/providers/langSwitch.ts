// Language switch across the site transition (server-safe: no 'use client').
// Switching language is a full page load (each locale has its own root
// layout, <html lang> included). The old page covers itself with the
// transition, sets this flag and loads the new URL; this inline script hides
// <main> on the new page before paint, and PageTransitionProvider reveals it
// with the same effect. Safety net: the page shows after 3 s regardless.
export const LANG_SWITCH_KEY = 'fresno:lang-switch'

export const LANG_SWITCH_SCRIPT = `(function(){try{if(!sessionStorage.getItem('${LANG_SWITCH_KEY}')||matchMedia('(prefers-reduced-motion: reduce)').matches)return;var d=document.documentElement;d.dataset.langSwitch='';setTimeout(function(){delete d.dataset.langSwitch},3000)}catch(e){}})()`
