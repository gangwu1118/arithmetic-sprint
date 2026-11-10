import { describe, expect, it } from 'vitest';
import type { Operation } from './config.js';
import { answerOf, generateProblems, type Problem } from './problems.js';
import { seededRandom } from './random.js';

const SEEDS = [1, 2, 3, 42, 2026, 99_999];

function roundFor(seed: number): Problem[] {
  return generateProblems(seededRandom(seed));
}

/** The problems of many rounds, to see everything the generator produces. */
function manyProblems(): Problem[] {
  const all: Problem[] = [];
  for (let seed = 1; seed <= 50; seed += 1) all.push(...roundFor(seed));
  return all;
}

function ofOperation(problems: Problem[], operation: Operation): Problem[] {
  return problems.filter((problem) => problem.operation === operation);
}

function wholeNumbers(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function sortedValues(values: Iterable<number>): number[] {
  return [...new Set(values)].sort((x, y) => x - y);
}

describe('criterion 1: 120 problems, in blocks of one of each operation', () => {
  it.each(SEEDS)('seed %i', (seed) => {
    const problems = roundFor(seed);

    expect(problems).toHaveLength(120);
    for (let start = 0; start < 120; start += 4) {
      const operations = problems
        .slice(start, start + 4)
        .map((problem) => problem.operation)
        .sort();
      expect(operations).toEqual(['add', 'divide', 'multiply', 'subtract']);
    }
  });
});

describe('criterion 2: the numbers and the answers', () => {
  const problems = manyProblems();

  it('adds two numbers from 2 to 50, and uses all of them', () => {
    const additions = ofOperation(problems, 'add');

    expect(sortedValues(additions.flatMap((p) => [p.a, p.b]))).toEqual(
      wholeNumbers(2, 50),
    );
  });

  it('subtracts as an addition in reverse: s - y = x, with x and y from 2 to 50', () => {
    const subtractions = ofOperation(problems, 'subtract');

    expect(sortedValues(subtractions.map((p) => p.b))).toEqual(
      wholeNumbers(2, 50),
    );
    expect(sortedValues(subtractions.map((p) => p.a - p.b))).toEqual(
      wholeNumbers(2, 50),
    );
  });

  it('multiplies two numbers from 2 to 12, and uses all of them', () => {
    const multiplications = ofOperation(problems, 'multiply');

    expect(sortedValues(multiplications.flatMap((p) => [p.a, p.b]))).toEqual(
      wholeNumbers(2, 12),
    );
  });

  it('divides as a multiplication in reverse: p / y = x, with x and y from 2 to 12', () => {
    const divisions = ofOperation(problems, 'divide');

    expect(divisions.filter((p) => p.a % p.b !== 0)).toEqual([]);
    expect(sortedValues(divisions.map((p) => p.b))).toEqual(
      wholeNumbers(2, 12),
    );
    expect(sortedValues(divisions.map((p) => p.a / p.b))).toEqual(
      wholeNumbers(2, 12),
    );
  });

  it('works out the answer to each operation', () => {
    expect(answerOf({ a: 37, b: 48, operation: 'add' })).toBe(85);
    expect(answerOf({ a: 73, b: 28, operation: 'subtract' })).toBe(45);
    expect(answerOf({ a: 7, b: 8, operation: 'multiply' })).toBe(56);
    expect(answerOf({ a: 84, b: 7, operation: 'divide' })).toBe(12);
  });

  it('gives every problem a whole-number answer of at least 2', () => {
    const answers = problems.map(answerOf);

    expect(answers.filter((x) => !Number.isInteger(x) || x < 2)).toEqual([]);
  });
});

describe('criterion 3: two problems in a row never share an operation, so none repeats the one before', () => {
  it.each(SEEDS)('seed %i', (seed) => {
    const problems = roundFor(seed);
    const sameOperationAsBefore = problems.filter(
      (problem, i) => i > 0 && problem.operation === problems[i - 1].operation,
    );

    expect(sameOperationAsBefore).toEqual([]);
  });
});

describe('criterion 4: the same random source gives the same problems', () => {
  it('repeats exactly for the same seed', () => {
    expect(roundFor(7)).toEqual(roundFor(7));
  });

  it('differs for another seed', () => {
    expect(roundFor(7)).not.toEqual(roundFor(8));
  });
});
