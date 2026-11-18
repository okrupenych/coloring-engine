import { trackContainerDimensions } from './trackContainerDimensions.ts'
import type { ContainerDimensionTracker } from './trackContainerDimensions.ts'

export interface CanvasHost extends ContainerDimensionTracker {
  /** Mount with append(); unmount with remove() on the externally owned element. */
  readonly element: HTMLDivElement
}

/** Creates an empty host; callers retain ownership of rendering and its cleanup. */
export function createCanvasHost(parent?: HTMLElement): CanvasHost {
  const element = document.createElement('div')
  element.className = 'canvas-host'

  parent?.append(element)
  const tracker = trackContainerDimensions(element)

  return {
    element,
    get dimensions() { return tracker.dimensions },
    subscribe: tracker.subscribe,
    dispose: tracker.dispose,
  }
}
