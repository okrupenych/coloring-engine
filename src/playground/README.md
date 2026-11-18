# Development Playground

This directory contains the browser host application, not the Coloring Engine library.

- `main.ts` is the Vite entry point referenced by `index.html`. It loads the
  application styles, checks the mount element, and starts the application.
- `app.ts` owns application initialization and composes the UI.
- `ui/` owns DOM rendering, styling, and UI interactions. Rendering receives its
  mount element instead of looking up the application's root globally.

The layout in `ui/renderPlayground.ts` provides a primary Canvas Workspace beside
dedicated Development Controls and Diagnostics regions. Each region has a named
heading and a `.region-content` container: replace that container's placeholder
content when adding components without changing the surrounding layout.
`ui/style.css` owns the grid positioning and visual separation. Responsive
breakpoints, canvas rendering, functional controls, diagnostics, and engine
integration are deferred to later tasks.

Future engine code must live outside `src/playground` and remain independent of
this application's DOM, styles, and initialization. The Playground will consume
the engine's public API through host-side integration composed by `app.ts`.
Engine contracts, adapters, and mock behavior are intentionally not defined here.

Run `npm run dev` for development, `npm run build` for TypeScript validation and
the production build, and `npm run preview` to serve the production output.
