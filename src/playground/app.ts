import { renderPlayground } from './ui/renderPlayground.ts'
import type { PlaygroundView } from './ui/renderPlayground.ts'

export function initializePlayground(root: HTMLElement): PlaygroundView {
  return renderPlayground(root)
}
