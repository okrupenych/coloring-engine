/** Public data only: no exceptions, resources, callbacks, or internal handles. */
export type EngineDetailValue =
  | string | number | boolean | null
  | readonly EngineDetailValue[]
  | { readonly [key: string]: EngineDetailValue }

export type EngineDetails = Readonly<Record<string, EngineDetailValue>>

/** Codes are stable machine identifiers; messages are human-readable summaries. */
export interface EngineError<TCode extends string = string> {
  readonly code: TCode
  readonly message: string
  /** Detached, sanitized public data; never raw exceptions or internal state. */
  readonly details?: EngineDetails
}

export type EngineDiagnosticSeverity = 'debug' | 'info' | 'warning' | 'error'

/** Observational information, not an operation result, even at error severity. */
export interface EngineDiagnostic {
  readonly severity: EngineDiagnosticSeverity
  readonly message: string
  readonly details?: EngineDetails
}
