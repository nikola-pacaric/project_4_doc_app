import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_WEB_BASE_URL ?? 'http://127.0.0.1:4173';
const useManagedTarget = Boolean(process.env.E2E_WEB_BASE_URL);

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  testDir: './e2e/web',
  timeout: 30_000,
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: useManagedTarget
    ? undefined
    : {
        command: 'npm run dev:web -- --port 4173',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
        url: baseURL,
      },
});
