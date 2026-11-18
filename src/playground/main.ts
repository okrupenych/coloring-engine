import './ui/style.css'
import { initializePlayground } from './app.ts'

const root = document.querySelector<HTMLElement>('#app')

if (!root) {
  throw new Error('Cannot start the Playground: missing #app element.')
}

export const application = initializePlayground(root)

void application.ready.then(result => {
  if (!result.ok) console.error('Playground engine initialization failed:', result.error)
}).catch(error => console.error('Playground startup failed:', error))

if (import.meta.hot) {
  import.meta.hot.accept()
  import.meta.hot.dispose(() => {
    void application.dispose().then(result => {
      if (!result.ok) console.error('Playground cleanup failed:', result.error)
    }).catch(error => console.error('Playground cleanup rejected:', error))
  })
}
