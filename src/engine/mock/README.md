# Mock Engine core

`MockEngine<Config>` implements the existing lifecycle, configuration, and state
inspection interfaces without depending on the Playground. Import from
`src/engine/mock`. This foundation does not yet implement runtime commands,
capability inspection, or event subscriptions.

Each instance starts `uninitialized`, with no active configuration, no selected
tool or color, and every runtime operation unavailable. Initialize with `{}` for
the deterministic empty configuration, or supply your own concrete configuration
schema. No settings are inferred, merged, normalized, or shared between instances.

```ts
import { MockEngine } from './MockEngine'

const engine = new MockEngine<{ display: { background: string } }>()
await engine.initialize({ display: { background: '#ffffff' } })
const state = engine.getState()
const configuration = engine.getConfiguration()
await engine.updateConfiguration({ display: { background: '#eeeeee' } })
await engine.dispose()
```

Configuration must be structured-cloneable data (for example, nested JSON data),
not callbacks, UI objects, or resources. Inputs are deeply copied before the first
asynchronous yield, and reads return fresh deep copies. Non-cloneable input returns
`operation-failed`: initialization enters `failed`, while a rejected replacement
retains the previous configuration and `ready` state. Failure details do not expose
the original exception or configuration.

Initialization passes through `initializing` to `ready`; disposal passes through
`disposing` to terminal `disposed`. Each accepted mutation yields one microtask,
allowing transitional states and overlapping requests to be manually inspected.
Overlapping mutations return `invalid-state`. Reads during a configuration update
return the last committed values; runtime operations remain unavailable. Reads
outside `ready` return `invalid-state`. Disposal is allowed from `uninitialized`,
`ready`, or `failed`, releases active configuration, and succeeds again after
disposal. Reinitialization is never allowed.

For manual verification, import the module in a Vite browser console or run it
through a TypeScript-capable runtime. Inspect results before initialization, during
pending promises, after success/failure, and after disposal. Modify nested inputs
and returned snapshots, then read again; repeat with a second instance. No UI or
test infrastructure is required.
