import { expect, test, type Page } from '@playwright/test';

/**
 * One step of a case, as the HTML report shows it: the step's actions and
 * checks, then a screenshot of the page as the step left it, attached under
 * the step's name. `npm run test:browser:report` lists them in order.
 */
export async function step(
  page: Page,
  title: string,
  body: () => Promise<void>,
): Promise<void> {
  await test.step(title, async () => {
    await body();
    await test.info().attach(title, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });
}

// A person needs well over 300 ms to read a problem; faster right answers
// are not counted (docs/spec.md, section 4.2).
export const HUMAN_PAUSE_MS = 500;

/** The answer to the problem on screen, read from its data attributes. */
export async function answerOnScreen(page: Page): Promise<string> {
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

/** The player named at the top of the progress page. */
export async function expectPlayer(page: Page, name: string): Promise<void> {
  await expect(page.locator('p.player')).toContainText(name);
}

/** A digit that is not the first digit of the answer. */
export function wrongDigit(answer: string): string {
  return answer.startsWith('9') ? '8' : '9';
}

export function problemNumber(page: Page, n: number) {
  return page.getByText(`Problem ${n}`, { exact: true });
}

/** Types the answer to the problem on screen and presses Enter. */
export async function answerWithKeyboard(page: Page): Promise<void> {
  const answer = await answerOnScreen(page);
  await page.waitForTimeout(HUMAN_PAUSE_MS);
  await page.keyboard.type(answer);
  await page.keyboard.press('Enter');
}

/** Taps the answer to the problem on screen on the keypad, then OK. */
export async function answerWithKeypad(page: Page): Promise<void> {
  const answer = await answerOnScreen(page);
  await page.waitForTimeout(HUMAN_PAUSE_MS);
  for (const digit of answer) {
    await page.getByRole('button', { name: digit, exact: true }).tap();
  }
  await page.getByRole('button', { name: 'OK', exact: true }).tap();
}

/** Opens the app, creates a player and goes on to their progress page. */
export async function createPlayer(page: Page, name: string): Promise<void> {
  await step(page, `Create the player "${name}"`, async () => {
    await page.goto('/');
    await page.getByLabel('Your name').fill(name);
    await page.getByRole('button', { name: 'Create player' }).click();
    await expect(
      page.getByRole('heading', { name: `Welcome, ${name}` }),
    ).toBeVisible();
    await expect(page.getByTestId('player-key')).toBeVisible();
  });
  await step(page, 'Continue to the progress page', async () => {
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  });
}

/** Starts a round from the progress page or the result page. */
export async function startRound(
  page: Page,
  button: 'Start' | 'Play again' = 'Start',
): Promise<void> {
  await step(page, `${button}: a three-second countdown`, async () => {
    await page.getByRole('button', { name: button, exact: true }).click();
    await expect(page.locator('.countdown')).toHaveText(/^[123]$/);
  });
  await step(page, 'The first problem appears', async () => {
    await expect(page.getByTestId('problem')).toBeVisible({ timeout: 10_000 });
    await expect(problemNumber(page, 1)).toBeVisible();
    await expect(page.getByTestId('entry')).toHaveText('?');
  });
}

/** Waits out the round's 60 seconds until the server's result is shown. */
export async function waitForResult(page: Page, solved: number): Promise<void> {
  await step(
    page,
    `Wait for the 60 seconds to end: the server scores the round (${solved} solved)`,
    async () => {
      await expect(
        page.getByRole('heading', { name: `You solved ${solved}` }),
      ).toBeVisible({ timeout: 75_000 });
    },
  );
}

/**
 * Makes the page answer the next problem the moment it appears, far faster
 * than a person can: a right answer under 300 ms, which is not counted.
 */
export async function answerNextProblemInstantly(page: Page): Promise<void> {
  await page.evaluate(() => {
    const observer = new MutationObserver(() => {
      const problem = document.querySelector('[data-testid="problem"]');
      if (!problem) return;
      observer.disconnect();
      const a = Number(problem.getAttribute('data-a'));
      const b = Number(problem.getAttribute('data-b'));
      const operation = problem.getAttribute('data-operation');
      const answer =
        operation === 'add'
          ? a + b
          : operation === 'subtract'
            ? a - b
            : operation === 'multiply'
              ? a * b
              : a / b;
      for (const key of [...String(answer), 'Enter']) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

/** A browser cannot be told to hide a tab, so the page is told it is hidden. */
export async function hidePage(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}
