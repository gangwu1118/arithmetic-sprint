import { expect, test } from '@playwright/test';
import {
  answerWithKeyboard,
  createPlayer,
  problemNumber,
  startRound,
  step,
} from './support.ts';

// What the player sees when a request fails. The failures are made in the
// browser, by intercepting the request, so the server never sees them.

test('says so when the server cannot be reached', async ({ page }) => {
  await step(page, 'The request to create a player fails', async () => {
    await page.route('**/api/players', (route) => route.abort());
    await page.goto('/');
    await page.getByLabel('Your name').fill('Offline');
    await page.getByRole('button', { name: 'Create player' }).click();
  });
  await step(page, 'The player is told, and stays on the page', async () => {
    await expect(
      page.getByText('The server could not be reached.'),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Create player' }),
    ).toBeEnabled();
  });
});

test('says how to fix it when the sample players are missing', async ({
  page,
}) => {
  await step(
    page,
    'The server does not know the sample key, as in an unseeded database',
    async () => {
      await page.route('**/api/me', (route) =>
        route.fulfill({
          status: 401,
          json: {
            code: 'unauthorized',
            message: 'A valid player key is required.',
          },
        }),
      );
      await page.goto('/');
      await page.getByRole('button', { name: 'Open Alex (sample)' }).click();
    },
  );
  await step(page, 'The player is told to run npm run seed', async () => {
    await expect(
      page.getByText(
        'The sample players are not in the database. Run npm run seed.',
      ),
    ).toBeVisible();
  });
});

test('a round that cannot start leaves the player on the progress page with the reason', async ({
  page,
}) => {
  await createPlayer(page, 'No start');
  await step(page, 'Starting a round fails on the server', async () => {
    await page.route('**/api/rounds', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 503,
            json: { code: 'unavailable', message: 'Try again in a moment.' },
          })
        : route.continue(),
    );
    await page.getByRole('button', { name: 'Start' }).click();
  });
  await step(page, 'The reason is shown, and Start works again', async () => {
    await expect(page.getByText('Try again in a moment.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled();
  });
});

test('answers that cannot be saved are reported, and nothing is kept', async ({
  page,
}) => {
  await createPlayer(page, 'Not saved');
  await step(page, 'Sending the result will fail', async () => {
    await page.route('**/api/rounds/*/result', (route) => route.abort());
  });
  await startRound(page);
  await step(page, 'Problem 1: answer it', async () => {
    await answerWithKeyboard(page);
    await expect(problemNumber(page, 2)).toBeVisible();
  });
  await step(
    page,
    'Wait for the 60 seconds to end: the result cannot be sent',
    async () => {
      await expect(
        page.getByText(
          'Your answers could not be saved: The server could not be reached.',
        ),
      ).toBeVisible({ timeout: 75_000 });
    },
  );
  await step(page, 'Nothing was saved: no round, no day', async () => {
    await expect(
      page.getByText('Play your first round to see your pace.'),
    ).toBeVisible();
    await expect(page.getByText('0 of 3 days')).toBeVisible();
  });
});
