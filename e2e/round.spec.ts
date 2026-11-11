import { expect, test } from '@playwright/test';
import {
  answerNextProblemInstantly,
  answerOnScreen,
  answerWithKeyboard,
  answerWithKeypad,
  createPlayer,
  hidePage,
  HUMAN_PAUSE_MS,
  problemNumber,
  startRound,
  step,
  waitForResult,
  wrongDigit,
} from './support.ts';

// Playing a round: the keyboard alone, touch alone, a second round, a page
// that is hidden, and what the keyboard ignores. A round lasts 60 seconds by
// the server's clock, so the cases that finish one take over a minute.

test('criterion 21: a round with the keyboard alone, with an edit and a mistake, then the result and the progress', async ({
  page,
}) => {
  await createPlayer(page, 'Keyboard player');
  await startRound(page);
  await step(page, 'Problem 1: type the answer and press Enter', async () => {
    await answerWithKeyboard(page);
    await expect(problemNumber(page, 2)).toBeVisible();
  });
  await step(
    page,
    'Problem 2: a wrong digit, Backspace, then the answer',
    async () => {
      const answer = await answerOnScreen(page);
      await page.waitForTimeout(HUMAN_PAUSE_MS);
      await page.keyboard.type(wrongDigit(answer));
      await expect(page.getByTestId('entry')).toHaveText(wrongDigit(answer));
      await page.keyboard.press('Backspace');
      await expect(page.getByTestId('entry')).toHaveText('?');
      await page.keyboard.type(answer);
      await page.keyboard.press('Enter');
      await expect(problemNumber(page, 3)).toBeVisible();
    },
  );
  await step(
    page,
    'Problem 3: a wrong answer is a mistake, and the problem stays',
    async () => {
      const right = await answerOnScreen(page);
      await page.waitForTimeout(HUMAN_PAUSE_MS);
      await page.keyboard.type(String(Number(right) + 1));
      await page.keyboard.press('Enter');
      await expect(page.getByText('Not quite. Try again.')).toBeVisible();
      await expect(problemNumber(page, 3)).toBeVisible();
      await expect(page.getByTestId('entry')).toHaveText('?');
    },
  );
  await step(page, 'Problem 3 again: the right answer moves on', async () => {
    await answerWithKeyboard(page);
    await expect(problemNumber(page, 4)).toBeVisible();
  });
  await step(page, 'Problem 4: one more right answer', async () => {
    await answerWithKeyboard(page);
    await expect(problemNumber(page, 5)).toBeVisible();
  });
  await waitForResult(page, 4);
  await step(
    page,
    'The result: the score, the mistake, the slowest problems and the time per operation',
    async () => {
      await expect(page.getByText('in 60 seconds')).toBeVisible();
      await expect(
        page.getByText('Your first round: your usual pace starts here.'),
      ).toBeVisible();
      await expect(page.getByText('1 mistake.', { exact: true })).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Your slowest problems' }),
      ).toBeVisible();
      await expect(page.locator('ul.slowest > li')).toHaveCount(3);
      // The first four problems are one of each operation.
      await expect(page.getByRole('cell', { name: '1 solved' })).toHaveCount(4);
    },
  );
  await step(
    page,
    'Back to progress: today counts, and the round is listed as a keyboard round',
    async () => {
      await page.getByRole('button', { name: 'Back to progress' }).click();
      await expect(page.getByText('1 of 3 days')).toBeVisible();
      await expect(page.getByText('problems a minute, usually')).toBeVisible();
      await expect(
        page.getByText('Your change shows after 10 rounds: 9 to go.'),
      ).toBeVisible();
      await expect(
        page.getByRole('img', {
          name: 'Scores of your last 1 rounds. Your usual pace is now 4.',
        }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Where the time goes' }),
      ).toBeVisible();
      await expect(page.getByRole('cell', { name: 'Keyboard' })).toHaveCount(1);
      await expect(
        page.getByRole('columnheader', { name: 'Usual pace' }),
      ).toBeVisible();
    },
  );
});

test.describe('on a phone', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('criterion 21: a round by touch alone, with the delete key, then a keypad round in the progress', async ({
    page,
  }) => {
    await createPlayer(page, 'Touch player');
    await startRound(page);
    await step(page, 'Problem 1: tap the digits, then OK', async () => {
      await answerWithKeypad(page);
      await expect(problemNumber(page, 2)).toBeVisible();
    });
    await step(
      page,
      'Problem 2: tap a wrong digit, delete it, then tap the answer',
      async () => {
        const answer = await answerOnScreen(page);
        await page.waitForTimeout(HUMAN_PAUSE_MS);
        await page
          .getByRole('button', { name: wrongDigit(answer), exact: true })
          .tap();
        await expect(page.getByTestId('entry')).toHaveText(wrongDigit(answer));
        await page.getByRole('button', { name: 'Delete' }).tap();
        await expect(page.getByTestId('entry')).toHaveText('?');
        for (const digit of answer) {
          await page.getByRole('button', { name: digit, exact: true }).tap();
        }
        await page.getByRole('button', { name: 'OK', exact: true }).tap();
        await expect(problemNumber(page, 3)).toBeVisible();
      },
    );
    await step(page, 'Problem 3: tap the answer', async () => {
      await answerWithKeypad(page);
      await expect(problemNumber(page, 4)).toBeVisible();
    });
    await waitForResult(page, 3);
    await step(
      page,
      'Back to progress: a keypad round, drawn as a filled dot',
      async () => {
        await page.getByRole('button', { name: 'Back to progress' }).tap();
        await expect(page.getByRole('cell', { name: 'Keypad' })).toHaveCount(1);
        await expect(page.locator('circle.keypad-round')).toHaveCount(1);
      },
    );
  });
});

test('a second round is compared with the usual pace, and an answer under 300 ms is not counted', async ({
  page,
}) => {
  await createPlayer(page, 'Two rounds');
  await startRound(page);
  for (const n of [1, 2, 3]) {
    await step(page, `Round 1, problem ${n}: answer it`, async () => {
      await answerWithKeyboard(page);
      await expect(problemNumber(page, n + 1)).toBeVisible();
    });
  }
  await waitForResult(page, 3);
  await step(page, 'The first result starts the usual pace', async () => {
    await expect(
      page.getByText('Your first round: your usual pace starts here.'),
    ).toBeVisible();
  });
  await step(
    page,
    'Play again, and answer the first problem the moment it appears',
    async () => {
      await answerNextProblemInstantly(page);
      await page.getByRole('button', { name: 'Play again' }).click();
      // The instant answer was right, so the round moves on.
      await expect(problemNumber(page, 2)).toBeVisible({ timeout: 10_000 });
    },
  );
  for (const n of [2, 3]) {
    await step(page, `Round 2, problem ${n}: answer it`, async () => {
      await answerWithKeyboard(page);
      await expect(problemNumber(page, n + 1)).toBeVisible();
    });
  }
  // Problems 2 and 3 count; the instant answer to problem 1 does not.
  await waitForResult(page, 2);
  await step(
    page,
    'The second result: compared with the usual pace, and the instant answer not counted',
    async () => {
      await expect(
        page.getByText('Your usual pace was 3 and is now 2.5.'),
      ).toBeVisible();
      await expect(
        page.getByText(
          '1 answered faster than anyone can read a problem, so not counted.',
        ),
      ).toBeVisible();
    },
  );
  await step(page, 'Back to progress: two rounds today', async () => {
    await page.getByRole('button', { name: 'Back to progress' }).click();
    await expect(page.getByRole('cell', { name: 'Keyboard' })).toHaveCount(2);
    await expect(
      page.getByText('Your change shows after 10 rounds: 8 to go.'),
    ).toBeVisible();
  });
});

test('criterion 22: a hidden page abandons the round, and nothing is saved', async ({
  page,
}) => {
  await createPlayer(page, 'Hidden page');
  await startRound(page);
  await step(
    page,
    'A visibility change that leaves the page visible changes nothing',
    async () => {
      await page.evaluate(() =>
        document.dispatchEvent(new Event('visibilitychange')),
      );
      await expect(page.getByTestId('problem')).toBeVisible();
    },
  );
  await step(
    page,
    'The page is hidden: the round stops and the player is told why',
    async () => {
      await hidePage(page);
      await expect(
        page.getByText(
          'The round stopped because the page was hidden. Nothing was saved.',
        ),
      ).toBeVisible();
    },
  );
  await step(page, 'Nothing was saved: no round, no day', async () => {
    await expect(
      page.getByText('Play your first round to see your pace.'),
    ).toBeVisible();
    await expect(page.getByText('0 of 3 days')).toBeVisible();
  });
});

test('the keyboard: shortcuts and held keys type nothing, an empty Enter is no mistake, and an answer stops at four digits', async ({
  page,
}) => {
  await createPlayer(page, 'Keys');
  await startRound(page);
  await step(page, 'Ctrl+5 and Cmd+5 are left to the browser', async () => {
    await page.keyboard.press('Control+5');
    await page.keyboard.press('Meta+5');
    await expect(page.getByTestId('entry')).toHaveText('?');
  });
  await step(page, 'A held key does not repeat', async () => {
    await page.evaluate(() =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: '7', repeat: true }),
      ),
    );
    await expect(page.getByTestId('entry')).toHaveText('?');
  });
  await step(page, 'Enter with no answer is not a mistake', async () => {
    await page.keyboard.press('Enter');
    await expect(page.getByText('Not quite. Try again.')).toBeHidden();
    await expect(problemNumber(page, 1)).toBeVisible();
  });
  await step(page, 'An answer stops at four digits', async () => {
    await page.keyboard.type('12345');
    await expect(page.getByTestId('entry')).toHaveText('1234');
  });
});
