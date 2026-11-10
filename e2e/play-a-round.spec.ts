import { expect, test, type Page } from '@playwright/test';

/** The answer to the problem on screen, read from its data attributes. */
async function answerOnScreen(page: Page): Promise<string> {
  const problem = page.getByTestId('problem');
  const a = Number(await problem.getAttribute('data-a'));
  const b = Number(await problem.getAttribute('data-b'));
  switch (await problem.getAttribute('data-operation')) {
    case 'add':
      return String(a + b);
    case 'subtract':
      return String(a - b);
    case 'multiply':
      return String(a * b);
    default:
      return String(a / b);
  }
}

// A person needs well over 300 ms to read a problem; faster right answers
// are not counted (docs/spec.md, section 4.2).
const HUMAN_PAUSE_MS = 500;

test('a new player plays a round with the keyboard and the keypad, and sees it in their progress', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Your name').fill('Browser test');
  await page.getByRole('button', { name: 'Create player' }).click();
  await expect(page.getByTestId('player-key')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('problem')).toBeVisible({ timeout: 10_000 });

  // Criterion 21: two answers with the keyboard...
  for (const next of [2, 3]) {
    const answer = await answerOnScreen(page);
    await page.waitForTimeout(HUMAN_PAUSE_MS);
    await page.keyboard.type(answer);
    await page.keyboard.press('Enter');
    await expect(
      page.getByText(`Problem ${next}`, { exact: true }),
    ).toBeVisible();
  }

  // ...a wrong one, which keeps the problem...
  const right = await answerOnScreen(page);
  await page.keyboard.type(String(Number(right) + 1));
  await page.keyboard.press('Enter');
  await expect(page.getByText('Not quite. Try again.')).toBeVisible();

  // ...and two with the on-screen keypad.
  for (const next of [4, 5]) {
    const answer = await answerOnScreen(page);
    await page.waitForTimeout(HUMAN_PAUSE_MS);
    for (const digit of answer) {
      await page.getByRole('button', { name: digit, exact: true }).click();
    }
    await page.getByRole('button', { name: 'OK', exact: true }).click();
    await expect(
      page.getByText(`Problem ${next}`, { exact: true }),
    ).toBeVisible();
  }

  // The round ends after its 60 seconds, and the server scores it.
  await expect(page.getByRole('heading', { name: 'You solved 4' })).toBeVisible(
    { timeout: 70_000 },
  );
  await expect(page.getByText('1 mistake.')).toBeVisible();
  await expect(
    page.getByText('Your first round: your usual pace starts here.'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Back to progress' }).click();
  await expect(page.getByText('1 of 3 days')).toBeVisible();
  await expect(page.getByText('problems a minute, usually')).toBeVisible();
  // Three answers by keyboard, two by keypad: a keyboard round.
  await expect(page.getByRole('cell', { name: 'Keyboard' })).toHaveCount(1);
  await expect(
    page.getByRole('columnheader', { name: 'Usual pace' }),
  ).toBeVisible();
});

test('criterion 23: sample players are labelled, and the score is explained', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open Alex (sample)' }).click();

  await expect(page.getByText('Sample data', { exact: true })).toBeVisible();
  await expect(
    page.getByText('they are not a measure of intelligence or health'),
  ).toBeVisible();
});

test('criterion 22: a hidden page abandons the round, and nothing is saved', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Your name').fill('Hidden page test');
  await page.getByRole('button', { name: 'Create player' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('problem')).toBeVisible({ timeout: 10_000 });

  // A change of visibility that leaves the page visible changes nothing.
  await page.evaluate(() =>
    document.dispatchEvent(new Event('visibilitychange')),
  );
  await expect(page.getByTestId('problem')).toBeVisible();

  // A browser cannot be told to hide a tab, so the page is told it is hidden.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });

  await expect(
    page.getByText('The round stopped because the page was hidden.'),
  ).toBeVisible();
  await expect(
    page.getByText('Play your first round to see your pace.'),
  ).toBeVisible();
  await expect(page.getByText('0 of 3 days')).toBeVisible();
});
