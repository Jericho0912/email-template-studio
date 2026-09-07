/// <reference types="vitest/config" />
import path from 'node:path'
import type { IncomingMessage } from 'node:http'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import pkg from './package.json' with { type: 'json' }

// The browser talks to the local send server through this proxy, so the app
// never needs the server's address or any credentials. The target follows
// STUDIO_SEND_SERVER_URL, else STUDIO_SERVER_PORT from the environment or .env.
function sendServerUrl(mode: string): string {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  if (env.STUDIO_SEND_SERVER_URL) return env.STUDIO_SEND_SERVER_URL
  return `http://127.0.0.1:${env.STUDIO_SERVER_PORT ?? '8787'}`
}

type ProxyRequest = { setHeader(name: string, value: string): void }

function isLoopbackAddress(address: string | undefined): boolean {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const apiProxy = {
    '/api': {
      target: sendServerUrl(mode),
      changeOrigin: false,
      // If Vite is ever started with --host, requests from other machines get a
      // foreign Host header so the send server refuses them (it only serves localhost).
      configure(proxy: {
        on(event: 'proxyReq', listener: (proxyReq: ProxyRequest, req: IncomingMessage) => void): void
      }) {
        proxy.on('proxyReq', (proxyReq, req) => {
          if (!isLoopbackAddress(req.socket.remoteAddress))
            proxyReq.setHeader('host', 'remote-client.invalid')
        })
      },
    },
  }
  return {
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
  }
})
