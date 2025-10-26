import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: process.env.CI === 'true',
  retries: process.env.CI === 'true' ? 2 : 0,
  workers: process.env.CI === 'true' ? 1 : undefined,
  reporter:
    process.env.CI === 'true'
      ? [['html'], ['json', { outputFile: 'test-results/results.json' }]]
      : [
          ['list'], // リアルタイム進捗表示
          ['html'],
        ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // モバイルテストもChromiumベースに変更（安定性優先）
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] }, // AndroidデバイスはChromiumベース
    },
  ],
  webServer: {
    command:
      process.env.CI === 'true'
        ? 'pnpm build && pnpm start' // CI環境：ビルド済み版を使用（安定）
        : 'pnpm dev', // ローカル：開発サーバー（高速）
    url: 'http://localhost:3000',
    reuseExistingServer: false, // 常に新規起動（安定性優先）
    timeout: 120 * 1000, // 120秒（Next.jsビルドに十分な時間）
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
