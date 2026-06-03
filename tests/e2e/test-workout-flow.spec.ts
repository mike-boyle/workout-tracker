import { test, expect } from '@playwright/test';
import { setupStrictNetworkIsolation } from './network-isolation';

test.describe('Test Workout Split E2E Flow', () => {
  test.setTimeout(60000);

  setupStrictNetworkIsolation();

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      localStorage.clear();
      sessionStorage.clear();
      // Clean IndexedDB database WorkoutTrackerDB completely to ensure a clean state
      const req = window.indexedDB.deleteDatabase('WorkoutTrackerDB');
      await new Promise((resolve) => {
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
        req.onblocked = () => resolve(true);
      });
    });
    await page.reload();
  });

  test('should switch to Test Workout Split, log a week of workouts, start new cycle, and check history', async ({
    page,
  }) => {
    // 1. Open settings panel
    await page.locator('button[title="Settings & Backups"]').click();

    // 2. Select "Test Workout Split" from the dropdown
    const select = page.locator('#program-select');
    await expect(select).toBeVisible();
    await select.selectOption('test_workout');

    // 3. Close settings panel
    await page.locator('button[title="Settings & Backups"]').click();

    // 4. Verify initial state of the selected program
    await expect(page.locator('.logo-section p')).toHaveText(/Cycle 1 • Week 1 • Day 1/);

    // Helper to log a single active day in the Test Workout Split
    const logActiveDay = async (dayNum: number, isSkip: boolean) => {
      // Find and click the active day card
      const activeCard = page.locator('.glass-panel-hover', { hasText: 'Active' });
      await activeCard.click();

      // Wait for session page to load
      await page
        .locator('button:has-text("Back to Dashboard"), button:has-text("Cancel")')
        .waitFor({ state: 'visible' });

      if (isSkip) {
        page.once('dialog', async (dialog) => {
          expect(dialog.message()).toContain('skip this workout day');
          await dialog.accept();
        });
        await page.locator('button:has-text("Skip Day")').click();
      } else {
        const saveBtn = page.locator('button:has-text("Save Workout Data")');
        const restBtn = page.locator('button:has-text("Mark Completed")');

        if (await restBtn.isVisible()) {
          await restBtn.click();
        } else if (await saveBtn.isVisible()) {
          // Fill in reps and weight
          const firstRepInput = page.locator('input[type="number"]').first();
          if (await firstRepInput.isVisible()) {
            await firstRepInput.fill('10');
            const firstWeightInput = page.locator('input[type="number"]').nth(1);
            if (await firstWeightInput.isVisible()) {
              await firstWeightInput.fill('20');
            }
          }
          await saveBtn.click();
        }
      }

      // Check if congratulations / start next cycle is triggered on Day 7 completion
      if (dayNum === 7 && !isSkip) {
        const startNextCycleBtn = page.locator('button:has-text("Start Cycle 2")');
        await startNextCycleBtn.waitFor({ state: 'visible' });
        await startNextCycleBtn.click();
        // Wait for redirect to new cycle dashboard
        await page.waitForURL(/#\/dashboard\/cycle\/2/);
      } else {
        // Wait for redirect back to dashboard
        await page.waitForURL(/#\/dashboard\/cycle\/\d+/);
      }
    };

    // Log the 7 days of the Test Workout Split program
    console.log('Logging Test Workout Split Days...');

    // Day 1: Test Push Day (Log it)
    await logActiveDay(1, false);

    // Day 2: Rest Day (Log it)
    await logActiveDay(2, false);

    // Day 3: Test Pull Day (Skip it)
    await logActiveDay(3, true);

    // Day 4: Rest Day (Log it)
    await logActiveDay(4, false);

    // Day 5: Test Legs Day (Log it)
    await logActiveDay(5, false);

    // Day 6: Rest Day (Log it)
    await logActiveDay(6, false);

    // Day 7: Rest Day (Log it -> Starts Cycle 2)
    await logActiveDay(7, false);

    // 5. Verify Cycle 2 has started
    await expect(page.locator('.logo-section p')).toHaveText(/Cycle 2 • Week 1 • Day 1/);

    // 6. Verify history shows Cycle 1 logs
    await page.locator('button:has-text("History")').click();
    await expect(page).toHaveURL(/#\/history/);

    const cycle1Panel = page.locator('.glass-panel', {
      has: page.locator('h3', { hasText: 'Cycle 1' }),
    });

    // Expand Cycle 1 history
    await cycle1Panel.locator('h3:has-text("Cycle 1")').click();

    // Check Day 1 status is Done
    const day1Card = cycle1Panel.locator('.glass-panel-hover', { hasText: 'Day 1' });
    await expect(day1Card.locator('.badge-green')).toHaveText('✓ Done');

    // Check Day 3 status is Skipped
    const day3Card = cycle1Panel.locator('.glass-panel-hover', { hasText: 'Day 3' });
    await expect(day3Card.locator('.badge-yellow')).toHaveText('Skipped');
  });
});
