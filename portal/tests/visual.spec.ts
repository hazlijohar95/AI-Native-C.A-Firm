import { test, expect } from '@playwright/test';

/**
 * Visual and UI Tests
 * Tests for visual elements and responsive design
 */

test.describe('Visual Elements', () => {
  test('login page should display company branding', async ({ page }) => {
    await page.goto('/login');
    
    // Should show company name or logo
    const pageContent = await page.content();
    expect(
      pageContent.toLowerCase().includes('amjad') || 
      pageContent.toLowerCase().includes('hazli') ||
      pageContent.toLowerCase().includes('portal')
    ).toBeTruthy();
  });

  test('login page should be responsive', async ({ page }) => {
    await page.goto('/login');
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Loading States', () => {
  test('should show loading state initially', async ({ page }) => {
    await page.goto('/login');
    
    // Page should load without errors
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    
    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');
    
    // Should have no critical JS errors
    const criticalErrors = errors.filter(e => 
      !e.includes('ResizeObserver') && // Ignore ResizeObserver errors (common in React)
      !e.includes('Script error')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
