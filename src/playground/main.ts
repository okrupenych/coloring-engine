import './ui/style.css'
import { initializePlayground } from './app.ts'

const root = document.querySelector<HTMLElement>('#app')

if (!root) {
  throw new Error('Cannot start the Playground: missing #app element.')
}

initializePlayground(root)
