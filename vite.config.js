import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Served from https://samule.github.io/f1-data/ on GitHub Pages.
  // Override with VITE_BASE=/ (e.g. for Vercel or a custom domain).
  base: process.env.VITE_BASE ?? '/f1-data/',
  plugins: [react()],
  test: { environment: 'node' },
})
