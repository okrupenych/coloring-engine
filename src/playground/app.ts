import type { EngineLifecycle, EngineOperationResult } from '../engine/contracts'
import { MockEngine } from '../engine/mock'
import { EngineAdapterManager } from './engine'
import type { EngineAdapterFactory } from './engine'
import { createWorkspaceEngine } from './ui/createWorkspaceEngine'
import type { WorkspaceAdapter } from './ui/createWorkspaceEngine'
import { renderPlayground } from './ui/renderPlayground'

export interface PlaygroundConfiguration { readonly profile: string }
export type PlaygroundAdapter = WorkspaceAdapter & EngineLifecycle<PlaygroundConfiguration>

/** Composition root: chooses the concrete engine; consumers receive contracts. */
export function initializePlayground(
  root: HTMLElement,
  factory: EngineAdapterFactory<PlaygroundAdapter> = () => new MockEngine<PlaygroundConfiguration>(),
) {
  const view = renderPlayground(root)
  const manager = new EngineAdapterManager<PlaygroundConfiguration, PlaygroundAdapter>(factory)
  const workspace = createWorkspaceEngine(view.canvasHost.element, manager)
  let disposed = false
  let disposal: Promise<EngineOperationResult> | undefined
  const replacements = new Set<Promise<EngineOperationResult>>()
  const ready = manager.initialize({ profile: 'playground' }).then(result => {
    if (!disposed && result.ok) workspace.attach()
    return result
  })

  return {
    canvasHost: view.canvasHost,
    workspace,
    ready,
    replaceAdapter(factory: EngineAdapterFactory<PlaygroundAdapter>,
      configuration: PlaygroundConfiguration = { profile: 'playground' }): Promise<EngineOperationResult> {
      if (disposed) return Promise.resolve({ ok: false,
        error: { code: 'invalid-state', message: 'Playground is disposed.' } })
      const replacement = manager.replace(factory, configuration)
      replacements.add(replacement)
      void replacement.then(() => replacements.delete(replacement))
      return replacement
    },
    dispose(): Promise<EngineOperationResult> {
      if (disposal) return disposal
      const firstDisposal = !disposed
      disposed = true
      const consumerCleanup = workspace.dispose()
      if (firstDisposal) view.dispose()
      disposal = (async () => {
        await Promise.all([ready, consumerCleanup, ...replacements])
        return manager.dispose()
      })().then(result => {
        // Retry only unsuccessful manager cleanup; successful cleanup is retained.
        if (!result.ok) disposal = undefined
        return result
      })
      return disposal
    },
  }
}
