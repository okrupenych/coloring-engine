# Lifecycle and configuration contracts

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
successful reads contain a configuration snapshot. `invalid-state` means the
request is unavailable in the current lifecycle state or another mutation is
pending. `operation-failed` means an accepted request could not complete. Messages
are human-readable explanations, not machine-readable identifiers. Expected
failures use results; unexpected throws/rejections indicate implementation defects
and should still be handled at an application boundary. These request failures
do not define the event/error reporting system reserved for Task #37.

| Request | Allowed state | Successful outcome | Operational failure |
| --- | --- | --- | --- |
| Initialize | uninitialized | initializing → ready | initializing → failed |
| Read configuration | ready | detached current snapshot | ready, configuration unchanged |
| Replace configuration | ready | ready, replacement committed | ready, previous configuration retained |
| Dispose | uninitialized, ready, failed | disposing → disposed | disposing → failed |
| Dispose again | disposed | success, no further work | — |

Other state/request combinations return `invalid-state` without side effects.
Only one mutating request may be pending: overlapping initialization, update, or
disposal requests return `invalid-state` rather than being queued. Reads during
an update return the previous committed snapshot until success. Reads outside
ready return `invalid-state`. A failed initialization or disposal can be cleaned
up by disposal; initialization cannot be retried on the same instance. A disposed
instance cannot be reused. These are obligations for future adapters, not lifecycle
orchestration implemented by this module.

Runtime operations, capability/state inspection beyond lifecycle, subscriptions,
and diagnostics remain outside this contract's scope (Tasks #36 and #37).
