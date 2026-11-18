# Engine Adapter Manager

The manager depends only on engine lifecycle, result, and subscription contracts.
It orchestrates ownership without importing Mock Engine or UI code. Adapters retain
responsibility for their lifecycle implementation and resources. Application wiring
is outside this module: `app.ts` composes the manager and Canvas Workspace consumer.

## Replacement ordering

`initialize(configuration)` uses the constructor factory. Once ready,
`replace(factory, configuration)` accepts a fresh, exclusively owned adapter. It
requires an uninitialized candidate, successful initialization, and a ready lifecycle
state before activation. The previous adapter remains accessible and operational
while the asynchronous factory or initialization is pending.

Successful replacement makes the candidate active, synchronously notifies subscribers
with `(adapter, previous)`, then disposes the previous adapter before settling the
result. Consumers can detach before obsolete disposal emits events. An alias of the
active adapter is rejected without initialization or cleanup. Factories must not return
adapters owned elsewhere; allocations made before a factory throws remain its responsibility.
Keep configuration unchanged until initialization settles.

## Consumer subscriptions and borrowed references

`EngineAdapterAccess<TAdapter>` exposes `getAdapter()` and
`subscribeAdapterChange(listener)`. Each registration returns an independently owned,
idempotent `EngineSubscription`. Delivery is synchronous without replay, only after
successful replacement activation; initial initialization, failed attempts, cleanup
retries, and final disposal do not emit change notifications. Listener exceptions are
isolated. Listeners added during delivery wait for the next change; removed registrations
are skipped. Final disposal clears manager listeners; subscriptions during or after
disposal are inert.

Consumers own their engine subscriptions. Detach synchronously on change, then attach
to the replacement. Detach both registrations during consumer teardown before disposing
the manager. The manager never subscribes to or forwards engine events. For example,
after initialization (Adapter is the consumer's event-capable engine contract):

```ts
let events: EngineSubscription | undefined
function attach(adapter: Adapter) {
  events?.unsubscribe()
  events = adapter.subscribe(event => {
    const current = access.getAdapter()
    if (current.ok === true && current.value === adapter) consume(event)
  })
}
const changes = access.subscribeAdapterChange(adapter => attach(adapter))
const current = access.getAdapter()
if (current.ok === true) attach(current.value)
// Consumer teardown:
changes.unsubscribe()
events?.unsubscribe()
await manager.dispose()
```

Borrow adapters per operation; cached references cannot be revoked. Never call their
lifecycle methods directly. Consumer operations already in flight are not canceled:
check adapter identity or a consumer generation again after awaiting work before updating
current application state. This also guards callbacks already executing when detached,
even if obsolete disposal fails. Async change listeners must detach before yielding;
the manager does not await promises, and consumers must handle attachment failures and
async listener rejections themselves.

## Lifecycle and recovery

| Request | Accepted state | Outcome |
| --- | --- | --- |
| initialize | uninitialized, failed with no retained resources | initializing -> ready or failed |
| getAdapter | ready, replacing | current active adapter |
| replace | ready with no pending cleanup | replacing -> ready |
| retryCleanup | ready | replacing -> ready; active adapter unchanged |
| dispose | uninitialized, ready, failed | disposing -> disposed or failed |
| dispose | disposed | successful no-op |

Lifecycle requests during initializing, replacing, or disposing return `invalid-state`
without invoking factories or adapters, including reentrant calls from notifications.
No queue or cancellation is provided: await the current operation before retrying.
Access remains available during replacement and cleanup retries; final disposal closes
access immediately. Each manager has independent state, ownership, and subscriptions.

Failed initialization preserves the old active adapter and attempts candidate cleanup.
Expected failures preserve adapter results; unexpected factory, initialization, and
disposal exceptions become sanitized `operation-failed` results. Combined initialization
and cleanup failure includes both codes and `activated: false`. Obsolete cleanup failure
after activation returns `operation-failed` with `details.activated: true` and a cleanup
code: the new adapter is active and notifications have fired. This is not a rollback.

Failed cleanup retains the adapter privately. Further replacements are blocked until
`retryCleanup()` succeeds, bounding ownership to the active adapter plus one cleanup
obligation. Retry failures preserve valid active access; retry with nothing pending is
a successful no-op. Alternatively, `dispose()` attempts both retained resources even
if one fails, keeping only unsuccessful resources for another disposal retry. If both
fail, the pending resource error is returned first; retry still attempts both resources.
Failed final disposal leaves `failed`, with access blocked. Successful disposal is
terminal and releases adapter and factory references. After initial initialization
failure, successful automatic cleanup permits initialization again; failed cleanup
requires explicit disposal as before. The manager cannot force an adapter to release
resources if its disposal implementation keeps failing.

## Manual verification

Import the manager and Mock Engine into a TypeScript-capable Node console. Inspect
results, lifecycle states, identities, and callback histories. Delay initialization or
disposal to inspect overlapping operations. Use Mock failure schedules for initialize
and dispose; wrap methods to throw or reject. Inspect repeated replacement, subscriber
transfer, independent managers, cleanup recovery, and terminal disposal. No automated
test files or infrastructure are required.
