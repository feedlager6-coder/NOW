import { test, expect } from '@playwright/test';

test.describe('Avatar Rendering and Fallback Verification', () => {
  test('should render avatar images and never leak path string as text', async ({ page }) => {
    await page.goto('/');

    // 1. Check home screen discovery cards
    const meetupCards = page.locator('article');
    await expect(meetupCards.first()).toBeVisible();

    // 2. Ensure no card contains the raw path text
    const textLeaking = page.getByText('/avatars/', { exact: false });
    await expect(textLeaking).toHaveCount(0);

    // 3. Ensure participant silhouettes render img or svg, not path strings
    const avatarImages = page.locator('[data-testid="user-avatar-img"]');
    const fallbackSvgs = page.locator('[data-testid="fallback-avatar-svg"]');
    
    const imgCount = await avatarImages.count();
    const svgCount = await fallbackSvgs.count();
    expect(imgCount + svgCount).toBeGreaterThan(0);

    // 4. Verify no text starting with rs/silhouette or /avatars/silhouette exists anywhere in the body
    const bodyText = await page.innerText('body');
    expect(bodyText).not.toContain('/avatars/silhouette');
    expect(bodyText).not.toContain('rs/silhouette');
  });

  test('should display neutral silhouette fallback when avatarRef is broken or invalid', async ({
    page,
  }) => {
    // Intercept profile fetch and return an invalid avatar ref
    await page.route('**/api/profile', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          profile: {
            displayName: 'Тестовый Пользователь',
            ageBand: '22-25',
            reliabilityScore: 100,
            avatarRef: '/avatars/non-existent-broken.png',
            bio: 'Тестовое описание',
            showAgeBandAndInterests: true,
          },
          interests: [],
        }),
      });
    });

    await page.goto('/profile');

    // Should not crash and should not render the broken path as text
    const brokenPathText = page.getByText('/avatars/non-existent-broken.png', { exact: false });
    await expect(brokenPathText).toHaveCount(0);
    // Fallback SVG or img onerror should trigger
    const avatarContainer = page.locator('div:has(> [data-testid="user-avatar-img"]), div:has(> [data-testid="fallback-avatar-svg"])');
    await expect(avatarContainer.first()).toBeVisible();
  });
});
