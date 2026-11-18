import type { EngineImageInput } from './image'
import type { EngineError } from './errors'
import type { EngineOperationFailure, EngineOperationResult } from './result'

/** Opaque identifier obtained from capabilities; no fixed tool catalog is imposed. */
export type EngineToolId = string

/** An opaque sRGB color in #RRGGBB notation; validity is checked by the adapter. */
export type EngineColor = `#${string}`

export type EngineOperation =
  | 'selectTool'
  | 'selectColor'
  | 'loadImage'
  | 'reset'
  | 'undo'
  | 'redo'

/** Extends command failures without widening lifecycle/configuration failures. */
export interface EngineCommandFailure
  extends EngineError<EngineOperationFailure['code'] | 'unsupported-operation'> {}

export type EngineCommandResult = EngineOperationResult<void, EngineCommandFailure>

/**
 * Commands are accepted only while ready and no mutation is pending (including
 * lifecycle/configuration mutations). Expected failures resolve as results.
 * Success means committed; failure preserves the previously committed state.
 * Inputs are not mutated. Unsupported commands/tools return unsupported-operation
 * without side effects, before checking temporary availability. Supported but
 * unavailable commands return invalid-state; other failures use operation-failed.
 */
export interface EngineOperations {
  selectTool(tool: EngineToolId): Promise<EngineCommandResult>
  selectColor(color: EngineColor): Promise<EngineCommandResult>

  /** Loads and selects this image on success, replacing the current image. */
  loadImage(image: EngineImageInput): Promise<EngineCommandResult>

  /** Restores the current image to its initially loaded coloring state. */
  reset(): Promise<EngineCommandResult>
  /** Reverts the most recent undoable coloring change on the current image. */
  undo(): Promise<EngineCommandResult>
  /** Reapplies the most recently undone coloring change on the current image. */
  redo(): Promise<EngineCommandResult>
}
