import { createRoot } from 'react-dom/client'
import '@fontsource/dela-gothic-one/cyrillic-400.css'
import '@fontsource/dela-gothic-one/latin-400.css'
import '@fontsource-variable/onest/index.css'
import './theme.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(<App />)
