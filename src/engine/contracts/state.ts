import type { EngineColor, EngineOperation, EngineToolId } from './operations'
import type { EngineOperationResult } from './result'

/** Every command has an entry; unsupported commands are always false. */
export type EngineOperationAvailability = Readonly<Record<EngineOperation, boolean>>

export interface EngineRuntimeState {
  /** Null means no tool/color has been selected. */
  readonly activeTool: EngineToolId | null
  readonly selectedColor: EngineColor | null
  /** Availability now, not a guarantee that a later request will succeed. */
  readonly operations: EngineOperationAvailability
}

export interface EngineStateInspection {
  /**
   * Reads a detached snapshot while ready; otherwise returns invalid-state.
   * During a mutation, selections reflect the last commit and all operations
   * are unavailable. Consumers cannot mutate engine state through this snapshot.
   */
  getState(): EngineOperationResult<EngineRuntimeState>
}
