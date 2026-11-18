import type {
  EngineEventListener,
  EngineEventSource,
  EngineNotification,
  EngineSubscription,
  EngineCapabilities,
  EngineCapabilityInspection,
  EngineColor,
  EngineCommandResult,
  EngineImageInput,
  EngineOperation,
  EngineOperations,
  EngineToolId,
  EngineConfiguration,
  EngineLifecycle,
  EngineLifecycleState,
  EngineOperationResult,
  EngineRuntimeState,
  EngineStateInspection,
} from '../contracts'

export type MockFailureOperation = EngineOperation | 'initialize' | 'updateConfiguration' | 'dispose'

/** One-based valid accepted request numbers that fail, independently per operation. */
export type MockFailureScenarios = Readonly<Partial<Record<MockFailureOperation, readonly number[]>>>

/** Foundational mock: configuration data must support structured cloning. */
export class MockEngine<TConfiguration extends object = Record<string, never>>
  implements EngineLifecycle<TConfiguration>, EngineConfiguration<TConfiguration>, EngineStateInspection,
    EngineOperations, EngineCapabilityInspection, EngineEventSource<EngineNotification<TConfiguration>> {
  #lifecycleState: EngineLifecycleState = 'uninitialized'
  #configuration: Readonly<TConfiguration> | undefined
  #updating = false
  #activeTool: EngineToolId | null = null
  #selectedColor: EngineColor | null = null
  #image: EngineImageInput | undefined
  #coloring: 'initial' | 'changed' | 'undone' = 'initial'
  readonly #capabilities: EngineCapabilities

  readonly #listeners = new Set<{ listener: EngineEventListener<EngineNotification<TConfiguration>> }>()
  readonly #failures: MockFailureScenarios
  readonly #attempts: Partial<Record<MockFailureOperation, number>> = {}
  #disposalStarted = false
  #notifying = false

  constructor(capabilities: EngineCapabilities = {
    tools: ['brush', 'fill'],
    operations: ['selectTool', 'selectColor', 'loadImage', 'reset', 'undo', 'redo'],
  }, failures: MockFailureScenarios = {}) {
    this.#failures = structuredClone(failures)
    this.#capabilities = {
      tools: capabilities.operations.includes('selectTool') ? [...capabilities.tools] : [],
      operations: [...capabilities.operations],
    }
  }

  getCapabilities(): EngineCapabilities {
    return structuredClone(this.#capabilities)
  }

  get lifecycleState(): EngineLifecycleState {
    return this.#lifecycleState
  }

  async initialize(configuration: Readonly<TConfiguration>): Promise<EngineOperationResult> {
    if (this.#notifying || this.#lifecycleState !== 'uninitialized') return this.#invalidState()
    this.#lifecycleState = 'initializing'
    this.#stateChanged()
    try {
      // Capture input before yielding so callers cannot change the pending value.
      const snapshot = structuredClone(configuration)
      await Promise.resolve()
      if (this.#shouldFail('initialize')) {
        this.#lifecycleState = 'failed'
        this.#stateChanged()
        return this.#simulatedFailure('initialize')
      }
      this.#configuration = snapshot
      this.#lifecycleState = 'ready'
      this.#stateChanged()
      this.#configurationChanged()
      return { ok: true, value: undefined }
    } catch {
      this.#lifecycleState = 'failed'
      this.#stateChanged()
      return this.#configurationFailure()
    }
  }

  getConfiguration(): EngineOperationResult<Readonly<TConfiguration>> {
    if (this.#lifecycleState !== 'ready') return this.#invalidState()
    return { ok: true, value: structuredClone(this.#configuration!) }
  }

  async updateConfiguration(configuration: Readonly<TConfiguration>): Promise<EngineOperationResult> {
    if (this.#notifying || this.#lifecycleState !== 'ready' || this.#updating) return this.#invalidState()
    this.#updating = true
    this.#stateChanged()
    try {
      const snapshot = structuredClone(configuration)
      await Promise.resolve()
      if (this.#shouldFail('updateConfiguration')) return this.#simulatedFailure('updateConfiguration')
      this.#configuration = snapshot
      this.#configurationChanged()
      return { ok: true, value: undefined }
    } catch {
      return this.#configurationFailure()
    } finally {
      this.#updating = false
      this.#stateChanged()
    }
  }

  getState(): EngineOperationResult<EngineRuntimeState> {
    if (this.#lifecycleState !== 'ready') return this.#invalidState()
    return {
      ok: true,
      value: {
        activeTool: this.#activeTool,
        selectedColor: this.#selectedColor,
        operations: {
          selectTool: this.#available('selectTool'),
          selectColor: this.#available('selectColor'),
          loadImage: this.#available('loadImage'),
          reset: this.#available('reset'),
          undo: this.#available('undo'),
          redo: this.#available('redo'),
        },
      },
    }
  }

  selectTool(tool: EngineToolId): Promise<EngineCommandResult> {
    if (!this.#capabilities.tools.includes(tool)) return Promise.resolve(this.#unsupported())
    return this.#command('selectTool', () => { this.#activeTool = tool })
  }

  selectColor(color: EngineColor): Promise<EngineCommandResult> {
    return this.#command('selectColor', () => { this.#selectedColor = color },
      () => typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color))
  }

  loadImage(image: EngineImageInput): Promise<EngineCommandResult> {
    let snapshot: EngineImageInput
    return this.#command('loadImage', () => {
      this.#image = snapshot
      // One synthetic coloring change enables Undo without painting or history.
      this.#coloring = 'changed'
    }, () => {
      if (image?.kind === 'catalog' && typeof image.url === 'string' && image.url.trim()) {
        snapshot = { kind: 'catalog', url: image.url }
        return true
      }
      if (image?.kind === 'local' && image.blob instanceof Blob && image.blob.size > 0) {
        // Blob bytes are immutable; retain a detached wrapper without reading them.
        snapshot = { kind: 'local', blob: image.blob }
        return true
      }
      return false
    })
  }

  reset(): Promise<EngineCommandResult> {
    return this.#command('reset', () => { this.#coloring = 'initial' })
  }

  undo(): Promise<EngineCommandResult> {
    return this.#command('undo', () => { this.#coloring = 'undone' })
  }

  redo(): Promise<EngineCommandResult> {
    return this.#command('redo', () => { this.#coloring = 'changed' })
  }

  #available(operation: EngineOperation): boolean {
    if (this.#lifecycleState !== 'ready' || this.#updating
      || !this.#capabilities.operations.includes(operation)) return false
    switch (operation) {
      case 'selectTool': return this.#capabilities.tools.length > 0
      case 'reset': return this.#image !== undefined
      case 'undo': return this.#image !== undefined && this.#coloring === 'changed'
      case 'redo': return this.#image !== undefined && this.#coloring === 'undone'
      default: return true
    }
  }

  async #command(operation: EngineOperation, commit: () => void,
    prepare: () => boolean = () => true): Promise<EngineCommandResult> {
    if (!this.#capabilities.operations.includes(operation)) return this.#unsupported()
    if (this.#notifying || !this.#available(operation)) return this.#invalidState()
    this.#updating = true
    this.#stateChanged()
    try {
      // Validate and capture inputs before yielding; only commit after success.
      const valid = prepare()
      await Promise.resolve()
      if (!valid) return this.#failure('Invalid mock operation input.')
      if (this.#shouldFail(operation)) return this.#simulatedFailure(operation)
      commit()
      return { ok: true, value: undefined }
    } finally {
      this.#updating = false
      this.#stateChanged()
    }
  }

  #unsupported(): EngineCommandResult {
    return { ok: false, error: { code: 'unsupported-operation', message: 'Operation or tool is not supported.' } }
  }

  async dispose(): Promise<EngineOperationResult> {
    if (this.#lifecycleState === 'disposed') return { ok: true, value: undefined }
    if (this.#notifying || this.#updating || !['uninitialized', 'ready', 'failed'].includes(this.#lifecycleState)) {
      return this.#invalidState()
    }
    this.#disposalStarted = true
    this.#lifecycleState = 'disposing'
    this.#stateChanged()
    await Promise.resolve()
    if (this.#shouldFail('dispose')) {
      this.#lifecycleState = 'failed'
      this.#stateChanged()
      return this.#simulatedFailure('dispose')
    }
    this.#configuration = undefined
    this.#image = undefined
    this.#coloring = 'initial'
    this.#activeTool = null
    this.#selectedColor = null
    this.#lifecycleState = 'disposed'
    this.#stateChanged()
    this.#listeners.clear()
    return { ok: true, value: undefined }
  }

  #invalidState(): { ok: false; error: { code: 'invalid-state'; message: string } } {
    return {
      ok: false,
      error: { code: 'invalid-state', message: 'Request unavailable in the current lifecycle state or during a pending mutation.' },
    }
  }

  #configurationFailure(): { ok: false; error: { code: 'operation-failed'; message: string } } {
    return this.#failure('Configuration could not be copied. Supply structured-cloneable data.')
  }

  subscribe(listener: EngineEventListener<EngineNotification<TConfiguration>>): EngineSubscription {
    if (this.#disposalStarted) return { unsubscribe() {} }
    const registration = { listener }
    this.#listeners.add(registration)
    return { unsubscribe: () => { this.#listeners.delete(registration) } }
  }

  #emit(event: EngineNotification<TConfiguration>): void {
    // Snapshot registrations, but check membership before each callback starts.
    this.#notifying = true
    try {
      for (const registration of [...this.#listeners]) {
        if (!this.#listeners.has(registration)) continue
        try {
          registration.listener(structuredClone(event))
        } catch {
          // Observers cannot change the request result or interrupt delivery.
        }
      }
    } finally {
      this.#notifying = false
    }
  }

  #stateChanged(): void {
    this.#emit({ type: 'state-changed', timestamp: Date.now(),
      payload: { lifecycleState: this.#lifecycleState } })
  }

  #configurationChanged(): void {
    this.#emit({ type: 'configuration-changed', timestamp: Date.now(), payload: this.#configuration! })
  }

  #shouldFail(operation: MockFailureOperation): boolean {
    const attempt = (this.#attempts[operation] ?? 0) + 1
    this.#attempts[operation] = attempt
    return this.#failures[operation]?.includes(attempt) ?? false
  }

  #simulatedFailure(operation: MockFailureOperation) {
    this.#emit({ type: 'diagnostic', timestamp: Date.now(), payload: {
      severity: 'info', message: 'Configured mock failure triggered.',
      details: { operation, attempt: this.#attempts[operation]! },
    } })
    return this.#failure('Configured mock operation failure.', { operation, attempt: this.#attempts[operation]! })
  }

  #failure(message: string, details?: { operation: MockFailureOperation; attempt: number }):
    { ok: false; error: { code: 'operation-failed'; message: string; details?: typeof details } } {
    const error = { code: 'operation-failed' as const, message, ...(details ? { details } : {}) }
    this.#emit({ type: 'error', timestamp: Date.now(), payload: error })
    return { ok: false, error }
  }
}
