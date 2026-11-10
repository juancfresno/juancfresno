Add the "Fresno Lab · 001 · Buttons" interactions to this project.

Source (no dependencies, MIT): https://juancfresno.com/lab/botones
- buttons.css — classes .fb plus one modifier each: .fb--magnet, .fb--cols, .fb--roll, .fb--scramble
- buttons.js — fresnoButtons(root) wires them and returns a cleanup function

What I want:
1. Use these four behaviours on the primary buttons/links of this project, choosing the one that fits each context (magnet for the main CTA, columns for secondary CTAs, roll for nav-like links, scramble for technical/mono labels). Ask me if a choice is unclear.
2. Map --fb-fg and --fb-inv to this project's existing color tokens so the buttons follow its theme (light/dark if it has one). Don't hardcode colors.
3. Match the project's stack: if it's React/Vue/Svelte, port fresnoButtons into a small hook/action with cleanup on unmount instead of the global script.
4. Keep it accessible: real <button>/<a> elements, visible focus, respect prefers-reduced-motion (already in the CSS — keep it).
5. Don't change layout or copy; only the button behaviour and styling.
Show me the diff before applying it to more than three components.
