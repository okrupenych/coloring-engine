/** Failure of a lifecycle or configuration request, not a diagnostic event. */
export interface EngineOperationFailure {
  readonly code: 'invalid-state' | 'operation-failed'
  readonly message: string
}

/**
 * Success means the operation has completed, not merely been scheduled.
 * Expected failures are returned here, never thrown or rejected.
 * A rejection/throw is an unexpected implementation defect, not a result variant.
 */
export type EngineOperationResult<T = void> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: EngineOperationFailure }
