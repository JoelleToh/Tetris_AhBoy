// Feature: tetris-game
// Minimal in-browser test registry + assertions for the Tetris test suite.
//
// This is a zero-dependency, zero-build harness. Test files import `test`,
// `suite`, and the `assert`/`expect` helpers below to register cases, then the
// browser runner (test-runner.html) imports every `*.test.js` module (which
// registers its cases as a side effect of being imported) and calls `run()` to
// execute them, printing pass/fail to the page and the console.
//
// Convention for a `*.test.js` file:
//
//   import { test, expect } from './harness.js';
//   import { forAll, makeRng, genBoard } from './prng.js';
//   import { isValidPosition } from '../js/board.js';
//
//   test('isValidPosition rejects out-of-bounds cells', () => {
//     expect(isValidPosition(someBoard, [{ r: 20, c: 0 }])).toBe(false);
//   });
//
// Property tests use the same `test()` registration and call `forAll(...)`
// from prng.js inside the body; `forAll` throws on the first counterexample,
// which the runner reports as a failure.

/**
 * @typedef {object} TestCase
 * @property {string} name - fully qualified test name (suite + case).
 * @property {() => void | Promise<void>} fn - test body; throws on failure.
 */

/** @type {TestCase[]} */
const registry = [];

// Track an optional current suite name so `test()` calls can be grouped.
let currentSuite = '';

/**
 * Group related tests under a label. The callback registers tests with
 * `test(...)`; their reported names are prefixed with the suite label.
 *
 * @param {string} name
 * @param {() => void} fn
 */
export function suite(name, fn) {
  const previous = currentSuite;
  currentSuite = previous ? `${previous} > ${name}` : String(name);
  try {
    fn();
  } finally {
    currentSuite = previous;
  }
}

/**
 * Register a single test case. The body should throw (or return a rejected
 * promise) to signal failure; returning normally means the test passed.
 *
 * @param {string} name
 * @param {() => void | Promise<void>} fn
 */
export function test(name, fn) {
  if (typeof fn !== 'function') {
    throw new Error(`test("${name}", fn): fn must be a function`);
  }
  const fullName = currentSuite ? `${currentSuite} > ${name}` : String(name);
  registry.push({ name: fullName, fn });
}

/** Clear all registered tests (used by the runner between full runs). */
export function reset() {
  registry.length = 0;
}

/** How many tests are currently registered. */
export function count() {
  return registry.length;
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

export class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AssertionError';
  }
}

function stringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

/**
 * Bare assertion: throws AssertionError when `condition` is falsy.
 *
 * @param {any} condition
 * @param {string} [message]
 */
export function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new AssertionError(message);
  }
}

/**
 * Tiny expectation wrapper giving readable failure messages. Covers only what
 * the suite needs; add matchers here as tests require them.
 *
 * @param {any} actual
 */
export function expect(actual) {
  return {
    toBe(expected) {
      if (!Object.is(actual, expected)) {
        throw new AssertionError(
          `expected ${stringify(actual)} to be ${stringify(expected)}`,
        );
      }
    },
    toEqual(expected) {
      if (!deepEqual(actual, expected)) {
        throw new AssertionError(
          `expected ${stringify(actual)} to deeply equal ${stringify(expected)}`,
        );
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new AssertionError(`expected ${stringify(actual)} to be truthy`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new AssertionError(`expected ${stringify(actual)} to be falsy`);
      }
    },
    toBeCloseTo(expected, digits = 2) {
      const tolerance = Math.pow(10, -digits) / 2;
      if (Math.abs(actual - expected) > tolerance) {
        throw new AssertionError(
          `expected ${stringify(actual)} to be close to ${stringify(expected)} (±${tolerance})`,
        );
      }
    },
    toThrow() {
      if (typeof actual !== 'function') {
        throw new AssertionError('expect(fn).toThrow() requires a function');
      }
      let threw = false;
      try {
        actual();
      } catch {
        threw = true;
      }
      if (!threw) {
        throw new AssertionError('expected function to throw');
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/**
 * @typedef {object} RunResult
 * @property {number} total
 * @property {number} passed
 * @property {number} failed
 * @property {Array<{ name: string, ok: boolean, error?: Error, ms: number }>} cases
 */

/**
 * Execute all registered tests in registration order.
 *
 * @param {(entry: { name: string, ok: boolean, error?: Error, ms: number }) => void} [onCase]
 *   optional callback fired after each case completes (for live reporting).
 * @returns {Promise<RunResult>}
 */
export async function run(onCase) {
  const cases = [];
  let passed = 0;
  let failed = 0;

  for (const { name, fn } of registry) {
    const start = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    let ok = true;
    let error;
    try {
      await fn();
    } catch (err) {
      ok = false;
      error = err instanceof Error ? err : new Error(String(err));
    }
    const end = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const entry = { name, ok, error, ms: end - start };
    if (ok) passed += 1;
    else failed += 1;
    cases.push(entry);
    if (typeof onCase === 'function') onCase(entry);
  }

  return { total: cases.length, passed, failed, cases };
}
