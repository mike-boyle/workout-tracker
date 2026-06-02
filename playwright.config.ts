import { defineConfig, devices } from '@playwright/test';
import { execFileSync } from 'child_process';

function getFreePort(): number {
  try {
    const stdout = execFileSync(
      'node',
      [
        '-e',
        'const net = require("net"); const server = net.createServer(); server.listen(0, () => { console.log(server.address().port); process.exit(0); });',
      ],
      { encoding: 'utf-8' }
    );
    const port = parseInt(stdout.trim(), 10);
    if (!isNaN(port) && port > 0) {
      return port;
    }
  } catch (err) {
    // Ignore error and fall back
  }
  return 5173;
}

const port = process.env.PORT || String(getFreePort());
process.env.PORT = port;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 10000,
  },
});
