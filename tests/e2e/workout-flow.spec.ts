import { test, expect } from '@playwright/test';
import { setupStrictNetworkIsolation } from './network-isolation';

test.describe('Workout Tracker E2E Flow', () => {
  // Set reasonable timeout since we use fast-forwarding now
  test.setTimeout(60000);

  setupStrictNetworkIsolation();

  test.beforeEach(async ({ page }) => {
    // Listen for console logs/errors
    page.on('console', (msg) => {
      console.log(`[BROWSER ${msg.type()}]: ${msg.text()}`);
    });

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
    await expect(page.getByText(/Cycle 1 • Week 1 • Day 1/)).toBeVisible();

    // Helper to log a single active day
    const logActiveDay = async (cycleNum: number, dayNum: number, isSkip: boolean) => {
      // Find and click the active day card
      const activeCard = page.getByRole('button', { name: /Active/ });
      await activeCard.click();

      // Wait for session page unique back/cancel buttons to be visible (ensures React finished routing)
      await page
        .getByRole('button', { name: /Back to Dashboard|Cancel/ })
        .waitFor({ state: 'visible' });

      // Now h2 is unique and safe to assert
      await page.getByRole('heading', { level: 2 }).waitFor({ state: 'visible' });

      if (isSkip) {
        page.once('dialog', async (dialog) => {
          expect(dialog.message()).toContain('skip this workout day');
          await dialog.accept();
        });
        await page.getByRole('button', { name: 'Skip Day' }).click();
      } else {
        const saveBtn = page.getByRole('button', { name: 'Save Workout Data' });
        const cardioBtn = page.getByRole('button', { name: 'Mark Workout Completed' });
        const restBtn = page.getByRole('button', { name: 'Mark Completed' });

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
        const startNextCycleBtn = page.getByRole('button', { name: `Start Cycle ${cycleNum + 1}` });
        await startNextCycleBtn.waitFor({ state: 'visible' });
        await startNextCycleBtn.click();
        // Wait for redirect to new cycle dashboard
        await page.waitForURL(new RegExp(`#/dashboard/cycle/${cycleNum + 1}`));
      } else {
        // Wait for redirect back to dashboard
        await page.waitForURL(/#\/dashboard\/cycle\/\d+/);
      }

      // Wait for dashboard cards to be fully rendered in the DOM
      await page
        .getByRole('button', { name: /Day \d+/ })
        .first()
        .waitFor({ state: 'visible' });
    };

    // Helper to fast-forward to a future day from the dashboard
    const fastForwardToFutureDay = async (cycleNum: number, dayNum: number) => {
      const weekNum = Math.ceil(dayNum / 7);
      const dayOfWeek = dayNum % 7 === 0 ? 7 : dayNum % 7;

      // Navigate to the target session page directly by changing location hash
      await page.evaluate((hash) => {
        window.location.hash = hash;
      }, `#/session/cycle/${cycleNum}/week/${weekNum}/day/${dayOfWeek}`);

      // Wait for session page to load
      await page
        .getByRole('button', { name: /Back to Dashboard|Cancel/ })
        .waitFor({ state: 'visible' });

      // Handle the skip confirmation dialog
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('skip all workouts up to');
        await dialog.accept();
      });

      // Click Skip to this Day button
      await page.getByRole('button', { name: 'Skip to this Day' }).click();

      // Wait for redirect back to dashboard
      await page.waitForURL(new RegExp(`#/dashboard/cycle/${cycleNum}`));
      await page
        .getByRole('button', { name: /Day \d+/ })
        .first()
        .waitFor({ state: 'visible' });
    };

    // --- CYCLE 1 ---
    console.log('Logging Cycle 1...');
    await logActiveDay(1, 1, false); // Log Day 1 (Resistance)
    await logActiveDay(1, 2, false); // Log Day 2 (Cardio)
    await logActiveDay(1, 3, true); // Skip Day 3 (Manual Skip flow)

    // Fast forward to Day 90 (Cardio - Yoga X)
    console.log('Fast forwarding to Day 90...');
    await fastForwardToFutureDay(1, 90);
    await logActiveDay(1, 90, false); // Log Day 90 (Cardio)
    await logActiveDay(1, 91, false); // Log Day 91 (Rest / Start Cycle 2)

    // Verify Cycle 2 has started
    await expect(page.getByText(/Cycle 2 • Week 1 • Day 1/)).toBeVisible();

    // --- CYCLE 2 ---
    console.log('Logging Cycle 2...');
    await logActiveDay(2, 1, false); // Log Day 1 (Resistance)
    await logActiveDay(2, 2, false); // Log Day 2 (Cardio)
    await logActiveDay(2, 3, true); // Skip Day 3

    // Fast forward to Day 90 (Cardio - Yoga X)
    console.log('Fast forwarding to Day 90...');
    await fastForwardToFutureDay(2, 90);
    await logActiveDay(2, 90, false); // Log Day 90 (Cardio)
    await logActiveDay(2, 91, false); // Log Day 91 (Rest / Start Cycle 3)

    // Verify Cycle 3 has started
    await expect(page.getByText(/Cycle 3 • Week 1 • Day 1/)).toBeVisible();

    // --- CYCLE 3 ---
    console.log('Logging Cycle 3...');
    await logActiveDay(3, 1, false); // Log Day 1 (Resistance)
    await logActiveDay(3, 2, false); // Log Day 2 (Cardio)
    await logActiveDay(3, 3, true); // Skip Day 3

    // Fast forward to Day 6 (Cardio - Kenpo X)
    console.log('Fast forwarding to Day 6...');
    await fastForwardToFutureDay(3, 6);
    await logActiveDay(3, 6, false); // Log Day 6 (Cardio)
    await logActiveDay(3, 7, false); // Log Day 7 (Rest)

    // Verify progress is at Cycle 3, Week 2, Day 1
    await expect(page.getByText(/Cycle 3 • Week 2 • Day 1/)).toBeVisible();

    // --- VERIFY HISTORICAL CYCLE DATA IN HISTORY TAB ---
    console.log('Verifying History page data...');
    // Click History tab
    await page.getByRole('button', { name: 'History' }).click();
    await expect(page).toHaveURL(/#\/history/);

    // Locate panels for each cycle to avoid cross-cycle ambiguity
    const cycle1Panel = page.locator('.glass-panel', {
      has: page.getByRole('heading', { name: 'Cycle 1' }),
    });
    const cycle2Panel = page.locator('.glass-panel', {
      has: page.getByRole('heading', { name: 'Cycle 2' }),
    });
    const cycle3Panel = page.locator('.glass-panel', {
      has: page.getByRole('heading', { name: 'Cycle 3' }),
    });

    // Expand Cycle 1
    await cycle1Panel.getByRole('button', { name: 'Cycle 1' }).click();

    // Check Day 1 status (✓ Done, Logged: 12 Exercises)
    const cycle1Day1 = cycle1Panel.getByRole('button', { name: /Day 1\b/ });
    await expect(cycle1Day1.getByText('✓ Done')).toBeVisible();
    await expect(cycle1Day1).toContainText('Logged: 12 Exercises');

    // Check Day 3 status (Skipped)
    const cycle1Day3 = cycle1Panel.getByRole('button', { name: /Day 3\b/ });
    await expect(cycle1Day3.getByText('Skipped', { exact: true })).toBeVisible();

    // Click Day 1 to inspect inputs
    await cycle1Day1.click();
    await expect(page).toHaveURL(/#\/session\/cycle\/1\/week\/1\/day\/1/);
    await expect(page.locator('input[type="number"]').first()).toHaveValue('12');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'History' }).click();
    await expect(page).toHaveURL(/#\/history/);

    // Expand Cycle 2
    await cycle2Panel.getByRole('button', { name: 'Cycle 2' }).click();

    // Check Day 1 status
    const cycle2Day1 = cycle2Panel.getByRole('button', { name: /Day 1\b/ });
    await expect(cycle2Day1.getByText('✓ Done')).toBeVisible();

    // Check Day 3 status (Skipped)
    const cycle2Day3 = cycle2Panel.getByRole('button', { name: /Day 3\b/ });
    await expect(cycle2Day3.getByText('Skipped', { exact: true })).toBeVisible();

    // Click Day 1 to inspect inputs
    await cycle2Day1.click();
    await expect(page).toHaveURL(/#\/session\/cycle\/2\/week\/1\/day\/1/);
    await expect(page.locator('input[type="number"]').first()).toHaveValue('15');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'History' }).click();
    await expect(page).toHaveURL(/#\/history/);

    // Expand Cycle 3
    await cycle3Panel.getByRole('button', { name: 'Cycle 3' }).click();

    const cycle3Day1 = cycle3Panel.getByRole('button', { name: /Day 1\b/ });
    await expect(cycle3Day1.getByText('✓ Done')).toBeVisible();

    await cycle3Day1.click();
    await expect(page).toHaveURL(/#\/session\/cycle\/3\/week\/1\/day\/1/);
    await expect(page.locator('input[type="number"]').first()).toHaveValue('18');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'History' }).click();
    await expect(page).toHaveURL(/#\/history/);

    // --- VERIFY PROGRESSION ANALYTICS CHARTS ---
    console.log('Verifying Analytics charts...');
    await page.getByRole('button', { name: 'Analytics' }).click();
    await expect(page).toHaveURL(/#\/analytics/);

    // Select routine and exercise
    await page.getByRole('combobox').first().selectOption('chest_and_back');
    // Standard push-ups should be auto-selected

    // Assert line chart canvas is visible
    const chartCanvas = page.locator('canvas');
    await expect(chartCanvas).toBeVisible();
  });
});
