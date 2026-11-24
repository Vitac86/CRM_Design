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
    // The React development server shares this checkout with the private order backend.
    fs: {
      deny: [
        '.env', '.env.*', '*.{crt,pem}', '**/.git/**',
        '**/order-wizard/**', '**/*.sql', '**/static-uikit/tools/qort/**',
        '**/static-uikit/tools/order-reference-server.mjs', '**/static-uikit/tools/qa/*qort*',
      ],
    },
  },
})
