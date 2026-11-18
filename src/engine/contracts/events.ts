import type { EngineDiagnostic, EngineError } from './errors'
import type { EngineLifecycleState } from './lifecycle'

/** Payload schemas must contain detached public data, never engine resources. */
export interface EngineEvent<TType extends string = string, TPayload extends object = object> {
  readonly type: TType
  /** Unix epoch milliseconds when the change/observation occurred. */
  readonly timestamp: number
  readonly payload?: Readonly<TPayload>
}

/** Invalidation notice: re-read public state/capabilities as lifecycle permits. */
export interface EngineStateChangedEvent extends EngineEvent<'state-changed'> {
  readonly payload: { readonly lifecycleState: EngineLifecycleState }
}

/** Emitted after a successful configuration commit, including initialization. */
export interface EngineConfigurationChangedEvent<TConfiguration extends object>
  extends EngineEvent<'configuration-changed', TConfiguration> {
  readonly payload: Readonly<TConfiguration>
}

/** Observes an operational failure; does not replace the request's result. */
export interface EngineErrorEvent extends EngineEvent<'error', EngineError> {
  readonly payload: EngineError
}

export interface EngineDiagnosticEvent extends EngineEvent<'diagnostic', EngineDiagnostic> {
  readonly payload: EngineDiagnostic
}

/** Consumers may extend this union locally with additional typed events. */
export type EngineNotification<TConfiguration extends object> =
  | EngineStateChangedEvent
  | EngineConfigurationChangedEvent<TConfiguration>
  | EngineErrorEvent
  | EngineDiagnosticEvent
