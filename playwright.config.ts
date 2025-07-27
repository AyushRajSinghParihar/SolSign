import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // The webServer option below will automatically handle the base URL.
    // However, it's good practice to set it explicitly if you have a known URL.
    baseURL: 'http://127.0.0.1:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // You can uncomment these for more comprehensive cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* --- THIS IS THE KEY CONFIGURATION --- */
  /* Run your local dev server before starting the tests */
  webServer: {
    /**
     * The command to start your frontend development server.
     * We use `pnpm dev --filter=frontend` which is the Turborepo command
     * to start only the frontend application.
     */
    command: 'pnpm dev --filter=frontend',
    
    /**
     * The URL that Playwright will wait for before starting the tests.
     * This must match the URL your Vite server runs on.
     */
    url: 'http://127.0.0.1:5173',
    
    /**
     * If you are already running `pnpm dev` in a separate terminal,
     * this option allows Playwright to reuse that server instead of starting a new one.
     * This is disabled in CI environments to ensure a clean start.
     */
    reuseExistingServer: !process.env.CI,
  },
});