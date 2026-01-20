import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // PENTING untuk Vercel
  build: {
    outDir: 'dist'
  },
  server: {
    // listen on all network interfaces so the dev server is reachable on LAN
    host: true,
  },
})
