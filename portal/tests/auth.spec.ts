import { test, expect } from '@playwright/test';

/**
 * Auth Flow Tests
 * Tests the login page and authentication redirects
 */

test.describe('Authentication', () => {
  test('should show login page for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    
    // Should show login page content
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should have working sign in buttons', async ({ page }) => {
    await page.goto('/login');
    
    // Check for Google sign in button
    const googleButton = page.getByRole('button', { name: /google/i });
    await expect(googleButton).toBeVisible();
    
    // Check for email sign in option
    const emailButton = page.getByRole('button', { name: /email/i });
    await expect(emailButton).toBeVisible();
  });

  test('should redirect unknown routes to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    
    await page.goto('/documents');
    await expect(page).toHaveURL(/\/login/);
    
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });
});
