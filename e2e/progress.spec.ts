import { expect, test } from '@playwright/test';
import { expectPlayer, step } from './support.ts';

// The progress page, on the two sample players. Their histories are seeded
// afresh for every run (e2e/prepare-database.ts), so the numbers are fixed:
// the scores come from a seeded simulation, and only the dates move.

test('criterion 23: a sample player is labelled, and the progress page explains the score', async ({
  page,
}) => {
  await step(page, 'Open Alex (sample)', async () => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open Alex (sample)' }).click();
    await expectPlayer(page, 'Alex (sample)');
  });
  await step(
    page,
    'Sample data is labelled twice: a badge and a notice',
    async () => {
      await expect(
        page.getByText('Sample data', { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(
          'Sample data: these rounds were simulated by the set-up script. Nobody played them.',
        ),
      ).toBeVisible();
    },
  );
  await step(page, 'This week: seven days and a goal of three', async () => {
    await expect(
      page.getByRole('heading', { name: 'This week' }),
    ).toBeVisible();
    await expect(page.locator('ol.week > li')).toHaveCount(7);
    await expect(page.getByText(/^\d of 3 days$/)).toBeVisible();
  });
  await step(
    page,
    'Usual pace: 23 problems a minute, 6 more than the first five rounds',
    async () => {
      await expect(page.getByText('problems a minute, usually')).toBeVisible();
      await expect(
        page.getByText(
          'The median of your last 5 rounds. +6 since your first 5 (17).',
        ),
      ).toBeVisible();
    },
  );
  await step(
    page,
    'The chart: a dot per round, hollow for keyboard rounds, and the usual pace as a line',
    async () => {
      await expect(
        page.getByRole('img', {
          name: 'Scores of your last 22 rounds. Your usual pace is now 23.',
        }),
      ).toBeVisible();
      await expect(page.locator('circle.dot')).toHaveCount(22);
      await expect(page.locator('circle.keypad-round')).toHaveCount(0);
      await expect(
        page.getByText('hollow for the keyboard, filled for the keypad'),
      ).toBeVisible();
    },
  );
  await step(page, 'What the score means, in words', async () => {
    await expect(
      page.getByText(
        'This shows practice at mental arithmetic. Scores rise with practice; they are not a measure of intelligence or health.',
      ),
    ).toBeVisible();
  });
  await step(
    page,
    'Where the time goes: seconds per problem for each operation',
    async () => {
      await expect(
        page.getByRole('heading', { name: 'Where the time goes' }),
      ).toBeVisible();
      for (const operation of [
        'Addition',
        'Subtraction',
        'Multiplication',
        'Division',
      ]) {
        await expect(
          page.getByRole('rowheader', { name: operation }),
        ).toBeVisible();
      }
    },
  );
  await step(
    page,
    'Recent rounds: all 22, with the usual pace at each and the input',
    async () => {
      const table = page.getByRole('table').filter({
        has: page.getByRole('columnheader', { name: 'Usual pace' }),
      });
      // The header row, then one row per round.
      await expect(table.getByRole('row')).toHaveCount(23);
      await expect(table.getByRole('cell', { name: 'Keyboard' })).toHaveCount(
        22,
      );
    },
  );
});

test('a player with fewer than ten rounds sees how many are left before a change', async ({
  page,
}) => {
  await step(page, 'Open Sam (sample), who played seven rounds', async () => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open Sam (sample)' }).click();
    await expectPlayer(page, 'Sam (sample)');
  });
  await step(page, 'No change yet: three rounds to go', async () => {
    await expect(
      page.getByText('Your change shows after 10 rounds: 3 to go.'),
    ).toBeVisible();
  });
  await step(
    page,
    'Sam plays on a keypad: every dot is filled, every round says Keypad',
    async () => {
      await expect(
        page.getByRole('img', { name: /^Scores of your last 7 rounds/ }),
      ).toBeVisible();
      await expect(page.locator('circle.keypad-round')).toHaveCount(7);
      await expect(page.getByRole('cell', { name: 'Keypad' })).toHaveCount(7);
    },
  );
});
