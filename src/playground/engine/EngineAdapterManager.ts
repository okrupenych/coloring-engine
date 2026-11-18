import type { EngineLifecycle, EngineOperationResult, EngineSubscription } from '../../engine/contracts'

/** Host orchestration state, independent of the adapter's own lifecycle state. */
export type EngineAdapterManagerState =
  | 'uninitialized' | 'initializing' | 'ready' | 'replacing' | 'failed' | 'disposing' | 'disposed'

export type EngineAdapterFactory<TAdapter> = () => TAdapter | Promise<TAdapter>
export type EngineAdapterChangeListener<TAdapter> = (adapter: TAdapter, previous: TAdapter) => void

/** Borrow per operation; consumers own event subscriptions and must detach on change. */
export interface EngineAdapterAccess<TAdapter> {
  getAdapter(): EngineOperationResult<TAdapter>
  subscribeAdapterChange(listener: EngineAdapterChangeListener<TAdapter>): EngineSubscription
}

/** Owns the active adapter and at most one candidate or obsolete cleanup obligation. */
export class EngineAdapterManager<
  TConfiguration extends object,
  TAdapter extends EngineLifecycle<TConfiguration>,
> implements EngineAdapterAccess<TAdapter> {
  #state: EngineAdapterManagerState = 'uninitialized'
  #factory: EngineAdapterFactory<TAdapter> | undefined
  #active: TAdapter | undefined
  #pending: TAdapter | undefined
  readonly #listeners = new Set<{ listener: EngineAdapterChangeListener<TAdapter> }>()

  constructor(factory: EngineAdapterFactory<TAdapter>) {
    this.#factory = factory
  }

  get lifecycleState(): EngineAdapterManagerState {
    return this.#state
  }

  getAdapter(): EngineOperationResult<TAdapter> {
    if (this.#state !== 'ready' && this.#state !== 'replacing') return this.#invalidState()
    return { ok: true, value: this.#active! }
  }

  /** Synchronous, no replay; each registration has independent ownership. */
  subscribeAdapterChange(listener: EngineAdapterChangeListener<TAdapter>): EngineSubscription {
    const registration = { listener }
    if (this.#state !== 'disposing' && this.#state !== 'disposed') this.#listeners.add(registration)
    return { unsubscribe: () => { this.#listeners.delete(registration) } }
  }

  async initialize(configuration: Readonly<TConfiguration>): Promise<EngineOperationResult> {
    if ((this.#state !== 'uninitialized' && this.#state !== 'failed') || this.#pending || this.#active) {
      return this.#invalidState()
    }
    this.#state = 'initializing'
    const result = await this.#initializeCandidate(this.#factory!, configuration)
    if (result.ok === true) {
      this.#active = this.#pending
      this.#pending = undefined
      this.#state = 'ready'
    } else {
      this.#state = 'failed'
    }
    return result
  }

  async replace(
    factory: EngineAdapterFactory<TAdapter>,
    configuration: Readonly<TConfiguration>,
  ): Promise<EngineOperationResult> {
    if (this.#state !== 'ready' || this.#pending) return this.#invalidState()
    // Lock before invoking user code, retaining active access throughout replacement.
    this.#state = 'replacing'
    const result = await this.#initializeCandidate(factory, configuration)
    if (result.ok === false) {
      this.#state = 'ready'
      return result
    }
    const previous = this.#active!
    this.#active = this.#pending!
    this.#pending = previous
    // Consumers detach before obsolete disposal can emit events. Reentrant lifecycle
    // calls remain blocked, and one throwing listener cannot prevent other delivery.
    for (const registration of [...this.#listeners]) {
      if (!this.#listeners.has(registration)) continue
      try { registration.listener(this.#active, previous) } catch { /* Consumer-owned failure. */ }
    }
    const cleanup = await this.#releasePending()
    this.#state = 'ready'
    if (cleanup.ok === false) {
      return {
        ok: false,
        error: {
          code: 'operation-failed',
          message: 'Replacement activated; obsolete cleanup failed. Call retryCleanup() or dispose().',
          details: { activated: true, cleanupCode: cleanup.error.code },
        },
      }
    }
    return result
  }

  /** Retry obsolete/candidate cleanup without disturbing the valid active adapter. */
  async retryCleanup(): Promise<EngineOperationResult> {
    if (this.#state !== 'ready') return this.#invalidState()
    this.#state = 'replacing'
    const result = await this.#releasePending()
    this.#state = 'ready'
    return result
  }

  async dispose(): Promise<EngineOperationResult> {
    if (this.#state === 'disposed') return { ok: true, value: undefined }
    if (this.#state === 'initializing' || this.#state === 'replacing' || this.#state === 'disposing') {
      return this.#invalidState()
    }
    this.#state = 'disposing'
    this.#listeners.clear()
    // Attempt both obligations even if one fails. Retain only unsuccessful resources.
    const pendingResult = await this.#releasePending()
    const activeResult = this.#active ? await this.#disposeAdapter(this.#active) : { ok: true as const, value: undefined }
    if (activeResult.ok === true) this.#active = undefined
    if (pendingResult.ok === false || activeResult.ok === false) {
      this.#state = 'failed'
      return pendingResult.ok === false ? pendingResult : activeResult
    }
    this.#factory = undefined
    this.#state = 'disposed'
    return activeResult
  }

  async #initializeCandidate(
    factory: EngineAdapterFactory<TAdapter>, configuration: Readonly<TConfiguration>,
  ): Promise<EngineOperationResult> {
    let result: EngineOperationResult
    try {
      const candidate = await factory()
      // Never initialize or clean up an alias of the active adapter.
      if (candidate === this.#active) return this.#invalidState()
      this.#pending = candidate
      result = candidate.lifecycleState === 'uninitialized'
        ? await candidate.initialize(configuration) : this.#invalidState()
      if (result.ok === true && candidate.lifecycleState !== 'ready') {
        result = { ok: false, error: { code: 'operation-failed', message: 'Adapter initialization did not reach ready.' } }
      }
    } catch {
      result = this.#unexpectedFailure('initialize')
    }
    if (result.ok === true) return result
    const cleanup = await this.#releasePending()
    if (cleanup.ok === false) {
      return {
        ok: false,
        error: {
          code: 'operation-failed',
          message: 'Adapter initialization and cleanup failed; retryCleanup() when ready, otherwise dispose().',
          details: { activated: false, initializationCode: result.error.code, cleanupCode: cleanup.error.code },
        },
      }
    }
    return result
  }

  async #releasePending(): Promise<EngineOperationResult> {
    if (!this.#pending) return { ok: true, value: undefined }
    const result = await this.#disposeAdapter(this.#pending)
    if (result.ok === true) this.#pending = undefined
    return result
  }

  async #disposeAdapter(adapter: TAdapter): Promise<EngineOperationResult> {
    try { return await adapter.dispose() } catch { return this.#unexpectedFailure('dispose') }
  }

  #invalidState(): EngineOperationResult<never> {
    return {
      ok: false,
      error: { code: 'invalid-state', message: `Manager is ${this.#state}; request unavailable or cleanup pending.` },
    }
  }

  #unexpectedFailure(operation: string): EngineOperationResult<never> {
    return {
      ok: false,
      error: { code: 'operation-failed', message: `Adapter ${operation} threw or rejected.` },
    }
  }
}
