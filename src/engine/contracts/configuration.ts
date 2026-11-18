import type { EngineOperationResult } from './result'

/** The consumer supplies a concrete configuration schema shared by its adapters. */
export interface EngineConfiguration<TConfiguration extends object> {
  /**
   * Returns a detached snapshot of the last successfully applied configuration.
   * Available only while ready, including during a configuration update.
   * Changing a returned object must not change the engine's configuration.
   */
  getConfiguration(): EngineOperationResult<Readonly<TConfiguration>>

  /**
   * Asynchronously replaces the entire configuration (no implicit patch/merge).
   * Accepted only while ready. Success makes the replacement active; failure
   * preserves the previous configuration and ready state. Input is not mutated.
   */
  updateConfiguration(configuration: Readonly<TConfiguration>): Promise<EngineOperationResult>
}
