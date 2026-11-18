import type {
  EngineCapabilityInspection, EngineStateInspection, EngineEventSource,
  EngineOperations, EngineRuntimeState, EngineCapabilities, EngineSubscription,
  EngineCommandResult, EngineToolId,
} from '../../engine/contracts'
import type { EngineAdapterAccess } from '../engine'

export type WorkspaceAdapter = EngineCapabilityInspection & EngineStateInspection
  & EngineEventSource & Pick<EngineOperations, 'selectTool'>

/** Canvas Workspace contract boundary; owns no adapter lifecycle or rendering. */
export function createWorkspaceEngine(host: HTMLElement, access: EngineAdapterAccess<WorkspaceAdapter>) {
  let disposed = false
  let generation = 0
  let subscription: EngineSubscription | undefined
  let state: EngineRuntimeState | undefined
  let capabilities: EngineCapabilities | undefined
  let lastResult: EngineCommandResult | undefined
  const pending = new Set<Promise<EngineCommandResult>>()

  function current(adapter: WorkspaceAdapter, version: number): boolean {
    const active = access.getAdapter()
    return !disposed && generation === version && active.ok && active.value === adapter
  }

  function refresh(adapter: WorkspaceAdapter, version: number): void {
    if (!current(adapter, version)) return
    const result = adapter.getState()
    state = result.ok ? result.value : undefined
    capabilities = adapter.getCapabilities()
    host.setAttribute('aria-busy', String(!state))
  }

  function attach(): void {
    if (disposed) return
    const version = ++generation
    subscription?.unsubscribe()
    subscription = undefined
    state = undefined
    capabilities = undefined
    lastResult = undefined
    const active = access.getAdapter()
    if (!active.ok) { host.setAttribute('aria-busy', 'true'); return }
    const adapter = active.value
    subscription = adapter.subscribe(() => refresh(adapter, version))
    refresh(adapter, version)
  }

  const changes = access.subscribeAdapterChange(attach)
  attach()

  return {
    /** Initialization has no change notification; app calls once when ready. */
    attach,
    get snapshot() { return structuredClone({ state, capabilities, lastResult }) },
    selectTool(tool: EngineToolId): Promise<EngineCommandResult> {
      const active = access.getAdapter()
      if (disposed || !active.ok) return Promise.resolve({ ok: false,
        error: { code: 'invalid-state', message: 'Workspace engine is unavailable.' } })
      const adapter = active.value
      const version = generation
      const operation = (async (): Promise<EngineCommandResult> => {
        let result: EngineCommandResult
        try { result = await adapter.selectTool(tool) } catch {
          result = { ok: false, error: { code: 'operation-failed', message: 'Tool selection rejected.' } }
        }
        if (current(adapter, version)) {
          lastResult = result
          refresh(adapter, version)
        }
        return result
      })()
      pending.add(operation)
      void operation.then(() => pending.delete(operation))
      return operation
    },
    dispose(): Promise<void> {
      if (!disposed) {
        disposed = true
        ++generation
        changes.unsubscribe()
        subscription?.unsubscribe()
        subscription = undefined
        state = undefined
        capabilities = undefined
        lastResult = undefined
        host.removeAttribute('aria-busy')
      }
      return Promise.all(pending).then(() => undefined)
    },
  }
}
