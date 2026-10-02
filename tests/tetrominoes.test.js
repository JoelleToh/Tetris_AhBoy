// Feature: tetris-game
// Tests for the pure tetromino shape data in js/tetrominoes.js.
//
// Multiple test tasks target this file (2.2, 2.3, 2.4); each appends its own
// cases below rather than overwriting the others.

import { test, expect } from './harness.js';
import { forAll, genShape, genOrientation } from './prng.js';
import {
  SHAPES,
  TINTS,
  FALLBACK_COLORS,
  cellsFor,
  rotationCount,
} from '../js/tetrominoes.js';

// Feature: tetris-game, Property 8: Every tetromino orientation is exactly four connected cells
//
// For any of the 7 shapes and any of its rotation states, cellsFor(shape,
// rotationIndex) returns exactly four distinct cells forming a single
// edge-adjacent connected group.
//
// Validates: Requirements 2.2
test('Property 8: every tetromino orientation is exactly four connected cells', () => {
  forAll(
    (rng) => {
      const shape = genShape(rng);
      const rotationIndex = genOrientation(rng, shape);
      return { shape, rotationIndex };
    },
    ({ shape, rotationIndex }) => {
      const cells = cellsFor(shape, rotationIndex);

      // Exactly four cells.
      if (!Array.isArray(cells) || cells.length !== 4) return false;

      // Four distinct cells (no duplicate positions).
      const keys = cells.map((cell) => `${cell.r},${cell.c}`);
      const unique = new Set(keys);
      if (unique.size !== 4) return false;

      // Single edge-adjacent connected group: BFS from the first cell over
      // up/down/left/right neighbors must reach all four cells.
      const occupied = new Set(keys);
      const visited = new Set();
      const queue = [cells[0]];
      visited.add(`${cells[0].r},${cells[0].c}`);
      const neighbors = [
        { dr: -1, dc: 0 },
        { dr: 1, dc: 0 },
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 },
      ];
      while (queue.length > 0) {
        const current = queue.shift();
        for (const { dr, dc } of neighbors) {
          const nk = `${current.r + dr},${current.c + dc}`;
          if (occupied.has(nk) && !visited.has(nk)) {
            visited.add(nk);
            queue.push({ r: current.r + dr, c: current.c + dc });
          }
        }
      }

      // Connected iff BFS visited every occupied cell.
      return visited.size === 4;
    },
    { iterations: 200 },
  );
});

// Task 2.4 — Unit test: SHAPES contains exactly the 7 standard keys.
//
// Example-based assertion that Object.keys(SHAPES) is exactly the set
// { I, O, T, S, Z, J, L } — no more, no fewer.
//
// Validates: Requirements 2.1
test('SHAPES contains exactly the 7 standard tetromino keys', () => {
  const expectedKeys = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  const actualKeys = Object.keys(SHAPES);

  // Exactly 7 keys, no more and no fewer.
  expect(actualKeys.length).toBe(7);

  // Set equality: every expected key is present and no extra keys exist.
  const actualSet = new Set(actualKeys);
  expect(actualSet.size).toBe(7);
  for (const key of expectedKeys) {
    expect(actualSet.has(key)).toBe(true);
  }
});

// Feature: tetris-game, Property 22: Each shape has a distinct tint and a defined fallback color
//
// For any pair of distinct shapes, their tint colors differ (so the 7 pieces
// stay visually distinguishable), and every one of the 7 shapes has a defined
// (non-empty string) fallback solid color for when the Block_Image fails.
//
// Validates: Requirements 2.3, 19.5
test('Property 22: distinct shapes have distinct tints and every shape has a defined fallback color', () => {
  const normalize = (color) => String(color).trim().toLowerCase();

  forAll(
    (rng) => {
      const a = genShape(rng);
      const b = genShape(rng);
      return { a, b };
    },
    ({ a, b }) => {
      // Every one of the 7 shapes must have a defined fallback solid color.
      for (const key of Object.keys(SHAPES)) {
        const fallback = FALLBACK_COLORS[key];
        if (typeof fallback !== 'string' || fallback.trim() === '') return false;
      }

      // Distinct shapes must have distinct tint colors; identical shapes share one.
      const tintA = TINTS[a];
      const tintB = TINTS[b];
      if (typeof tintA !== 'string' || tintA.trim() === '') return false;
      if (typeof tintB !== 'string' || tintB.trim() === '') return false;

      if (a === b) {
        return normalize(tintA) === normalize(tintB);
      }
      return normalize(tintA) !== normalize(tintB);
    },
    { iterations: 150 },
  );
});
