import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the built assets load from file:// inside the Android WebView.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2019',
    chunkSizeWarningLimit: 1200,
  },
})
