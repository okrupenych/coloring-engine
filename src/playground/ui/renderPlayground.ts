export function renderPlayground(root: HTMLElement): void {
  root.innerHTML = `
    <main class="playground">
      <header class="playground-header">
        <h1>Development Playground</h1>
      </header>
      <div class="playground-layout">
        <section class="playground-region workspace" aria-labelledby="workspace-heading">
          <h2 id="workspace-heading">Canvas Workspace</h2>
          <div class="region-content workspace-content">
            <p class="placeholder">The canvas workspace is not yet implemented.</p>
          </div>
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
}
