import { test, expect } from '@playwright/test';

test.describe('P90X Tracker E2E Flow', () => {
  // Set high timeout since we are simulating 189 days of workouts purely through the UI
  test.setTimeout(300000);

  test.beforeEach(async ({ page }) => {
    // Navigate to local site
    await page.goto('/');

    // Clear localStorage to ensure clean state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('should log workouts, skip days, complete multiple cycles, and review history and charts', async ({
    page,
  }) => {
    // 1. Verify initial state (Cycle 1, Week 1, Day 1)
    await expect(page.locator('.logo-section p')).toHaveText(/Cycle 1 • Week 1 • Day 1/);

    // Helper to log a single active day
    const logActiveDay = async (cycleNum: number, dayNum: number, isSkip: boolean) => {
      // Find and click the active day card
      const activeCard = page.locator('.glass-panel-hover', { hasText: 'Active' });
      await activeCard.click();

      // Wait for session page unique back/cancel buttons to be visible (ensures React finished routing)
      await page
        .locator('button:has-text("Back to Dashboard"), button:has-text("Cancel")')
        .waitFor({ state: 'visible' });

      // Now h2 is unique and safe to assert
      await page.locator('h2').waitFor({ state: 'visible' });

      if (isSkip) {
        page.once('dialog', async (dialog) => {
          expect(dialog.message()).toContain('skip this workout day');
          await dialog.accept();
        });
        await page.locator('button:has-text("Skip Day")').click();
      } else {
        const saveBtn = page.locator('button:has-text("Save Workout Data")');
        const cardioBtn = page.locator('button:has-text("Mark Workout Completed")');
        const restBtn = page.locator('button:has-text("Mark Completed")');

        if (await restBtn.isVisible()) {
          await restBtn.click();
        } else if (await cardioBtn.isVisible()) {
          await cardioBtn.click();
        } else if (await saveBtn.isVisible()) {
          // Resistance workout: fill reps and weights for the first set of the first exercise
          const firstRepInput = page.locator('input[type="number"]').first();
          if (await firstRepInput.isVisible()) {
            const reps = cycleNum === 1 ? '12' : cycleNum === 2 ? '15' : '18';
            const weight = cycleNum === 1 ? '15' : cycleNum === 2 ? '20' : '25';

            await firstRepInput.fill(reps);
            const firstWeightInput = page.locator('input[type="number"]').nth(1);
            if (await firstWeightInput.isVisible()) {
              await firstWeightInput.fill(weight);
            }
          }
          await saveBtn.click();
        }
      }

      // Check if congratulations / start next cycle is triggered (on Day 91 completion)
      if (dayNum === 91 && !isSkip) {
        const startNextCycleBtn = page.locator(`button:has-text("Start Cycle ${cycleNum + 1}")`);
        await startNextCycleBtn.waitFor({ state: 'visible' });
        await startNextCycleBtn.click();
        // Wait for redirect to new cycle dashboard
        await page.waitForURL(new RegExp(`#/dashboard/cycle/${cycleNum + 1}`));
      } else {
        // Wait for redirect back to dashboard
        await page.waitForURL(/#\/dashboard\/cycle\/\d+/);
      }
    };

    // --- CYCLE 1 ---
    console.log('Logging Cycle 1...');
    for (let d = 1; d <= 91; d++) {
      const isSkip = d === 3;
      await logActiveDay(1, d, isSkip);
    }
    // Verify Cycle 2 has started
    await expect(page.locator('.logo-section p')).toHaveText(/Cycle 2 • Week 1 • Day 1/);

    // --- CYCLE 2 ---
    console.log('Logging Cycle 2...');
    for (let d = 1; d <= 91; d++) {
      const isSkip = d === 5;
      await logActiveDay(2, d, isSkip);
    }
    // Verify Cycle 3 has started
    await expect(page.locator('.logo-section p')).toHaveText(/Cycle 3 • Week 1 • Day 1/);

    // --- CYCLE 3 (Log first week) ---
    console.log('Logging Cycle 3 (Week 1)...');
    for (let d = 1; d <= 7; d++) {
      await logActiveDay(3, d, false);
    }
    // Verify progress is at Cycle 3, Week 2, Day 1
    await expect(page.locator('.logo-section p')).toHaveText(/Cycle 3 • Week 2 • Day 1/);

    // --- VERIFY HISTORICAL CYCLE DATA IN HISTORY TAB ---
    console.log('Verifying History page data...');
    // Click History tab
    await page.locator('button:has-text("History")').click();
    await expect(page).toHaveURL(/#\/history/);

    // Locate panels for each cycle to avoid cross-cycle ambiguity
    const cycle1Panel = page.locator('.glass-panel', {
      has: page.locator('h3', { hasText: 'Cycle 1' }),
    });
    const cycle2Panel = page.locator('.glass-panel', {
      has: page.locator('h3', { hasText: 'Cycle 2' }),
    });
    const cycle3Panel = page.locator('.glass-panel', {
      has: page.locator('h3', { hasText: 'Cycle 3' }),
    });

    // Expand Cycle 1
    await cycle1Panel.locator('h3:has-text("Cycle 1")').click();

    // Check Day 1 status (✓ Done, Logged: 12 Exercises)
    const cycle1Day1 = cycle1Panel.locator('.glass-panel-hover', { hasText: /\bDay 1(?!\d)/ });
    await expect(cycle1Day1.locator('.badge-green')).toHaveText('✓ Done');
    await expect(cycle1Day1).toContainText('Logged: 12 Exercises');

    // Check Day 3 status (Skipped)
    const cycle1Day3 = cycle1Panel.locator('.glass-panel-hover', { hasText: /\bDay 3(?!\d)/ });
    await expect(cycle1Day3.locator('.badge-yellow')).toHaveText('Skipped');

    // Click Day 1 to inspect inputs
    await cycle1Day1.click();
    await expect(page).toHaveURL(/#\/session\/cycle\/1\/week\/1\/day\/1/);
    await expect(page.locator('input[type="number"]').first()).toHaveValue('12');
    await page.locator('button:has-text("Cancel")').click();
    await page.locator('button:has-text("History")').click();
    await expect(page).toHaveURL(/#\/history/);

    // Expand Cycle 2
    await cycle2Panel.locator('h3:has-text("Cycle 2")').click();

    // Check Day 1 status
    const cycle2Day1 = cycle2Panel.locator('.glass-panel-hover', { hasText: /\bDay 1(?!\d)/ });
    await expect(cycle2Day1.locator('.badge-green')).toHaveText('✓ Done');

    // Check Day 5 status (Skipped)
    const cycle2Day5 = cycle2Panel.locator('.glass-panel-hover', { hasText: /\bDay 5(?!\d)/ });
    await expect(cycle2Day5.locator('.badge-yellow')).toHaveText('Skipped');

    // Click Day 1 to inspect inputs
    await cycle2Day1.click();
    await expect(page).toHaveURL(/#\/session\/cycle\/2\/week\/1\/day\/1/);
    await expect(page.locator('input[type="number"]').first()).toHaveValue('15');
    await page.locator('button:has-text("Cancel")').click();
    await page.locator('button:has-text("History")').click();
    await expect(page).toHaveURL(/#\/history/);

    // Expand Cycle 3
    await cycle3Panel.locator('h3:has-text("Cycle 3")').click();

    const cycle3Day1 = cycle3Panel.locator('.glass-panel-hover', { hasText: /\bDay 1(?!\d)/ });
    await expect(cycle3Day1.locator('.badge-green')).toHaveText('✓ Done');

    await cycle3Day1.click();
    await expect(page).toHaveURL(/#\/session\/cycle\/3\/week\/1\/day\/1/);
    await expect(page.locator('input[type="number"]').first()).toHaveValue('18');
    await page.locator('button:has-text("Cancel")').click();
    await page.locator('button:has-text("History")').click();
    await expect(page).toHaveURL(/#\/history/);

    // --- VERIFY PROGRESSION ANALYTICS CHARTS ---
    console.log('Verifying Analytics charts...');
    await page.locator('button:has-text("Analytics")').click();
    await expect(page).toHaveURL(/#\/analytics/);

    // Select routine and exercise
    await page.locator('select').first().selectOption('chest_and_back');
    // Standard push-ups should be auto-selected

    // Assert line chart canvas is visible
    const chartCanvas = page.locator('canvas');
    await expect(chartCanvas).toBeVisible();
  });
});
