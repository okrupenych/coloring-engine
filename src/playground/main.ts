import './ui/style.css'
import { initializePlayground } from './app.ts'

const root = document.querySelector<HTMLElement>('#app')

if (!root) {
  throw new Error('Cannot start the Playground: missing #app element.')
}

const view = initializePlayground(root)

if (import.meta.hot) {
  import.meta.hot.dispose(() => view.dispose())
}
