export interface ContainerDimensions {
  readonly width: number
  readonly height: number
}

export interface ContainerDimensionTracker {
  /** Inner size in integer CSS pixels, including padding but excluding scrollbars. */
  readonly dimensions: ContainerDimensions
  /** Changes only; read dimensions for the initial value. Returns an unsubscribe function. */
  subscribe(listener: (dimensions: ContainerDimensions) => void): () => void
  /** Idempotent; retains the last dimensions and rejects further subscriptions. */
  dispose(): void
}

/** Track a mounted element, or start at zero until a detached element is mounted. */
export function trackContainerDimensions(element: HTMLElement): ContainerDimensionTracker {
  const measure = (): ContainerDimensions => Object.freeze({
    width: element.clientWidth,
    height: element.clientHeight,
  })
  let dimensions = measure()
  let disposed = false
  const listeners = new Set<(dimensions: ContainerDimensions) => void>()
  const observer = new ResizeObserver(() => {
    if (disposed) return
    const next = measure()
    if (next.width === dimensions.width && next.height === dimensions.height) return
    dimensions = next
    for (const listener of [...listeners]) {
      if (disposed) break
      if (listeners.has(listener)) listener(dimensions)
    }
  })
  observer.observe(element)

  return {
    get dimensions() { return dimensions },
    subscribe(listener) {
      if (disposed) throw new Error('Cannot subscribe to a disposed dimension tracker.')
      // Each subscription has an independent lifetime, even for the same callback.
      const subscription = (size: ContainerDimensions) => listener(size)
      listeners.add(subscription)
      return () => { listeners.delete(subscription) }
    },
    dispose() {
      if (disposed) return
      disposed = true
      observer.disconnect()
      listeners.clear()
    },
  }
}
