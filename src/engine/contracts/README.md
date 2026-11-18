# Engine integration contracts

These type-only modules are independent of the Playground, rendering technology,
and engine implementation. Import from `src/engine/contracts` or an individual
module using `import type`. They have no runtime dependencies or implementation.

`EngineLifecycle<Config>` and `EngineConfiguration<Config>` are small, separate
interfaces. A consumer needing both can use their intersection. Mock and real
adapters use the same concrete `Config` type; no configuration fields are invented
here. `Config` should describe configuration data, not engine resources or UI
objects. `Readonly<Config>` protects top-level properties at compile time; nested
immutability belongs to the supplied schema. Implementations must isolate input
and output data so external mutation cannot change active configuration.

Initialization and disposal are asynchronous, as are configuration replacements.
Reading configuration is synchronous: it reads the adapter's last committed
snapshot, without initiating engine work. Updates replace the full configuration;
there are no patch semantics, validation rules, or normalization rules here.

Every operation uses `EngineOperationResult<T>`. Narrow on `ok` before reading
`value` or `error`. Successful lifecycle and update results have `value: undefined`;
successful reads contain a snapshot. `invalid-state` means the
request is unavailable in the current lifecycle state or another mutation is
pending. `operation-failed` means an accepted request could not complete. Messages
are human-readable explanations, not machine-readable identifiers. Expected
failures use results; unexpected throws/rejections indicate implementation defects
and should still be handled at an application boundary. These request failures
share the public error representation described below.

| Request | Allowed state | Successful outcome | Operational failure |
| --- | --- | --- | --- |
| Initialize | uninitialized | initializing → ready | initializing → failed |
| Read configuration | ready | detached current snapshot | ready, configuration unchanged |
| Replace configuration | ready | ready, replacement committed | ready, previous configuration retained |
| Dispose | uninitialized, ready, failed | disposing → disposed | disposing → failed |
| Dispose again | disposed | success, no further work | — |

Other state/request combinations return `invalid-state` without side effects.
Only one mutating request may be pending: overlapping initialization, update,
runtime command, or disposal requests return `invalid-state` rather than being queued. Reads during
an update return the previous committed snapshot until success. Reads outside
ready return `invalid-state`. A failed initialization or disposal can be cleaned
up by disposal; initialization cannot be retried on the same instance. A disposed
instance cannot be reused. These are obligations for future adapters, not lifecycle
orchestration implemented by this module.

## Operations, images, and inspection

`EngineOperations` defines asynchronous tool/color selection, image loading,
reset, undo, and redo. `loadImage` both loads and selects the input on success;
there is no separate image registry or selection by internal handle. Catalog
URLs and local `Blob`/`File` values share the `EngineImageInput` discriminated
union. Adapters consume local bytes directly; consumers need not create or host
public URLs. Decoding, processing, and catalog management are not defined here.

Tool identifiers come from `getCapabilities().tools`, with no speculative list
of painting tools. Colors use sRGB `#RRGGBB` strings. The template literal type
checks the prefix only; adapters must validate the six hexadecimal digits and
report invalid values as `operation-failed` without changing state.

`EngineCapabilityInspection` exposes supported tools and commands synchronously
in every lifecycle state. `EngineStateInspection` returns read-only runtime
snapshots while ready, including the selected tool/color and a boolean for every
command's current availability. These are detached snapshots, not mutable views
or subscriptions. All nested contract fields and arrays are read-only. Support
does not imply availability: for example, undo may be supported but unavailable
with empty history. Availability is advisory; requests must still be checked
when invoked. Unsupported operations must always have availability `false`.

Commands return `EngineCommandResult`, using the existing result shape. The
optional second type parameter of `EngineOperationResult` defaults to the original
failure type, preserving existing lifecycle/configuration consumers and their
error-code unions. Runtime commands additionally return `unsupported-operation`
for commands absent from capabilities or tool IDs absent from the supported list.
This check takes precedence over lifecycle/busy/availability checks; unsupported
requests never succeed silently, throw, or change state. Supported but temporarily
unavailable requests return `invalid-state`. Other expected failures return
`operation-failed`. Success commits the requested change; failure leaves the
previous committed state intact. Reset restores the selected image's initial
coloring; undo/redo concern coloring changes on that image, not configuration or
tool/color selection. These are adapter obligations, with no runtime behavior here.

The interfaces compose structurally with the existing contracts. This type-only
example also shows independent module imports and both image sources:

```ts
import type { EngineLifecycle } from './lifecycle'
import type { EngineConfiguration } from './configuration'
import type { EngineImageInput } from './image'
import type {
  EngineColor, EngineCommandFailure, EngineCommandResult, EngineOperation,
  EngineOperations, EngineToolId,
} from './operations'
import type { EngineCapabilities, EngineCapabilityInspection } from './capabilities'
import type {
  EngineOperationAvailability, EngineRuntimeState, EngineStateInspection,
} from './state'

type Config = { readonly background: string }
export type Adapter = EngineLifecycle<Config> & EngineConfiguration<Config>
  & EngineOperations & EngineCapabilityInspection & EngineStateInspection

export const catalog: EngineImageInput = { kind: 'catalog', url: '/images/flower.svg' }
export const local = (file: File): EngineImageInput => ({ kind: 'local', blob: file })
export const bytes = (blob: Blob): EngineImageInput => ({ kind: 'local', blob })
export type PublicTypes = [EngineColor, EngineCommandFailure, EngineCommandResult,
  EngineOperation, EngineToolId, EngineCapabilities, EngineOperationAvailability,
  EngineRuntimeState]
```

## Events, errors, and subscriptions

`EngineEvent<Type, Payload>` carries a string type, Unix epoch millisecond
timestamp, and optional structured payload. `EngineNotification<Config>` is a
discriminated union of the current notifications:

- `state-changed` invalidates public inspection data and carries the current
  lifecycle state. Re-read `getState()` while ready and `getCapabilities()` in any
  state. Emit for lifecycle, selection, availability, and capability changes,
  including entry to and exit from pending mutations. This reuses the inspection
  contracts without duplicating their snapshots in events.
- `configuration-changed` carries the detached committed configuration after
  initialization or a successful replacement. Failed updates do not emit it.
- `error` observes an operational failure through `EngineError`. Request results
  remain authoritative; notifications do not replace results. Consumers observing
  both channels should avoid reporting the same failure twice.
- `diagnostic` carries an observational message with `debug`, `info`, `warning`,
  or `error` severity. Severity alone does not mean an operation failed.

Emit change notifications after public inspection reflects the change. Timestamps
record occurrence time, not unique IDs or an ordering guarantee. Subscriptions
do not replay history. Subscribe before initialization to observe its transitions;
consumers attaching later must read initial public snapshots.

`EngineError<Code>` supplies code, message, and optional `EngineDetails`. Existing
lifecycle/configuration and command failures keep their exact code unions and
result semantics. Details are recursively read-only data, never raw exceptions,
stacks, renderer objects, image buffers, callbacks, or internal handles. Producers
must sanitize and detach payloads and details. Structural typing cannot enforce
sanitization or isolation at runtime. Configuration and custom schemas must also
contain only public data. The envelope's `Readonly` is shallow; nested
immutability belongs to the schema. Consumers treat all delivered data as immutable.

`EngineEventSource<EventUnion>` preserves type/payload relationships. Extend a
local union with `EngineEvent<'custom-name', Data>` without changing existing
types or subscriptions. Generic observers can use the default `EngineEvent`
envelope and ignore unknown types; validate unknown payloads before using fields.
Do not add an unrestricted string variant to a discriminated union and assume
it still narrows. There is no global registry or declaration merging requirement.

Each subscription is a distinct subscriber-owned registration. Call its
`unsubscribe()` on consumer disposal or adapter replacement, including after
failed adapter disposal. Release is synchronous and idempotent; no new callbacks
may start after return, including queued delivery. An executing callback may
finish. The source releases all listeners on successful disposal after any final
notification. New subscriptions during or after disposal are inert. Existing
listeners remain after failed disposal until explicitly released or successfully
disposed. Listener exceptions must not alter results or block other listeners.
These are obligations for future adapters, not implemented behavior.

This example composes the same contract for mock and real adapters, with a local
extension and explicit cleanup:

```ts
import type { EngineLifecycle } from './lifecycle'
import type { EngineConfiguration } from './configuration'
import type { EngineOperations } from './operations'
import type { EngineCapabilityInspection } from './capabilities'
import type { EngineStateInspection } from './state'
import type { EngineEvent, EngineNotification } from './events'
import type { EngineEventSource, EngineSubscription } from './subscriptions'
import type { EngineError, EngineDiagnostic } from './errors'

type Config = { readonly background: string }
type CustomEvent = EngineEvent<'consumer-note', { readonly text: string }>
type Notifications = EngineNotification<Config> | CustomEvent
export type Adapter = EngineLifecycle<Config> & EngineConfiguration<Config>
  & EngineOperations & EngineCapabilityInspection & EngineStateInspection
  & EngineEventSource<Notifications>

export const note: CustomEvent = { type: 'consumer-note', timestamp: 0 }
export const failure: EngineError = {
  code: 'operation-failed', message: 'Unable to complete request',
  details: { retryable: false },
}
export const diagnostic: EngineDiagnostic = { severity: 'info', message: 'Ready' }

export function observe(adapter: Adapter): () => void {
  const subscription: EngineSubscription = adapter.subscribe(event => {
    if (event.type === 'state-changed') {
      adapter.getCapabilities()
      if (event.payload.lifecycleState === 'ready') adapter.getState()
    } else if (event.type === 'configuration-changed') {
      const background: string = event.payload.background
      void background
    } else if (event.type === 'error') {
      const error: EngineError = event.payload
      void error
    }
  })
  return () => subscription.unsubscribe()
}
```

There is no dispatching, logging, engine implementation, rendering dependency,
state manager, or lifecycle orchestration in these modules.
