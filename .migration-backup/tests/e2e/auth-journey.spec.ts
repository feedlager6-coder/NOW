import { test, expect } from '@playwright/test';

test.describe('NOW / IRL Auth & Onboarding User Journey Tests', () => {
  test('should complete end-to-end auth flow: Welcome -> Login -> Verify -> Age-Gate -> Profile -> Home -> Profile -> Logout', async ({
    page,
  }) => {
    // 1. Open Welcome page
    await page.goto('/welcome');
    await expect(page.locator('h1')).toContainText('NOW');
    await expect(page.locator('text=Только открытые общественные места')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Строго 18+' })).toBeVisible();

    // 2. Click Login
    await page.click('a:has-text("Войти по номеру")');
    await expect(page.locator('h1')).toContainText('Вход по номеру');

    // 3. Choose test number and submit
    await page.click('button:has-text("Алекс (Dev)")');
    await page.click('button:has-text("Получить код подтверждения")');

    // 4. Verify screen
    await expect(page.locator('h1')).toContainText('Введите код');
    await page.click('button:has-text("Вставить 000000")');
    await page.click('button:has-text("Подтвердить и продолжить")');

    // 5. Age Gate screen
    await page.waitForURL('**/onboarding/age-gate', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Возрастной ценз 18+');
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await page.click('button:has-text("Подтвердить и продолжить")');

    // 6. Profile screen
    await page.waitForURL('**/onboarding/profile', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Профиль участника');
    await page.fill('#displayName', 'Тестовый Пользователь');
    await page.click('button:has-text("Завершить настройку")');

    // 7. Should now be on Home screen with profile indicator
    await page.waitForURL('/', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Собери компанию рядом за несколько минут');
    await expect(page.locator('text=Мой профиль')).toBeVisible();

    // 8. Open Profile page
    await page.click('text=Мой профиль');
    await expect(page.locator('text=LOCAL TEST MODE')).toBeVisible();

    // 9. Logout
    await page.click('button:has-text("Выйти из аккаунта")');
    await expect(page.locator('h1')).toContainText('NOW');
  });

  test('should allow entering DEMO mode directly from Welcome screen', async ({ page }) => {
    await page.goto('/welcome');
    await page.click('button:has-text("Войти в DEMO-режим")');

    await expect(page.locator('h1')).toContainText('Собери компанию рядом за несколько минут');
    await expect(page.locator('text=DEMO MODE')).toBeVisible();
  });
});
