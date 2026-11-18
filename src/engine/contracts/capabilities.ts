import type { EngineOperation, EngineToolId } from './operations'

/** Support, independent of temporary availability (for example, empty history). */
export interface EngineCapabilities {
  readonly tools: readonly EngineToolId[]
  readonly operations: readonly EngineOperation[]
}

export interface EngineCapabilityInspection {
  /**
   * Returns a detached snapshot in any lifecycle state, without initiating work.
   * Omitted operations and tool identifiers are unsupported. An empty tools list
   * means no tool can be selected; tools must be empty if selectTool is omitted.
   */
  getCapabilities(): EngineCapabilities
}
