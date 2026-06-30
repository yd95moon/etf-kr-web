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
        const files = [
          ['../data/cohorts/2026-06/etf_v1.json',      'public/data/etf_v1.json'],
          ['../data/cohorts/2026-06/benchmarks.json',   'public/data/benchmarks.json'],
        ]
        for (const [src, dst] of files) {
          try { cpSync(src, dst) } catch { /* CI: already committed */ }
        }
      }
    }
  ],
  base: './',
  build: { outDir: 'dist' }
})
