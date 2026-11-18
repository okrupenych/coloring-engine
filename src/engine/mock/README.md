# Mock Engine

`MockEngine<Config>` implements the existing lifecycle, configuration, state,
operations, and capability inspection contracts independently of Playground UI
and rendering. Import from `src/engine/mock`. Event subscriptions and diagnostic
scenarios are reserved for Task #40.

Each instance starts `uninitialized`, with no configuration, tool, color, or
image. Initialize with `{}` for an empty configuration or supply your own schema.
Configuration is never interpreted as mock capabilities or merged with defaults.

```ts
const engine = new MockEngine<{ background: string }>({
  tools: ['brush', 'fill'],
  operations: ['selectTool', 'selectColor', 'loadImage', 'reset', 'undo', 'redo'],
})
await engine.initialize({ background: '#ffffff' })
await engine.selectTool('brush')
await engine.selectColor('#aabbcc')
await engine.loadImage({ kind: 'catalog', url: '/images/flower.svg' })
await engine.undo()
const state = engine.getState()
```

## Capabilities and availability

The optional constructor argument uses the existing `EngineCapabilities` contract.
By default it supports `brush`, `fill`, and all six operations. Explicit lists
replace these defaults, including empty lists. Lists are copied on construction,
remain fixed for the instance, and are returned as detached snapshots in every
lifecycle state. If `selectTool` is omitted, the tools list is normalized to empty.

Supported operations can be temporarily unavailable. While ready and idle,
tool selection requires a nonempty tool list; color selection and image loading
are available if supported. Reset requires a selected image. Undo and Redo use
the simulation below. Every operation is unavailable during a pending mutation.
Unsupported operations and tools return `unsupported-operation` before checking
lifecycle or availability. Supported but unavailable commands return `invalid-state`.
Invalid colors and image inputs return `operation-failed`. Failures preserve all
previously committed selections, configuration, and simulated coloring state.

## Simulation semantics

- Tool selection accepts an identifier from capabilities. Color selection accepts
  exactly six hexadecimal digits after `#` and preserves their letter case.
  Selecting the same tool or color succeeds without creating an undoable change.
- `loadImage` loads and selects its input, replacing the prior image internally.
  Catalog inputs require a nonblank URL string (relative URLs are allowed); no
  request or URL resolution occurs. Local inputs require a nonempty `Blob` or
  `File`; MIME type and bytes are not inspected. This checks input shape, not
  whether the resource exists or is a valid image. Empty inputs fail predictably.
  The wrapper is captured before yielding; immutable Blob bytes may be retained.
- Each successful load, including reloading the same input, seeds **one synthetic
  coloring change**. This deliberately enables Undo without painting. Undo moves
  the token from `changed` to `undone`, disabling Undo and enabling Redo. Redo
  reverses that transition. Repeated Undo or Redo without the opposite transition
  fails with `invalid-state`. Support flags still gate both operations independently.
- Reset returns the selected image to `initial`, removing the synthetic change
  and redo eligibility. Both Undo and Redo become unavailable until another load.
  Reset remains available and repeatable while an image is selected. Reset, Undo,
  and Redo retain the current image, active tool, color, and configuration.
- Image identity and the three-state token remain internal: the public state
  contract has no image field. Image selection is observable through operation
  availability. There is no history stack, decoding, rendering, or Content Library.

## Lifecycle and isolation

Configuration must be structured-cloneable data, not callbacks, UI objects, or
resources. Inputs are deeply copied before the first asynchronous yield, and
reads return fresh deep copies. Non-cloneable input returns `operation-failed`:
initialization enters `failed`, while a rejected replacement retains the previous
configuration and `ready` state. Configuration changes do not alter capabilities,
selections, or the simulated coloring token.

Initialization passes through `initializing` to `ready`; disposal passes through
`disposing` to terminal `disposed`. Each accepted mutation yields one microtask.
Overlapping supported mutations return `invalid-state` rather than queuing.
Reads during mutations return committed selections/configuration with all runtime
operations unavailable. Reads outside `ready` fail; capabilities remain readable.
Disposal is allowed from `uninitialized`, `ready`, or `failed`, releases selected
image and configuration, clears selections, and succeeds again after disposal.
Reinitialization is never allowed. No mutable data is shared across instances.

For manual verification, import the module in a Vite browser console or a
TypeScript-capable runtime. Inspect results before initialization, during pending
promises, after success/failure, and after disposal. Exercise catalog and local
loads, Undo/Redo/Reset, empty support lists, invalid colors/images, and overlapping
configuration/command requests. Mutate input lists, configuration, image wrappers,
and returned snapshots and inspect again. Repeat equivalent sequences on fresh
instances to compare results. No test infrastructure is required.
