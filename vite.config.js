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
      // Use IPv4 explicitly: Windows can resolve localhost differently between
      // the browser and Vite's proxy, causing intermittent fetch failures.
      '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true },
    },
  },
})
