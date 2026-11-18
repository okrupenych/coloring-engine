import type { EngineOperationResult } from './result'

export type EngineLifecycleState =
  | 'uninitialized'
  | 'initializing'
  | 'ready'
  | 'disposing'
  | 'disposed'
  | 'failed'

/** Lifecycle only; no rendering host, runtime commands, or event subscriptions. */
export interface EngineLifecycle<TConfiguration extends object> {
  readonly lifecycleState: EngineLifecycleState

  /**
   * Accepted only when uninitialized. Moves through initializing to ready on
   * success, or failed on operational failure. The supplied configuration
   * becomes active only on success; implementations must not mutate the input.
   */
  initialize(configuration: Readonly<TConfiguration>): Promise<EngineOperationResult>

  /**
   * Releases owned resources; accepted from uninitialized, ready, or failed.
   * Moves through disposing to disposed on success, or failed on failure.
   * Already disposed succeeds without further work. Disposed is terminal.
   */
  dispose(): Promise<EngineOperationResult>
}
