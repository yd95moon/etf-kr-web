import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cpSync, mkdirSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-etf-data',
      buildStart() {
        mkdirSync('public/data', { recursive: true })
        try {
          cpSync('../data/cohorts/2026-06/etf_v1.json', 'public/data/etf_v1.json')
        } catch {
          // CI: data already committed to public/data/
        }
      }
    }
  ],
  base: './',
  build: { outDir: 'dist' }
})
