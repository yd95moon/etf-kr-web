import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// public/data is prepared by the daily pipeline and committed with the site.
export default defineConfig({ plugins: [react()], base: './', build: { outDir: 'dist' } })
