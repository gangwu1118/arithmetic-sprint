import { expect, test } from '@playwright/test';
import { createPlayer, expectPlayer, step } from './support.ts';

// Choosing who plays: creating a player, the key shown once, the players
// this browser remembers, adding one by key, and names the server refuses.

test('a new player: the key is shown once, and the progress page starts empty', async ({
  page,
}) => {
  await step(page, 'Open the app: no players in this browser yet', async () => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Arithmetic sprint' }),
    ).toBeVisible();
    await expect(page.getByText('Players in this browser')).toBeHidden();
    await expect(
      page.getByRole('button', { name: 'Open Alex (sample)' }),
    ).toBeVisible();
  });
  await createPlayer(page, 'New player');
  await step(page, 'The progress page has nothing to show yet', async () => {
    await expectPlayer(page, 'New player');
    await expect(
      page.getByText('Play your first round to see your pace.'),
    ).toBeVisible();
    await expect(page.getByText('0 of 3 days')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Where the time goes' }),
    ).toBeHidden();
    await expect(
      page.getByRole('heading', { name: 'Recent rounds' }),
    ).toBeHidden();
  });
  await step(
    page,
    'Switch player: the browser remembers the player, and the key is not shown again',
    async () => {
      await page.getByRole('button', { name: 'Switch player' }).click();
      await expect(
        page.getByRole('button', { name: 'Continue as New player' }),
      ).toBeVisible();
      await expect(page.getByTestId('player-key')).toBeHidden();
    },
  );
});

test('the key shown once is 43 characters, and the browser keeps it', async ({
  page,
  browser,
  baseURL,
}) => {
  let key = '';
  await step(page, 'Create a player and read the key', async () => {
    await page.goto('/');
    await page.getByLabel('Your name').fill('Key reader');
    await page.getByRole('button', { name: 'Create player' }).click();
    key = (await page.getByTestId('player-key').textContent()) ?? '';
    // 32 random bytes in base64url.
    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
  await step(
    page,
    'The key opens the same player in another browser',
    async () => {
      const other = await browser.newContext({ baseURL });
      try {
        const otherPage = await other.newPage();
        await otherPage.goto('/');
        await otherPage.getByLabel('Player key').fill(key);
        await otherPage.getByRole('button', { name: 'Add player' }).click();
        await expectPlayer(otherPage, 'Key reader');
      } finally {
        await other.close();
      }
    },
  );
});

test('refuses a name made only of spaces', async ({ page }) => {
  await step(page, 'Type three spaces as the name and create', async () => {
    await page.goto('/');
    await page.getByLabel('Your name').fill('   ');
    await page.getByRole('button', { name: 'Create player' }).click();
  });
  await step(page, 'The server refuses it, and no player is made', async () => {
    await expect(page.getByText('The request is not valid.')).toBeVisible();
    await expect(page.getByTestId('player-key')).toBeHidden();
  });
});

test('a name stops at 40 characters while typing', async ({ page }) => {
  await step(page, 'Type 45 characters into the name', async () => {
    await page.goto('/');
    await page.getByLabel('Your name').pressSequentially('x'.repeat(45));
    await expect(page.getByLabel('Your name')).toHaveValue('x'.repeat(40));
  });
});

test('the players this browser remembers: continue as one, or forget one', async ({
  page,
}) => {
  await createPlayer(page, 'First');
  await createPlayer(page, 'Second');
  await step(page, 'Switch player: both are listed', async () => {
    await page.getByRole('button', { name: 'Switch player' }).click();
    await expect(
      page.getByRole('button', { name: 'Continue as First' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Continue as Second' }),
    ).toBeVisible();
  });
  await step(page, 'Continue as First', async () => {
    await page.getByRole('button', { name: 'Continue as First' }).click();
    await expectPlayer(page, 'First');
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  });
  await step(page, 'Switch player and forget First', async () => {
    await page.getByRole('button', { name: 'Switch player' }).click();
    await page
      .getByRole('listitem')
      .filter({ hasText: 'Continue as First' })
      .getByRole('button', { name: 'Forget' })
      .click();
    await expect(
      page.getByRole('button', { name: 'Continue as First' }),
    ).toBeHidden();
    await expect(
      page.getByRole('button', { name: 'Continue as Second' }),
    ).toBeVisible();
  });
});

test('adds a player by key, and refuses a key that nobody has', async ({
  page,
}) => {
  await step(page, "Add Alex by the sample player's key", async () => {
    await page.goto('/');
    await page.getByLabel('Player key').fill('sample-player-alex');
    await page.getByRole('button', { name: 'Add player' }).click();
    await expectPlayer(page, 'Alex (sample)');
    await expect(page.getByText('Sample data', { exact: true })).toBeVisible();
  });
  await step(page, 'Switch player and try a key nobody has', async () => {
    await page.getByRole('button', { name: 'Switch player' }).click();
    await page.getByLabel('Player key').fill('no-such-key');
    await page.getByRole('button', { name: 'Add player' }).click();
    await expect(page.getByText('No player has that key.')).toBeVisible();
  });
});

test("each browser sees only its own player's rounds", async ({
  page,
  browser,
  baseURL,
}) => {
  await step(page, 'One browser opens Alex, with 22 rounds', async () => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open Alex (sample)' }).click();
    await expect(
      page.getByRole('img', { name: /^Scores of your last 22 rounds/ }),
    ).toBeVisible();
  });
  await step(
    page,
    'Another browser makes a new player, who sees none of them',
    async () => {
      const other = await browser.newContext({ baseURL });
      try {
        const otherPage = await other.newPage();
        await createPlayer(otherPage, 'Someone else');
        await expect(
          otherPage.getByText('Play your first round to see your pace.'),
        ).toBeVisible();
        await expect(
          otherPage.getByRole('heading', { name: 'Recent rounds' }),
        ).toBeHidden();
      } finally {
        await other.close();
      }
    },
  );
});
