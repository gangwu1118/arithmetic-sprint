import {
  ADD_RANGE,
  MULTIPLY_RANGE,
  OPERATIONS,
  PROBLEMS_PER_ROUND,
  type Operation,
} from './config.js';
import { randomInt, shuffled, type Random } from './random.js';

/** "a operation b": { a: 84, b: 7, operation: 'divide' } is 84 ÷ 7. */
export type Problem = { a: number; b: number; operation: Operation };

export function answerOf(problem: Problem): number {
  switch (problem.operation) {
    case 'add':
      return problem.a + problem.b;
    case 'subtract':
      return problem.a - problem.b;
    case 'multiply':
      return problem.a * problem.b;
    case 'divide':
      return problem.a / problem.b;
  }
}

function drawProblem(operation: Operation, random: Random): Problem {
  const range =
    operation === 'add' || operation === 'subtract'
      ? ADD_RANGE
      : MULTIPLY_RANGE;
  const x = randomInt(random, range.min, range.max);
  const y = randomInt(random, range.min, range.max);
  switch (operation) {
    case 'add':
    case 'multiply':
      return { a: x, b: y, operation };
    case 'subtract':
      // An addition in reverse: for x + y = s the problem is s - y.
      return { a: x + y, b: y, operation };
    case 'divide':
      // A multiplication in reverse: for x × y = p the problem is p ÷ y.
      return { a: x * y, b: y, operation };
  }
}

/**
 * The problems of one round, in blocks of four that hold one problem of each
 * operation in random order. Two problems in a row never share an operation,
 * so no problem repeats the one before it.
 */
export function generateProblems(random: Random): Problem[] {
  const problems: Problem[] = [];
  while (problems.length < PROBLEMS_PER_ROUND) {
    const order = shuffled(random, OPERATIONS);
    if (order[0] === problems.at(-1)?.operation) {
      // The block would start with the operation that ended the last one.
      // Swapping it with a random later place keeps every allowed order
      // equally likely.
      const j = randomInt(random, 1, order.length - 1);
      [order[0], order[j]] = [order[j], order[0]];
    }
    for (const operation of order)
      problems.push(drawProblem(operation, random));
  }
  return problems.slice(0, PROBLEMS_PER_ROUND);
}
