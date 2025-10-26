import { Page } from '@playwright/test';

export async function authenticate(page: Page, password: string = '0492') {
  // PROJECT_INFO.mdに記載のパスワード認証
  await page.goto('/');
  const passwordInput = page.locator('input[type="password"]');
  if (await passwordInput.isVisible()) {
    await passwordInput.fill(password);
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');
  }
}

export async function waitForFeatureLoad(page: Page, featureName: string) {
  await page.waitForSelector(`[data-feature="${featureName}"]`, { 
    state: 'visible',
    timeout: 10000 
  });
}