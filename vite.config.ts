/// <reference types="vitest/config" />
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

// The browser talks to the local send server through this proxy, so the app
// never needs the server's address or any credentials.
const sendServerUrl = process.env.STUDIO_SEND_SERVER_URL ?? 'http://127.0.0.1:8787'
const apiProxy = { '/api': { target: sendServerUrl, changeOrigin: false } }

// https://vite.dev/config/
export default defineConfig({
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    // Default to Node; component tests opt into jsdom with a `@vitest-environment jsdom` docblock.
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts'],
    css: false,
  },
})
