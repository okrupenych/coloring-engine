import type {
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

/** Foundational mock: configuration data must support structured cloning. */
export class MockEngine<TConfiguration extends object = Record<string, never>>
  implements EngineLifecycle<TConfiguration>, EngineConfiguration<TConfiguration>, EngineStateInspection,
    EngineOperations, EngineCapabilityInspection {
  #lifecycleState: EngineLifecycleState = 'uninitialized'
  #configuration: Readonly<TConfiguration> | undefined
  #updating = false
  #activeTool: EngineToolId | null = null
  #selectedColor: EngineColor | null = null
  #image: EngineImageInput | undefined
  #coloring: 'initial' | 'changed' | 'undone' = 'initial'
  readonly #capabilities: EngineCapabilities

  constructor(capabilities: EngineCapabilities = {
    tools: ['brush', 'fill'],
    operations: ['selectTool', 'selectColor', 'loadImage', 'reset', 'undo', 'redo'],
  }) {
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
    if (!this.#available(operation)) return this.#invalidState()
    this.#updating = true
    try {
      // Validate and capture inputs before yielding; only commit after success.
      const valid = prepare()
      await Promise.resolve()
      if (!valid) return {
        ok: false,
        error: { code: 'operation-failed', message: 'Invalid mock operation input.' },
      }
      commit()
      return { ok: true, value: undefined }
    } finally {
      this.#updating = false
    }
  }

  #unsupported(): EngineCommandResult {
    return { ok: false, error: { code: 'unsupported-operation', message: 'Operation or tool is not supported.' } }
  }

  async dispose(): Promise<EngineOperationResult> {
    if (this.#lifecycleState === 'disposed') return { ok: true, value: undefined }
    if (this.#updating || !['uninitialized', 'ready', 'failed'].includes(this.#lifecycleState)) {
      return this.#invalidState()
    }
    this.#lifecycleState = 'disposing'
    await Promise.resolve()
    this.#configuration = undefined
    this.#image = undefined
    this.#coloring = 'initial'
    this.#activeTool = null
    this.#selectedColor = null
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
