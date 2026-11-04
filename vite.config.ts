import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? '/razvozka/' : '/',
  // MapLibre 6 грузит поток по относительному пути, предварительная сборка Vite этот путь ломает.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  build: { chunkSizeWarningLimit: 1400 },
})
