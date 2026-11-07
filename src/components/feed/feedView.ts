// Feed view chosen before paint (server-safe module: no 'use client').
// Mirrors decide() in FeedViews.tsx: ?view= → localStorage → default (Canvas
// with a fine pointer, > 768 px and no reduced motion; Rejilla otherwise).
export const FEED_VIEW_KEY = 'feed:view'

export const FEED_VIEW_SCRIPT = `(function(){try{var q=new URLSearchParams(location.search).get('view'),s=null;try{s=localStorage.getItem('${FEED_VIEW_KEY}')}catch(e){}var d=matchMedia('(hover: hover) and (pointer: fine) and (min-width: 769px)').matches&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'canvas':'rejilla';document.documentElement.dataset.feedView=q==='canvas'||q==='rejilla'?q:s==='canvas'||s==='rejilla'?s:d}catch(e){}})()`
