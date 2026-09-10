import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // OneDrive can lock Vite's disposable dependency cache during sync.
  cacheDir: join(tmpdir(), 'smarthire-vite-cache'),
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
