import type { EngineLifecycle, EngineOperationResult } from '../../engine/contracts'

/** Host orchestration state, independent of the adapter's own lifecycle state. */
export type EngineAdapterManagerState =
  | 'uninitialized' | 'initializing' | 'ready' | 'failed' | 'disposing' | 'disposed'

export type EngineAdapterFactory<TAdapter> = () => TAdapter | Promise<TAdapter>

/** Borrow adapters per operation; callers must not drive their lifecycle or cache them. */
export interface EngineAdapterAccess<TAdapter> {
  getAdapter(): EngineOperationResult<TAdapter>
}

/** Owns one factory-created adapter at a time, including failed cleanup candidates. */
export class EngineAdapterManager<
  TConfiguration extends object,
  TAdapter extends EngineLifecycle<TConfiguration>,
> implements EngineAdapterAccess<TAdapter> {
  #state: EngineAdapterManagerState = 'uninitialized'
  #factory: EngineAdapterFactory<TAdapter> | undefined
  #owned: TAdapter | undefined

  constructor(factory: EngineAdapterFactory<TAdapter>) {
    this.#factory = factory
  }

  get lifecycleState(): EngineAdapterManagerState {
    return this.#state
  }

  getAdapter(): EngineOperationResult<TAdapter> {
    if (this.#state !== 'ready') return this.#invalidState()
    return { ok: true, value: this.#owned! }
  }

  async initialize(configuration: Readonly<TConfiguration>): Promise<EngineOperationResult> {
    if ((this.#state !== 'uninitialized' && this.#state !== 'failed') || this.#owned) {
      return this.#invalidState()
    }
    // Lock before calling user code, including synchronous factory callbacks.
    this.#state = 'initializing'
    let result: EngineOperationResult
    try {
      this.#owned = await this.#factory!()
      result = await this.#owned.initialize(configuration)
    } catch {
      result = this.#unexpectedFailure('initialize')
    }
    if (result.ok === true) {
      this.#state = 'ready'
      return result
    }

    // Stay initializing until cleanup completes: no access, retry or overlapping disposal.
    const cleanup = await this.#releaseAdapter()
    this.#state = 'failed'
    if (cleanup.ok === false) {
      return {
        ok: false,
        error: {
          code: 'operation-failed',
          message: 'Adapter initialization and cleanup failed; retry cleanup with dispose().',
          details: { initializationCode: result.error.code, cleanupCode: cleanup.error.code },
        },
      }
    }
    return result
  }

  async dispose(): Promise<EngineOperationResult> {
    if (this.#state === 'disposed') return { ok: true, value: undefined }
    if (this.#state === 'initializing' || this.#state === 'disposing') return this.#invalidState()
    this.#state = 'disposing'
    const result = await this.#releaseAdapter()
    if (result.ok === false) {
      this.#state = 'failed'
      return result
    }
    this.#factory = undefined
    this.#state = 'disposed'
    return result
  }

  async #releaseAdapter(): Promise<EngineOperationResult> {
    if (!this.#owned) return { ok: true, value: undefined }
    try {
      const result = await this.#owned.dispose()
      if (result.ok === true) this.#owned = undefined
      return result
    } catch {
      return this.#unexpectedFailure('dispose')
    }
  }

  #invalidState(): EngineOperationResult<never> {
    return {
      ok: false,
      error: { code: 'invalid-state', message: `Manager is ${this.#state}; request is unavailable.` },
    }
  }

  #unexpectedFailure(operation: string): EngineOperationResult<never> {
    return {
      ok: false,
      error: { code: 'operation-failed', message: `Adapter ${operation} threw or rejected.` },
    }
  }
}
