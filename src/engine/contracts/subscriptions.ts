import type { EngineEvent } from './events'

export type EngineEventListener<TEvent extends EngineEvent = EngineEvent> = (event: TEvent) => void

/** Owned by the subscriber; release on consumer disposal or adapter replacement. */
export interface EngineSubscription {
  /**
   * Idempotent, synchronous release of this registration only. After return no
   * new callbacks may start, including queued delivery; an active callback may finish.
   */
  unsubscribe(): void
}

/** Same instance-scoped contract for mock and real adapters; no global bus. */
export interface EngineEventSource<TEvent extends EngineEvent = EngineEvent> {
  /**
   * Registers synchronously, without replay. Each call owns a separate registration.
   * Available before initialization and until disposal starts. After that, returns
   * an inert subscription. The source releases all listeners on successful disposal;
   * consumers must also unsubscribe when detached, including after failed disposal.
   * Listener exceptions must not change operation results or prevent other delivery.
   */
  subscribe(listener: EngineEventListener<TEvent>): EngineSubscription
}
