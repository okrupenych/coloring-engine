# Mock Engine

`MockEngine<Config>` implements the existing lifecycle, configuration, state,
operations, and capability inspection contracts independently of Playground UI
and rendering. Import from `src/engine/mock`. It also implements the existing event subscription contract.

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

## Events and ownership

Subscribe before initialization to observe the full lifecycle. Delivery is
synchronous in registration order without replay. Each call owns a separate
registration, even for the same callback. Unsubscribe is synchronous and idempotent.
Removing a later listener during delivery skips its callback; self-unsubscription
lets the current callback finish. New registrations start with the next event.
Listener exceptions cannot interrupt delivery or change results.

Every listener receives its own structured clone. Configuration must contain public
data. Error details expose only operation names and attempt numbers, never input
values, resources, exceptions or stacks. Timestamps are Unix epoch milliseconds;
delivery order, not timestamps, determines ordering.

| Accepted request | Notification order |
| --- | --- |
| Initialize successfully | state(initializing), state(ready), configuration |
| Replace configuration successfully | state(busy), configuration, state(idle) |
| Tool/color/image selection, Reset/Undo/Redo | state(busy), state(idle with committed selection/availability) |
| Invalid configuration/command input | state(pending), error, state(idle); initialization instead enters failed before error |
| Simulated command/configuration failure | state(busy), diagnostic, error, state(idle) |
| Simulated initialization/disposal failure | state(initializing/disposing), state(failed), diagnostic, error |
| Dispose successfully | state(disposing), state(disposed), release listeners |

Here state means `state-changed`; busy/idle both carry lifecycle `ready`.
Inspect state during callbacks to observe availability. Image selection uses the
same invalidation event even when availability is unchanged. No image resources
are published. Configuration notifications follow the commit. Mutations requested
inside callbacks return `invalid-state` (unsupported requests retain precedence),
avoiding nested mutations during delivery. Reads and unsubscription work; schedule
subsequent mutations after the current request completes.

Rejected lifecycle, busy, unsupported, and read requests return failures without
events or consuming failure attempts. Accepted operation failures emit `error`;
the returned result remains authoritative. The info diagnostic explains the
configured simulation and is not itself a failure result.

Disposal permanently stops accepting new subscriptions, including after failure.
Existing listeners survive failed disposal until explicitly released or successful
cleanup. Successful disposal clears listeners after the final notification and
releases configuration/image resources. Subsequent calls emit nothing; repeated
disposal succeeds silently. Consumers own subscriptions and should unsubscribe
when detached from the adapter.

## Reproducible failures

The optional second constructor argument is a detached, fixed failure schedule:

```ts
const engine = new MockEngine(undefined, {
  selectColor: [2],          // Second valid, available color request fails.
  updateConfiguration: [1], // First cloneable replacement fails.
  dispose: [1],             // First disposal fails; retry succeeds.
})
```

Keys are the six runtime commands, `initialize`, `updateConfiguration`, and
`dispose`. Lists contain one-based positive integer attempt numbers. Omitted keys
and empty lists never simulate failures; duplicates have no extra effect and
nonpositive/noninteger entries never match. Counters are independent per operation
and instance, advancing only after support, lifecycle, availability, and input
validation succeed. There is no randomness, timer or runtime scenario mutation.

Matched attempts return `operation-failed` before committing requested data.
Selections, configuration, image and synthetic coloring remain intact. Lifecycle
failures enter `failed`; inspection is then unavailable and disposal can clean up.
Failures use fixed public messages and detached `{ operation, attempt }` details.
Equivalent schedules and request sequences produce identical events/results apart
from real timestamps.

Task #40 was manually exercised in Node's TypeScript runtime without test files:
lifecycle/operation traces and callback-time inspection; multiple and duplicate
registrations; self/removal of a later listener; throwing listeners; payload
isolation; failure scenarios; disposal retry and cleanup; post-disposal silence;
and independent instances. Equivalent runs matched after removing timestamps.
TypeScript compilation and the production build passed.
