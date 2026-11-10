// WIP intro (wip/Intro.tsx): decided before the first paint, in <head>, so
// nothing flashes. Only on the landing (/ and /es). First visit in the
// session = "full" (~1.5 s), later loads = "fast" (~0.7 s), reduced motion =
// "reduced" (a plain fade). sessionStorage 'wip:intro'.
export const WIP_INTRO_SCRIPT =
  "try{if(/^\\/(es\\/?)?$/.test(location.pathname)){var r=document.documentElement,m=matchMedia('(prefers-reduced-motion: reduce)').matches,s=null;try{s=sessionStorage.getItem('wip:intro');sessionStorage.setItem('wip:intro','1')}catch(e){}r.dataset.intro=m?'reduced':(s?'fast':'full')}}catch(e){}"
