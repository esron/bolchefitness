import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'tests',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1,
  use: { ...devices['Pixel 7'], baseURL: 'http://127.0.0.1:4173/bolchefitness/' },
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://127.0.0.1:4173/bolchefitness/',
    reuseExistingServer: !process.env.CI,
  },
  reporter: 'list',
});
