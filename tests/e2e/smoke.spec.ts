import { test, expect } from '@playwright/test';

test.describe('NOW / IRL Mobile E2E Smoke & Complete Journey Tests', () => {
  test('should render Home screen with DemoMap, DEMO CITY, and active flames', async ({ page }) => {
    await page.goto('/');

    // 1. Persistent DEMO banner
    const demoBanner = page.locator('aside[role="region"]');
    await expect(demoBanner).toBeVisible();
    await expect(demoBanner).toContainText('DEMO PROTOTYPE');

    // 2. Header elements
    const header = page.locator('header');
    await expect(header).toContainText('NOW');
    await expect(header).toContainText('IRL');
    await expect(header).toContainText('DEMO CITY');
    await expect(header).toContainText('SOS / 112');

    // 3. User switcher
    await expect(page.locator('text=[DEMO] Алекс')).toBeVisible();

    // 4. Main headings
    await expect(page.locator('text=Что происходит рядом?')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Собери компанию рядом за несколько минут');

    // 5. Interactive Demo Map
    await expect(page.getByText('DEMO MAP', { exact: true })).toBeVisible();
    await expect(page.getByText('Demo map. Real map data will be connected later.')).toBeVisible();

    // 6. Large Action Button "Собрать компанию"
    const createBtn = page.locator('button:has-text("Собрать компанию")');
    await expect(createBtn).toBeVisible();

    // 7. Section "Сейчас рядом"
    await expect(page.locator('text=Сейчас рядом')).toBeVisible();
  });

  test('should execute full demo user journey: Create -> Live -> Chat -> Check-In -> Complete -> Share-Card', async ({
    page,
  }) => {
    await page.goto('/');

    // 1. Click "Собрать компанию"
    await page.click('button:has-text("Собрать компанию")');

    // 2. Modal should appear
    await expect(page.locator('#create-modal-title')).toBeVisible();
    await expect(page.locator('#create-modal-title')).toContainText('Зажечь огонёк активности');

    // 3. Fill in place name
    await page.fill('#public-place-input', 'Центральный фонтан');

    // 4. Click "Зажечь огонёк"
    await page.click('button[type="submit"]:has-text("Зажечь огонёк")');

    // 5. Live screen should open
    await expect(page.locator('button:has-text("Карта")')).toBeVisible();
    await expect(page.locator('text=Сбор группы (Gathering)')).toBeVisible();
    await expect(page.locator('text=Встречаемся: Центральный фонтан')).toBeVisible();

    // 6. Send message in DemoChat
    const chatInput = page.locator('input[placeholder*="Сообщение координации"]');
    await expect(chatInput).toBeVisible();
    await chatInput.fill('Я на месте у фонтана!');
    await page.click('button:has-text("Отправить")');
    await expect(page.locator('text=Я на месте у фонтана!')).toBeVisible();

    // 7. Check-in
    const checkInBtn = page.locator('button:has-text("Я на месте (Check-in)")');
    await expect(checkInBtn).toBeVisible();
    await checkInBtn.click();

    // 8. Advance demo status to complete using DEMO shortcut or finish button
    const demoShortcut = page.getByRole('button', { name: 'Начать активность сейчас (DEMO)' });
    if (await demoShortcut.isVisible()) {
      await demoShortcut.click();
    }

    // Now creator can complete
    const completeBtn = page.getByRole('button', { name: '🏁 Завершить' });
    if (await completeBtn.isVisible()) {
      await completeBtn.click();
    }

    // 9. Completed screen and Share-Card (auto-opened upon completion)
    await expect(page.locator('#share-modal-title')).toBeVisible();
    await expect(page.locator('text=Zero-PII • Без персональных данных и координат')).toBeVisible();
    await expect(page.locator('button:has-text("Скачать карточку (PNG)")')).toBeVisible();
    await expect(page.locator('button:has-text("Скопировать текст")')).toBeVisible();

    // Close share modal
    await page.click('button[aria-label="Закрыть"]');

    // Verify completed screen in Live view
    await expect(page.locator('text=Встреча успешно завершена!')).toBeVisible();

    // Return to map
    await page.click('button:has-text("Карта")');
    await expect(page.locator('h1')).toContainText('Собери компанию рядом за несколько минут');
  });

  test('should allow creating a second meetup after completing the first one without stuck loading', async ({
    page,
  }) => {
    await page.goto('/');

    // --- STEP 1: Create first meetup ---
    await page.click('button:has-text("Собрать компанию")');
    await expect(page.locator('#create-modal-title')).toBeVisible();
    await page.fill('#public-place-input', 'Первая точка сбора');
    await page.click('button[type="submit"]:has-text("Зажечь огонёк")');

    // --- STEP 2: Complete first meetup in Live view ---
    await expect(page.locator('text=Встречаемся: Первая точка сбора')).toBeVisible();

    const completeBtn = page.getByRole('button', { name: '🏁 Завершить' });
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();

    // Close share modal and return Home
    await expect(page.locator('#share-modal-title')).toBeVisible();
    await page.click('button[aria-label="Закрыть"]');
    await page.click('button:has-text("Карта")');
    await expect(page.locator('h1')).toContainText('Собери компанию рядом за несколько минут');

    // --- STEP 3: Create second meetup without page reload ---
    await page.click('button:has-text("Собрать компанию")');
    await expect(page.locator('#create-modal-title')).toBeVisible();

    // Verify the submit button is NOT stuck in "Создаём..."
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).not.toBeDisabled();
    await expect(submitBtn).toContainText('Зажечь огонёк');

    // Fill in second meetup details
    await page.fill('#public-place-input', 'Вторая точка сбора');
    await page.fill('input[placeholder*="идём в спокойном темпе"]', 'Уникальное описание второй активности');
    await submitBtn.click();

    // --- STEP 4: Verify second meetup is created and Live view opens ---
    await expect(page.locator('text=Встречаемся: Вторая точка сбора')).toBeVisible();
    await expect(page.locator('text=Сбор группы (Gathering)')).toBeVisible();

    // Return to map and verify it is visible in the list
    await page.click('button:has-text("Карта")');
    await expect(page.locator('text=Уникальное описание второй активности')).toBeVisible();
  });

  test('should handle server error on creation gracefully without perpetual spinner', async ({ page }) => {
    await page.goto('/');

    // Intercept POST /api/meetups and simulate server error
    await page.route('**/api/meetups', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Тестовый сбой сервера при создании' }),
        });
      }
      return route.continue();
    });

    await page.click('button:has-text("Собрать компанию")');
    await expect(page.locator('#create-modal-title')).toBeVisible();

    await page.fill('#public-place-input', 'Точка с ошибкой');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Error banner should appear with the message
    await expect(page.locator('text=Тестовый сбой сервера при создании')).toBeVisible();

    // Button MUST return from loading state to interactive state
    await expect(submitBtn).not.toBeDisabled();
    await expect(submitBtn).toContainText('Зажечь огонёк');
  });
});
