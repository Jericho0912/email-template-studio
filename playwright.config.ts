import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests run against the PRODUCTION build served by `vite preview`,
 * so they exercise the real worker bundle and iframe isolation.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 45_000,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // The app, proxying /api to the dry-run send server below.
      command:
        'STUDIO_SEND_SERVER_URL=http://127.0.0.1:8790 npm run build && STUDIO_SEND_SERVER_URL=http://127.0.0.1:8790 npx vite preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      // Never reuse: a stray preview could be proxying to a LIVE send server.
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      // Send server in dry-run mode: exercises the whole path without AWS.
      command:
        'STUDIO_SEND_ENABLED=true STUDIO_SEND_DRY_RUN=true AWS_REGION=us-east-1 SES_FROM_ADDRESS=studio@example.test SES_ALLOWED_RECIPIENTS=qa@example.test,second@example.test STUDIO_SERVER_PORT=8790 node --env-file-if-exists=/dev/null server/index.ts',
      url: 'http://127.0.0.1:8790/api/send-test/status',
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
})
