import { realpathSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Vite 5 loses the server prefix when it resolves a Windows mapped drive to its UNC path.
  resolve: { preserveSymlinks: process.platform === 'win32' && realpathSync.native(process.cwd()).startsWith('\\\\') },
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.ngrok-free.dev'],
  },
})
