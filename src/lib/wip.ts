// Temporary "work in progress" landing (branch wip-landing).
// true  → `/` and `/es` show the WIP landing (hero + cursor trail), the header
//         has no nav menu or mobile tab bar, every other page redirects to the
//         locale root (src/proxy.ts) and the sitemap lists only / and /es.
// false → the full v1.0 site. Flip this one constant to launch v1.0.
export const WIP = true
