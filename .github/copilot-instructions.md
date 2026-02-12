## Project snapshot for AI coding assistants

Short, actionable points to be immediately productive in this repository.

- Stack: React + TypeScript (mixed JS), React Router v7 with the `@react-router/dev` toolchain, Vite, i18next for translations, Framer Motion for animations, Leaflet for maps. See `package.json` for exact deps and scripts.

### Where to look first
- Routes and URL shape: `app/routes.ts` — routes are composed with `layout`, `prefix`, `index`, `route`. The site uses locale prefixes: `/es/*` and `/en/*`.
- Root layout and global providers: `app/root.tsx` — wraps pages with `ThemeProvider` and `LanguageProvider` and sets HTML `lang` based on URL.
- Translations: `app/i18n.ts` and `app/locales/{en,es}` — i18n resources are imported statically and `ns: ["common","home","qa","schedule","rsvp"]` is used.
- Contexts: `app/contexts/LanguageContext.tsx` and `app/contexts/ThemeContext.jsx` — language switching navigates by mutating the URL (`navigate('/en'|'/es' + path)`), and theme persists to `localStorage` and sets `data-theme` on the document element.
- Components: `app/components/*` — small, focused function components (TypeScript). Example patterns: `GuestManager.tsx` is controlled via props and callbacks; `GuestCard.tsx` uses `framer-motion` and controlled inputs.
- Build/dev config: `vite.config.ts` (uses `@react-router/dev/vite` plugin and `vite-tsconfig-paths`). `tsconfig.json` defines `@/*` -> `./app/*` path alias.

### Common edit patterns / examples
- Add a route: edit `app/routes.ts`. To add an English route mounted at `/en/party`, add inside the `...prefix("en", [...])` block: `route("party","routes/party.tsx", { id: "en/party" })`.
- Add translations: put JSON under `app/locales/en` and `app/locales/es`. Then import the new file in `app/i18n.ts` and add it to the `resources` object and, if applicable, to `ns`.
- Use path alias: import from `@/components/Foo` instead of `../../components/Foo` (see `tsconfig.json` and `vite.config.ts` which honors `vite-tsconfig-paths`).

### Build / run / deploy (exact commands)
- Install: `npm install`
- Dev (HMR): `npm run dev` (runs `react-router dev`)
- Build (prod): `npm run build` (runs `react-router build`) — outputs to `dist/` (client + server)
- Typecheck: `npm run typecheck` (runs `react-router typegen && tsc`)
- Preview production client: `npm run preview` (uses `vite preview --port 4173` — note port)
- Deploy to GitHub Pages: `npm run deploy` (pushes `dist/client` via `gh-pages` and sets custom CNAME in package.json `deploy` script)
- Docker: repository contains a `Dockerfile`; the README shows example Docker build/run usage.

Notes: Vite `base` is set in `vite.config.ts` to `"/leslie-benjamin-wedding/"` for production — changing the repository name or GitHub Pages path requires updating that value.

### Code conventions / gotchas
- Mixed TS and JS: Most of the app is TypeScript, but some files (e.g., `app/contexts/ThemeContext.jsx`) are plain JS/JSX. Respect file extensions and typings; `tsconfig` has `skipLibCheck: true` and `noEmit: true`.
- Routing & SSR: Project uses React Router's dev/build/serve model. Routes reference component files under `app/routes/*.tsx` and route IDs (e.g., `id: "en/home"`) are used by the router tooling.
- i18n is URL-first: Language is determined from the pathname prefix and persisted to `localStorage` under key `preferred-language` (see `app/i18n.ts` and `LanguageContext`). Changing language mutates the URL (not only `i18n.changeLanguage`).
- UI patterns: animated transitions via `framer-motion` are used widely — prefer `AnimatePresence` and `motion` patterns already present in components.

### Where to run edits, tests and verification
- Fast verification: run `npm run dev` and open `http://localhost:5173` (dev server from react-router dev). Use `npm run preview` after `npm run build` to test production output locally.
- Typechecks: run `npm run typecheck`. If adding route types, run `react-router typegen` (part of `typecheck` script).

### Files to reference when changing behavior
- Routing: `app/routes.ts` and `app/routes/*.tsx`
- Root providers and layout: `app/root.tsx`
- i18n: `app/i18n.ts`, `app/locales/**`
- Contexts: `app/contexts/LanguageContext.tsx`, `app/contexts/ThemeContext.jsx`
- Build config: `vite.config.ts`, `tsconfig.json`, and `package.json` scripts

If anything in these instructions is unclear or you want more detail (for example a specific recipe for adding an SSR data loader, unit test examples, or local debugging tips for the map or email integrations), tell me which area to expand and I will iterate.
