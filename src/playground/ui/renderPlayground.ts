import { createCanvasHost } from './createCanvasHost.ts'
import type { CanvasHost } from './createCanvasHost.ts'

export interface PlaygroundView {
  readonly canvasHost: CanvasHost
}

export function renderPlayground(root: HTMLElement): PlaygroundView {
  root.innerHTML = `
    <main class="playground">
      <header class="playground-header">
        <h1>Development Playground</h1>
      </header>
      <div class="playground-layout">
        <section class="playground-region workspace" aria-labelledby="workspace-heading">
          <h2 id="workspace-heading">Canvas Workspace</h2>
          <div class="region-content workspace-content"></div>
        </section>
        <section class="playground-region controls" aria-labelledby="controls-heading">
          <h2 id="controls-heading">Development Controls</h2>
          <div class="region-content">
            <p class="placeholder">Tool controls will appear here.</p>
          </div>
        </section>
        <section class="playground-region diagnostics" aria-labelledby="diagnostics-heading">
          <h2 id="diagnostics-heading">Diagnostics</h2>
          <div class="region-content">
            <p class="placeholder">Runtime information will appear here.</p>
          </div>
        </section>
      </div>
    </main>
  `

  const workspace = root.querySelector<HTMLElement>('.workspace-content')!
  const canvasHost = createCanvasHost()
  workspace.append(canvasHost.element)

  return { canvasHost }
}
