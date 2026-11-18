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
Canvas rendering, functional controls, and diagnostics are
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
await view.dispose() // Call before replacing/reinitializing this application.
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


## Application engine ownership

Startup renders the existing layout and Canvas Host immediately. The application
creates one manager with an injected factory (a fresh Mock Engine by default), then
initializes it with the deterministic configuration { profile: 'playground' }.
The returned application's ready promise resolves to the manager result. No
adapter is exposed while initialization is pending or failed. main.ts logs startup
failures, including unexpected rejections; it does not throw them from a detached
async callback. Recover from startup failure by disposing and creating a new app.

The Canvas Workspace boundary in ui/createWorkspaceEngine.ts receives only
EngineAdapterAccess<WorkspaceAdapter>. Its adapter type combines existing public
inspection, event, and tool-selection contracts. It reads detached state and
capability snapshots and maintains the host's aria-busy attribute. It contains no
Mock Engine import, configuration knowledge, lifecycle management, or rendering.
workspace.selectTool(tool) borrows the current adapter for one command; inspect
workspace.snapshot for public state, capabilities, and the latest current result.
No development controls or diagnostics UI is introduced.

The application calls workspace.attach() after initialization because manager
change notifications intentionally do not replay initial activation. Subsequently,
the consumer owns one manager change subscription and one active engine
subscription. Successful replaceAdapter(factory, configuration) delegates to the
existing manager: activate, synchronously detach/attach consumer subscriptions,
then dispose the old adapter. Failed initialization keeps the previous consumer
and adapter usable without a false notification. A cleanup failure after activation
returns an error with details.activated=true: the new adapter remains active.
Dispose the application to release retained cleanup obligations before recreating
it; this application does not expose the manager's lifecycle to components.

Callbacks verify both adapter identity and consumer generation. Async command
results repeat that check after awaiting, so obsolete results cannot overwrite
the new consumer's snapshot. Already-started operations still settle for their
callers; detaching does not cancel engine work. Disposal invalidates callbacks,
unsubscribes both registrations immediately, clears snapshots, and disconnects
Canvas Host observation. The application waits for startup, pending replacements,
and consumer commands before disposing the manager, respecting its busy-state
rules. Concurrent disposal calls share one promise; successful cleanup is cached.
A failed manager cleanup can be retried explicitly with application.dispose();
already-disposed UI resources are not disposed again.

main.ts exports its application for host inspection without a global singleton
manager. Its self-accepting Vite HMR boundary invokes the same teardown, observes
the async result, and logs cleanup failures. HMR removes subscriptions and the
ResizeObserver synchronously; engine cleanup may finish after the new module
starts, with independent ownership and no callbacks into the new application.
A permanently failing adapter requires host intervention; cleanup cannot force
an implementation to release resources.

For manual browser inspection on the Vite development server:

```js
const { application } = await import('/src/playground/main.ts')
await application.ready
application.workspace.snapshot
await application.workspace.selectTool('brush')
const { MockEngine } = await import('/src/engine/mock/MockEngine.ts')
await application.replaceAdapter(() => new MockEngine())
await application.replaceAdapter(() => new MockEngine(undefined, { initialize: [1] }))
application.workspace.snapshot // Previous adapter remains usable.
await application.dispose()
```

Task #84 verification used the running Vite application in headless Edge through
browser console evaluation, without test files or dependencies. Startup, public
tool selection/state/capabilities, successful/failed replacement, detached old
subscriptions, retained old callbacks, delayed stale command completion, failed
startup/factory rejection, disposal during initialization, cleanup failure/retry,
repeated disposal, and independent applications were inspected. A real file
change triggered Vite HMR: the old adapter was disposed once, its snapshot cleared,
and one ready Canvas Host remained. Desktop (1280px), tablet (768px), and mobile
(375px) widths retained responsive grid placement and no horizontal overflow;
Canvas Host resize notifications matched changing positive dimensions.
TypeScript compilation and production build passed. This verifies headless browser
behavior; no interactive visual review or real engine rendering was performed.
