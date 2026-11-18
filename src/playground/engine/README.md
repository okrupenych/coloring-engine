# Engine Adapter Manager

This host-side manager depends only on `EngineLifecycle` and the existing result
contract. It does not import Mock Engine, UI, or a real runtime. It orchestrates
ownership; the adapter still owns configuration, commands, events, and its own
lifecycle validation. No application integration or replacement is implemented.

```ts
import { EngineAdapterManager, type EngineAdapterAccess } from './index'
import { MockEngine } from '../../engine/mock'

type Config = { background: string }
const manager = new EngineAdapterManager<Config, MockEngine<Config>>(
  () => new MockEngine<Config>(),
)
const access: EngineAdapterAccess<MockEngine<Config>> = manager
await manager.initialize({ background: '#ffffff' })
const adapter = access.getAdapter()
if (adapter.ok === true) await adapter.value.selectTool('brush')
await manager.dispose()
```

Consumers should type the access interface with the engine contracts they need,
obtain the adapter for each operation, and avoid retaining it across lifecycle
changes. Access returns an existing `EngineOperationResult`, never a partial or
failed adapter. Borrowed references cannot be revoked: consumers must not call
adapter initialization/disposal directly. The narrow access interface leaves
future replacement behind the manager boundary without implementing it here.

## Lifecycle and concurrency

| Request | Accepted manager state | Outcome |
| --- | --- | --- |
| initialize | uninitialized, or failed with no owned adapter | initializing → ready or failed |
| getAdapter | ready | borrowed adapter; otherwise invalid-state |
| dispose | uninitialized, ready, failed | disposing → disposed or failed |
| dispose | disposed | successful no-op |

`disposing` is an additional manager state that closes access immediately while
cleanup is pending. Concurrent/repeated initialization, initialization after
disposal, and lifecycle requests during initializing/disposing return
`invalid-state` without calling the factory or adapter. This includes reentrant
requests from factory or adapter event callbacks. Await initialization before
disposal; cancellation of pending initialization is not supported.

## Ownership and failures

The factory may be synchronous or asynchronous and must return a fresh,
uninitialized, exclusively owned adapter. Ownership transfers when it returns.
A factory that fails before returning must clean up its own allocations. The
caller keeps configuration unchanged until initialization settles; the adapter
is responsible for applying/copying configuration per its contract.

Expected adapter failures preserve the existing result. Unexpected throws or
rejections become sanitized `operation-failed` results without exposing exceptions.
Failed initialization automatically attempts adapter disposal before settling in
`failed`. Successful cleanup drops the reference and permits initialization with
a fresh factory result (recovery, not replacement of an active adapter).

If cleanup fails, the manager retains the adapter privately solely for a later
`dispose()` retry. Access and initialization stay blocked. A combined failure
reports both error codes. Successful explicit disposal is terminal, releases the
adapter and factory references, and is repeatable. A failed disposal stays
`failed`, never claims resources were released, and can be retried. Actual adapter
resource cleanup requires its disposal implementation to succeed; the manager
cannot force release of implementation-owned resources.

The manager creates no event subscriptions, timers, or global state. Consumers
own their subscriptions and must unsubscribe when detached; adapters release
their resources through disposal. Each manager owns its own state and factory.

## Manual verification

Use Mock Engine in a TypeScript-capable runtime or Vite console. Inspect state and
access before, during, and after initialization/disposal. Try repeated and
overlapping calls, two separate managers, a throwing/rejecting factory, and Mock
failure schedules `{ initialize: [1] }`, `{ dispose: [1] }`, and both together.
Confirm failed initialization disposes the candidate, cleanup failure blocks
reinitialization until explicit disposal, and a fresh factory result allows
recovery after successful automatic cleanup. No test infrastructure is required.
