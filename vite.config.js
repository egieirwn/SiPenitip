import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-200-html',
      closeBundle() {
        const dist = path.resolve(__dirname, 'dist')
        const indexHtml = path.join(dist, 'index.html')
        const fallbackHtml = path.join(dist, '200.html')
        if (fs.existsSync(indexHtml)) {
          fs.copyFileSync(indexHtml, fallbackHtml)
        }
      }
    }
  ],
  server: {
    port: 3000,
    open: false
  }
})
