import type {
  EngineConfiguration,
  EngineLifecycle,
  EngineLifecycleState,
  EngineOperationResult,
  EngineRuntimeState,
  EngineStateInspection,
} from '../contracts'

/** Foundational mock: configuration data must support structured cloning. */
export class MockEngine<TConfiguration extends object = Record<string, never>>
  implements EngineLifecycle<TConfiguration>, EngineConfiguration<TConfiguration>, EngineStateInspection {
  #lifecycleState: EngineLifecycleState = 'uninitialized'
  #configuration: Readonly<TConfiguration> | undefined
  #updating = false
  #state: EngineRuntimeState = {
    activeTool: null,
    selectedColor: null,
    operations: {
      selectTool: false,
      selectColor: false,
      loadImage: false,
      reset: false,
      undo: false,
      redo: false,
    },
  }

  get lifecycleState(): EngineLifecycleState {
    return this.#lifecycleState
  }

  async initialize(configuration: Readonly<TConfiguration>): Promise<EngineOperationResult> {
    if (this.#lifecycleState !== 'uninitialized') return this.#invalidState()
    this.#lifecycleState = 'initializing'
    try {
      // Capture input before yielding so callers cannot change the pending value.
      const snapshot = structuredClone(configuration)
      await Promise.resolve()
      this.#configuration = snapshot
      this.#lifecycleState = 'ready'
      return { ok: true, value: undefined }
    } catch {
      this.#lifecycleState = 'failed'
      return this.#configurationFailure()
    }
  }

  getConfiguration(): EngineOperationResult<Readonly<TConfiguration>> {
    if (this.#lifecycleState !== 'ready') return this.#invalidState()
    return { ok: true, value: structuredClone(this.#configuration!) }
  }

  async updateConfiguration(configuration: Readonly<TConfiguration>): Promise<EngineOperationResult> {
    if (this.#lifecycleState !== 'ready' || this.#updating) return this.#invalidState()
    this.#updating = true
    try {
      const snapshot = structuredClone(configuration)
      await Promise.resolve()
      this.#configuration = snapshot
      return { ok: true, value: undefined }
    } catch {
      return this.#configurationFailure()
    } finally {
      this.#updating = false
    }
  }

  getState(): EngineOperationResult<EngineRuntimeState> {
    if (this.#lifecycleState !== 'ready') return this.#invalidState()
    return { ok: true, value: structuredClone(this.#state) }
  }

  async dispose(): Promise<EngineOperationResult> {
    if (this.#lifecycleState === 'disposed') return { ok: true, value: undefined }
    if (this.#updating || !['uninitialized', 'ready', 'failed'].includes(this.#lifecycleState)) {
      return this.#invalidState()
    }
    this.#lifecycleState = 'disposing'
    await Promise.resolve()
    this.#configuration = undefined
    this.#lifecycleState = 'disposed'
    return { ok: true, value: undefined }
  }

  #invalidState(): { ok: false; error: { code: 'invalid-state'; message: string } } {
    return {
      ok: false,
      error: { code: 'invalid-state', message: 'Request unavailable in the current lifecycle state or during a pending mutation.' },
    }
  }

  #configurationFailure(): { ok: false; error: { code: 'operation-failed'; message: string } } {
    return {
      ok: false,
      error: { code: 'operation-failed', message: 'Configuration could not be copied. Supply structured-cloneable data.' },
    }
  }
}
