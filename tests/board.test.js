// Feature: tetris-game
// Tests for the pure board operations in js/board.js.
//
// Multiple test tasks target this file (3.2, 3.3, 3.5, 3.6, 3.7, 3.8); each
// appends its own cases below rather than overwriting the others.

import { test, expect } from './harness.js';
import {
  forAll,
  genBoard,
  genBoardWithFullRows,
  genActivePiece,
  pieceCells,
} from './prng.js';
import {
  createBoard,
  isValidPosition,
  inBounds,
  lockPiece,
  dropPosition,
  findFullRows,
  clearRows,
} from '../js/board.js';

// Feature: tetris-game, Property 1: Collision predicate is correct
//
// For any board and any set of piece cells (including out-of-bounds ones),
// isValidPosition(board, cells) returns true iff every cell has
// 0 <= c <= 9 and r <= 19, and no cell within rows 0..19 lands on a settled
// block. The test computes an independent oracle and compares it against the
// implementation.
//
// Validates: Requirements 8.1, 8.2, 8.3, 1.5
test('Property 1: collision predicate is correct', () => {
  forAll(
    (rng) => {
      // Random board with some settled blocks, occasionally with full rows.
      const board = genBoard(rng, {
        fill: rng.next() * 0.6,
        fullRowCount: rng.bool(0.3) ? rng.int(1, 3) : 0,
      });

      // A set of piece cells that may fall outside the field so the predicate
      // is exercised on out-of-bounds inputs too.
      const piece = genActivePiece(rng, { allowOutOfBounds: true });
      const cells = pieceCells(piece);
      return { board, cells };
    },
    ({ board, cells }) => {
      // Independent oracle: a position is valid iff every cell satisfies the
      // bounds predicate (0 <= c <= 9 and r <= 19) and no cell that lands
      // within the tracked rows 0..19 coincides with a settled block.
      const oracle = cells.every(({ r, c }) => {
        const withinBounds = c >= 0 && c <= 9 && r <= 19;
        if (!withinBounds) return false;
        if (r >= 0 && r <= 19 && board[r][c] !== null) return false;
        return true;
      });

      const actual = isValidPosition(board, cells);
      return actual === oracle;
    },
    { iterations: 200 },
  );
});

// Example-based sanity checks on the bounds predicate used by the property.
test('inBounds accepts in-field cells and open rows above the top', () => {
  expect(inBounds(0, 0)).toBe(true);
  expect(inBounds(19, 9)).toBe(true);
  expect(inBounds(-3, 4)).toBe(true); // rows above the top are open for spawn math
  expect(inBounds(20, 0)).toBe(false); // below the field
  expect(inBounds(5, -1)).toBe(false); // left of the field
  expect(inBounds(5, 10)).toBe(false); // right of the field
});

// Example-based unit test (task 3.3): the default board is exactly 20 rows by
// 10 columns, every cell starts empty (null), and the grid holds 200 cells.
//
// Validates: Requirements 1.1
test('createBoard returns a 20x10 grid of 200 empty cells', () => {
  const board = createBoard();

  // Exactly 20 rows tall.
  expect(board.length).toBe(20);

  // Each row is exactly 10 columns wide and every cell is empty (null).
  let totalCells = 0;
  for (const row of board) {
    expect(row.length).toBe(10);
    for (const cell of row) {
      expect(cell).toBe(null);
    }
    totalCells += row.length;
  }

  // 20 rows x 10 columns = 200 cells total.
  expect(totalCells).toBe(200);
});

// Helpers shared by the locking / line-clear properties below.

/** Count occupied (non-null) cells across the whole board. */
function countOccupied(board) {
  let n = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell !== null) n += 1;
    }
  }
  return n;
}

/** Clear a piece's cells on the board (mutates `board`) so a lock has room. */
function clearPieceCells(board, cells) {
  for (const { r, c } of cells) {
    if (r >= 0 && r < board.length && c >= 0 && c < board[r].length) {
      board[r][c] = null;
    }
  }
}

// Feature: tetris-game, Property 5: Locking adds exactly four occupied cells
//
// For any board and any in-bounds active piece whose four cells are currently
// empty, lockPiece returns a board whose occupied-cell count is exactly four
// greater than the input. The four target cells become occupied (set to the
// locked shape key) and every other cell is left unchanged. The generator
// produces an in-bounds piece and clears its four cells on the board first so
// the "four empty cells" precondition always holds.
//
// Validates: Requirements 9.3
test('Property 5: locking adds exactly four occupied cells', () => {
  forAll(
    (rng) => {
      const board = genBoard(rng, {
        fill: rng.next() * 0.6,
        fullRowCount: rng.bool(0.3) ? rng.int(1, 3) : 0,
      });
      // In-bounds piece (every cell within rows 0..19, cols 0..9).
      const piece = genActivePiece(rng);
      const cells = pieceCells(piece);
      // Ensure the four target cells are empty so the lock genuinely adds four.
      clearPieceCells(board, cells);
      return { board, cells, key: piece.key };
    },
    ({ board, cells, key }) => {
      const before = countOccupied(board);
      const next = lockPiece(board, cells, key);
      const after = countOccupied(next);

      // Exactly four new occupied cells.
      if (after !== before + 4) return false;

      // The four target cells hold the locked shape key.
      const targets = new Set(cells.map(({ r, c }) => `${r},${c}`));
      for (const { r, c } of cells) {
        if (next[r][c] !== key) return false;
      }

      // Every non-target cell is unchanged from the input board.
      for (let r = 0; r < next.length; r++) {
        for (let c = 0; c < next[r].length; c++) {
          if (targets.has(`${r},${c}`)) continue;
          if (next[r][c] !== board[r][c]) return false;
        }
      }
      return true;
    },
    { iterations: 200 },
  );
});

// Feature: tetris-game, Property 11: findFullRows identifies exactly the complete rows
//
// For any board, findFullRows returns exactly the indices of rows in which all
// ten cells are non-null, in ascending order, and no others. The property
// compares the implementation against an independent oracle computed directly
// from the board. genBoard occasionally engineers some full rows so both the
// "full" and "not full" cases are exercised.
//
// Validates: Requirements 10.1
test('Property 11: findFullRows identifies exactly the complete rows', () => {
  forAll(
    (rng) => {
      return genBoard(rng, {
        fill: rng.next() * 0.9,
        fullRowCount: rng.bool(0.5) ? rng.int(1, 4) : 0,
      });
    },
    (board) => {
      // Independent oracle: a row is full iff all ten cells are non-null.
      const oracle = [];
      for (let r = 0; r < board.length; r++) {
        if (board[r].every((cell) => cell !== null)) oracle.push(r);
      }

      const actual = findFullRows(board);

      // Same length and same ascending contents.
      if (actual.length !== oracle.length) return false;
      for (let i = 0; i < oracle.length; i++) {
        if (actual[i] !== oracle[i]) return false;
      }
      return true;
    },
    { iterations: 200 },
  );
});

// Feature: tetris-game, Property 12: Clearing with no full rows is a no-op
//
// For any board that contains NO fully occupied row,
// clearRows(board, findFullRows(board)) returns a board deep-equal to the
// input with cleared === 0. The generator nulls out one cell per row whenever
// a row happens to be full, guaranteeing the "no full rows" precondition.
//
// Validates: Requirements 10.2
test('Property 12: clearing with no full rows is a no-op', () => {
  forAll(
    (rng) => {
      const board = genBoard(rng, { fill: rng.next() * 0.95 });
      // Guarantee no row is completely full: punch a hole in any full row.
      for (let r = 0; r < board.length; r++) {
        if (board[r].every((cell) => cell !== null)) {
          board[r][rng.int(0, board[r].length - 1)] = null;
        }
      }
      return board;
    },
    (board) => {
      // Precondition sanity: no full rows should remain.
      const full = findFullRows(board);
      if (full.length !== 0) return false;

      const { board: next, cleared } = clearRows(board, full);
      if (cleared !== 0) return false;

      // Deep-equal to the input (same dimensions and every cell identical).
      if (next.length !== board.length) return false;
      for (let r = 0; r < board.length; r++) {
        if (next[r].length !== board[r].length) return false;
        for (let c = 0; c < board[r].length; c++) {
          if (next[r][c] !== board[r][c]) return false;
        }
      }
      return true;
    },
    { iterations: 200 },
  );
});

// Feature: tetris-game, Property 13: Line clear conserves surviving blocks and
// removes exactly 10 per cleared row
//
// For any board, after clearRows(board, findFullRows(board)):
//   - the result board is still 20x10;
//   - the total occupied-cell count equals the original minus
//     10 * (number of cleared rows); and
//   - the multiset of blocks NOT belonging to any cleared row is preserved.
// genBoardWithFullRows engineers at least one full row so clears actually run.
//
// Validates: Requirements 10.3, 10.4
test('Property 13: line clear conserves surviving blocks and removes 10 per row', () => {
  forAll(
    (rng) => {
      return genBoardWithFullRows(rng, {
        fill: rng.next() * 0.6,
        fullRowCount: rng.int(1, 4),
      });
    },
    (board) => {
      const full = findFullRows(board);
      const fullSet = new Set(full);

      // Multiset of blocks that are NOT in any cleared row (survivors).
      const survivorCounts = new Map();
      let survivorTotal = 0;
      for (let r = 0; r < board.length; r++) {
        if (fullSet.has(r)) continue;
        for (const cell of board[r]) {
          if (cell !== null) {
            survivorCounts.set(cell, (survivorCounts.get(cell) || 0) + 1);
            survivorTotal += 1;
          }
        }
      }

      const originalOccupied = countOccupied(board);
      const { board: next, cleared } = clearRows(board, full);

      // Dimensions preserved: still 20 rows x 10 cols.
      if (next.length !== 20) return false;
      for (const row of next) {
        if (row.length !== 10) return false;
      }

      // Number of cleared rows matches the full-row count.
      if (cleared !== full.length) return false;

      // Occupied count drops by exactly 10 per cleared row.
      const afterOccupied = countOccupied(next);
      if (afterOccupied !== originalOccupied - 10 * cleared) return false;

      // The multiset of surviving blocks is preserved exactly.
      const resultCounts = new Map();
      let resultTotal = 0;
      for (const row of next) {
        for (const cell of row) {
          if (cell !== null) {
            resultCounts.set(cell, (resultCounts.get(cell) || 0) + 1);
            resultTotal += 1;
          }
        }
      }
      if (resultTotal !== survivorTotal) return false;
      if (resultCounts.size !== survivorCounts.size) return false;
      for (const [key, cnt] of survivorCounts) {
        if (resultCounts.get(key) !== cnt) return false;
      }
      return true;
    },
    { iterations: 200 },
  );
});
