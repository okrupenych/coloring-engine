# Development Playground

This directory contains the browser host application, not the Coloring Engine library.

- `main.ts` is the Vite entry point referenced by `index.html`. It loads the
  application styles, checks the mount element, and starts the application.
- `app.ts` owns application initialization and composes the UI.
- `ui/` owns DOM rendering, styling, and UI interactions. Rendering receives its
  mount element instead of looking up the application's root globally.

The initial screen displays the application name and a workspace placeholder.
Workspace layout and engine integration will be added in later tasks.

Future engine code must live outside `src/playground` and remain independent of
this application's DOM, styles, and initialization. The Playground will consume
the engine's public API through host-side integration composed by `app.ts`.
Engine contracts, adapters, and mock behavior are intentionally not defined here.

Run `npm run dev` for development, `npm run build` for TypeScript validation and
the production build, and `npm run preview` to serve the production output.
