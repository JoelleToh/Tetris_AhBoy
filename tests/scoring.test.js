// Feature: tetris-game
// Tests for the pure scoring, level, and fall-speed functions in js/scoring.js.
//
// Multiple test tasks target this file (4.2, 4.3, 4.4, 4.5); each adds its own
// cases below rather than overwriting the others.

import { test, expect } from './harness.js';
import { forAll, makeRng } from './prng.js';
import { lineScore, levelForLines, fallSpeedForLevel } from '../js/scoring.js';

// Feature: tetris-game, Property 14: Line score is base-by-count times level
//
// For any level >= 1 and any cleared-row count n in {1, 2, 3, 4}, the points
// awarded equal the standard base for that count (1->100, 2->300, 3->500,
// 4->800) multiplied by the level.
//
// Validates: Requirements 11.2, 11.3, 11.4, 11.5
test('Property 14: line score is base-by-count times level', () => {
  const BASE_BY_COUNT = { 1: 100, 2: 300, 3: 500, 4: 800 };
  forAll(
    (rng) => {
      const level = rng.int(1, 50);
      const n = rng.int(1, 4);
      return { level, n };
    },
    ({ level, n }) => lineScore(n, level) === BASE_BY_COUNT[n] * level,
    { iterations: 200 },
  );
});

// Feature: tetris-game, Property 16: Level equals one plus floor(lines / 10)
//
// For any non-negative total of cleared lines, the level is exactly
// 1 + floor(linesCleared / 10).
//
// Validates: Requirement 12.5
test('Property 16: level equals one plus floor(lines / 10)', () => {
  forAll(
    (rng) => rng.int(0, 10000),
    (lines) => levelForLines(lines) === 1 + Math.floor(lines / 10),
    { iterations: 200 },
  );
});

// Feature: tetris-game, Property 17: Fall speed is strictly decreasing and bounded below
//
// For any level n >= 1: the fall interval is at least 1ms; the level-1 interval
// is exactly 1000ms; and whenever the interval at level n is above the 1ms
// floor, the interval at level n+1 is strictly less than it.
//
// Validates: Requirements 13.1, 13.2, 13.3
test('Property 17: fall speed is strictly decreasing and bounded below', () => {
  forAll(
    (rng) => rng.int(1, 60),
    (n) => {
      const speed = fallSpeedForLevel(n);
      if (!(speed >= 1)) return false;
      if (fallSpeedForLevel(1) !== 1000) return false;
      if (speed > 1 && !(fallSpeedForLevel(n + 1) < speed)) return false;
      return true;
    },
    { iterations: 200 },
  );
});

// Task 4.5: the level-1 fall interval is exactly 1000ms.
//
// Validates: Requirement 13.1
test('fallSpeedForLevel(1) is 1000ms', () => {
  expect(fallSpeedForLevel(1)).toBe(1000);
});
