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
`ui/style.css` owns the grid positioning and visual separation. Below 40rem,
regions stack in reading order with the workspace first. From 40rem, the supporting
panels share a row below the workspace; from 64rem, they form a sidebar beside it.
These content-based breakpoints respond to available width in either orientation.
The workspace has a fluid minimum height, and the document scrolls vertically when
needed so supporting panels stay accessible even in short landscape viewports.
Region content can grow naturally; future components should respect their
container width and handle intrinsically wide content locally (for example, a
scrollable diagnostic table).
Canvas rendering, functional controls, diagnostics, and engine integration are
deferred to later tasks.

`ui/createCanvasHost.ts` creates an empty, reusable DOM host. Its `element` fills
the positioned `.workspace-content` container; oversized external content scrolls
inside the host without expanding the surrounding layout. The host is available
as `canvasHost` from `initializePlayground(root)` (and `renderPlayground(root)`).
Keep that reference for the lifetime of the rendered view:

```ts
const view = initializePlayground(root)
const { canvasHost } = view
console.log(canvasHost.dimensions) // Initial size, measured after mounting.
const unsubscribe = canvasHost.subscribe(({ width, height }) => {
  console.log(width, height)
})
const surface = document.createElement('div') // Externally managed element.
canvasHost.element.append(surface)
surface.remove()
unsubscribe()
view.dispose() // Call before replacing/reinitializing this view.
```

Mounting and removal use native DOM methods and leave the host and layout intact.
The caller owns the mounted elements and any rendering resources or cleanup.
The host has no engine or rendering dependency. `trackContainerDimensions.ts`
uses one native `ResizeObserver` per host and can also track any HTML container.
Dimensions are immutable snapshots of the inner width and height in integer CSS
pixels (including padding, excluding borders and scrollbars), not image resolution.
Subscriptions receive only changed sizes, including transitions to and from zero.
Observation starts immediately; `createCanvasHost(parent)` mounts before the first
measurement. With no parent, a detached host starts at zero and updates after mount.
Browser resize delivery is asynchronous; the getter retains the latest measured size.
Unsubscribe and dispose are idempotent. Disposal disconnects observation, clears all
subscriptions, retains the last size, and makes new subscriptions throw. It leaves
externally owned DOM intact. Dispose the view before initializing another in the
same root; the Vite entry point also disposes its view during hot replacement.

Future engine code must live outside `src/playground` and remain independent of
this application's DOM, styles, and initialization. The Playground will consume
the engine's public API through host-side integration composed by `app.ts`.
Engine contracts, adapters, and mock behavior are intentionally not defined here.

Run `npm run dev` for development, `npm run build` for TypeScript validation and
the production build, and `npm run preview` to serve the production output.
