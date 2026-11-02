import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API = process.env.API_URL ?? 'http://localhost:4000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
    host: true,
    proxy: {
      '/api': { target: API, rewrite: p => p.replace(/^\/api/, '') },
      '/uploads': API,
    },
  },
})
