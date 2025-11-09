import { test, expect } from '@playwright/test';

test.describe('Writing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('writes text and auto-saves on space', async ({ page }) => {
    const editor = page.locator('#editor');

    await editor.click();
    await editor.pressSequentially('test content');
    await page.keyboard.press('Space');

    // Verify localStorage
    const archives = await page.evaluate(() => {
      const data = localStorage.getItem('ichido_archives');
      return data ? JSON.parse(data) : [];
    });

    expect(archives).toHaveLength(1);
    expect(archives[0].content).toContain('test content');
  });

  test('creates new reflection and saves previous', async ({ page }) => {
    const editor = page.locator('#editor');

    // Write first
    await editor.click();
    await editor.pressSequentially('first reflection');
    await page.keyboard.press('Space');

    // Click New
    await page.getByRole('button', { name: /new/i }).click();

    // Write second
    await editor.pressSequentially('second reflection');
    await page.keyboard.press('Space');

    // Check archives
    const archives = await page.evaluate(() => {
      const data = localStorage.getItem('ichido_archives');
      return data ? JSON.parse(data) : [];
    });

    expect(archives).toHaveLength(2);
  });

  test('copies and deletes from archives', async ({ page }) => {
    // Write and save
    const editor = page.locator('#editor');
    await editor.click();
    await editor.pressSequentially('test reflection');
    await page.keyboard.press('Space');

    // Open archives
    await page.getByRole('button', { name: /archives/i }).click();
    await expect(page.locator('#archiveOverlay')).toBeVisible();

    // Copy
    await page.getByRole('button', { name: /copy/i }).first().click();
    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText()
    );
    expect(clipboardText).toContain('test reflection');

    // Delete (confirm)
    const deleteBtn = page.getByRole('button', { name: /delete/i }).first();
    await deleteBtn.click();
    await expect(deleteBtn).toHaveText('Confirm?');
    await deleteBtn.click();

    // Verify empty
    await expect(page.locator('.empty-state')).toBeVisible();
  });

  test('theme toggles persist across reload', async ({ page }) => {
    // Toggle to dark
    await page.getByRole('button', { name: /auto/i }).click();
    await expect(page.locator('body')).toHaveClass(/light-theme/);

    // Reload and check persistence
    await page.reload();
    await expect(page.locator('body')).toHaveClass(/light-theme/);
  });
});
