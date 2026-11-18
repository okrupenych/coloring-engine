export interface CanvasHost {
  /** Mount with append(); unmount with remove() on the externally owned element. */
  readonly element: HTMLDivElement
}

/** Creates an empty host; callers retain ownership of rendering and its cleanup. */
export function createCanvasHost(): CanvasHost {
  const element = document.createElement('div')
  element.className = 'canvas-host'

  return { element }
}
