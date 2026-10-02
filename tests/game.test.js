// Feature: tetris-game
// Tests for the pure game-state machine in js/game.js.
//
// Multiple test tasks target this file (6.2, 6.3, 6.4, and later 6.6–6.15);
// each appends its own cases below rather than overwriting the others. Keep new
// cases self-contained and import any additional helpers at the top.

import { test, expect } from './harness.js';
import {
  forAll,
  makeRng,
  genGameState,
  genActivePiece,
  genBoardWithFullRows,
  pieceCells,
} from './prng.js';
import {
  newGame,
  spawn,
  spawnPiece,
  activeCells,
  tryMove,
  tryRotate,
  softDrop,
  hardDrop,
  stepDown,
  lockAndResolve,
  pause,
  resume,
  restart,
  applyIntent,
  KEYS,
} from '../js/game.js';
import { SHAPES, rotationCount, cellsFor } from '../js/tetrominoes.js';
import {
  createBoard,
  lockPiece,
  findFullRows,
  isValidPosition,
  dropPosition,
} from '../js/board.js';

// The 7 standard shape keys. Object.keys(SHAPES) and KEYS agree on this set.
const VALID_KEYS = Object.keys(SHAPES);
const VALID_KEY_SET = new Set(VALID_KEYS);

// Feature: tetris-game, Property 9: Spawned and next shapes are always valid shape keys
//
// For any random seed, the shape chosen for spawning and the `next` preview
// shape are always one of the 7 standard keys (I, O, T, S, Z, J, L). After any
// spawn, `next` is refreshed to a valid key and the newly active piece's key is
// also valid.
//
// Validates: Requirements 2.4, 3.3, 16.1, 16.2
test('Property 9: spawned and next shapes are always valid shape keys', () => {
  forAll(
    (rng) => {
      // A deterministic, seeded piece source that only ever draws valid keys.
      const draw = () => VALID_KEYS[rng.int(0, VALID_KEYS.length - 1)];
      return newGame(draw);
    },
    (state) => {
      // Initial game: active and next must both be valid keys.
      if (!VALID_KEY_SET.has(state.active.key)) return false;
      if (!VALID_KEY_SET.has(state.next)) return false;

      // After a spawn, the newly active piece and the refreshed next preview
      // must still be valid keys.
      const spawned = spawn(state);
      if (!VALID_KEY_SET.has(spawned.active.key)) return false;
      if (!VALID_KEY_SET.has(spawned.next)) return false;

      // KEYS (the module export) must agree with Object.keys(SHAPES).
      return KEYS.length === VALID_KEYS.length &&
        KEYS.every((k) => VALID_KEY_SET.has(k));
    },
    { iterations: 100 },
  );
});

// Feature: tetris-game, Property 10: Overlapping spawn triggers game over
//
// For any board whose cells at a shape's spawn position are already occupied by
// settled blocks, spawning that shape transitions the game to 'gameover'. We
// build a state whose `next` shape's spawn cells are pre-filled (computed via
// spawnPiece(next) and settled with lockPiece), then call spawn(state) and
// assert the status becomes 'gameover'.
//
// Validates: Requirements 3.4, 14.1
test('Property 10: overlapping spawn triggers game over', () => {
  forAll(
    (rng) => {
      // Pick the shape that will be moved into `active` on the next spawn.
      const nextKey = KEYS[rng.int(0, KEYS.length - 1)];
      // Compute that shape's spawn cells and pre-fill them with settled blocks
      // so the spawn position is guaranteed to overlap.
      const spawnCells = activeCells(spawnPiece(nextKey));
      const blockedBoard = lockPiece(createBoard(), spawnCells, nextKey);

      // Build a minimal playing state whose `next` is the blocked shape. The
      // current active piece is irrelevant to the spawn transition.
      const state = {
        board: blockedBoard,
        active: spawnPiece(KEYS[rng.int(0, KEYS.length - 1)]),
        next: nextKey,
        score: 0,
        level: 1,
        linesCleared: 0,
        status: 'playing',
        fallSpeedMs: 1000,
        _draw: () => KEYS[rng.int(0, KEYS.length - 1)],
      };
      return state;
    },
    (state) => {
      const spawned = spawn(state);
      return spawned.status === 'gameover';
    },
    { iterations: 100 },
  );
});

// Unit test (task 6.4): newGame initial values.
//
// newGame() returns score 0, level 1, linesCleared 0, status 'playing', and a
// defined `next` that is a valid shape key.
//
// Validates: Requirements 11.1, 12.1, 16.1
test('newGame initial values', () => {
  const state = newGame();

  expect(state.score).toBe(0);
  expect(state.level).toBe(1);
  expect(state.linesCleared).toBe(0);
  expect(state.status).toBe('playing');

  // `next` is defined and is one of the 7 valid shape keys.
  expect(typeof state.next).toBe('string');
  expect(VALID_KEY_SET.has(state.next)).toBe(true);
});

// The full set of Intent strings that applyIntent accepts.
const INTENTS = [
  'moveLeft',
  'moveRight',
  'softDrop',
  'hardDrop',
  'rotate',
  'stepDown',
  'pauseToggle',
  'restart',
];

// Build a valid, playing GameState: generate one with the spawn area cleared,
// then regenerate (deriving a fresh seed) until the active piece sits in a
// genuinely valid position. Returns the state once it is valid.
function validPlayingState(rng) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const state = genGameState(makeRng(rng.int(1, 2 ** 30)), {
      status: 'playing',
      clearSpawnArea: true,
    });
    if (isValidPosition(state.board, activeCells(state.active))) {
      return state;
    }
  }
  // Fallback: an empty board guarantees validity.
  const state = genGameState(makeRng(rng.int(1, 2 ** 30)), {
    status: 'playing',
    fill: 0,
    clearSpawnArea: true,
  });
  return state;
}

// Feature: tetris-game, Property 2: The active piece is always in a valid position
//
// For any reachable GameState whose active piece starts valid, and any Intent,
// after applyIntent(state, intent) the resulting active piece — if the status
// is still 'playing' — occupies only in-bounds cells and never overlaps a
// settled block. No move, rotation, soft/hard drop, or auto step leaves the
// active piece in an invalid position.
//
// Validates: Requirements 4.3, 7.3, 8.4
test('Property 2: active piece is always in a valid position', () => {
  forAll(
    (rng) => {
      const state = validPlayingState(rng);
      const intent = INTENTS[rng.int(0, INTENTS.length - 1)];
      return { state, intent };
    },
    ({ state, intent }) => {
      const result = applyIntent(state, intent);
      // Only constrain the active piece while play continues; a lock+spawn or
      // game-over transition is governed by other properties.
      if (result.status !== 'playing') return true;
      return isValidPosition(result.board, activeCells(result.active));
    },
    { iterations: 150 },
  );
});

// Feature: tetris-game, Property 3: A valid single step moves exactly one cell in one direction
//
// For a GameState where a one-step move (left, right, or down) is valid,
// applying that move changes the active piece's position by exactly one column
// (left/right) or one row (down), leaves the other coordinate and the rotation
// unchanged, and leaves the board unchanged.
//
// Validates: Requirements 4.1, 4.2, 5.1, 9.1
test('Property 3: a valid single step moves exactly one cell', () => {
  forAll(
    (rng) => {
      const state = validPlayingState(rng);
      // Candidate single-step directions: left, right, down.
      const dirs = [
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 },
        { dr: 1, dc: 0 },
      ];
      const dir = dirs[rng.int(0, dirs.length - 1)];
      return { state, dir };
    },
    ({ state, dir }) => {
      const before = state.active;
      const moved = tryMove(state, dir.dr, dir.dc);

      // Only assert the exactly-one-cell semantics when the move was legal
      // (i.e. tryMove actually produced a changed state). An invalid move is a
      // no-op and is covered by Property 2 / collision handling.
      if (moved === state) return true;

      const after = moved.active;
      // Exactly the chosen delta applied; the other coordinate is unchanged.
      if (after.row !== before.row + dir.dr) return false;
      if (after.col !== before.col + dir.dc) return false;
      // Rotation and shape are untouched by a translation.
      if (after.rotationIndex !== before.rotationIndex) return false;
      if (after.key !== before.key) return false;
      // The board is not modified by a plain move.
      if (moved.board !== state.board) return false;
      return true;
    },
    { iterations: 150 },
  );
});

// Feature: tetris-game, Property 4: Blocked downward movement locks the piece
//
// For a GameState where moving the active piece down one row is invalid (it
// rests on the floor or on a settled block), applying stepDown converts the
// active piece's current four cells into settled blocks on the board at their
// current positions. (lockAndResolve then spawns a new piece, so we verify the
// pre-lock cells are now non-null in the resulting board.)
//
// Validates: Requirements 5.2, 6.2, 9.2
test('Property 4: blocked downward movement locks the piece', () => {
  forAll(
    (rng) => {
      // Start from a valid playing state, then hard-drop its coordinates down
      // to the resting position so the next downward step is guaranteed
      // invalid. We compute the rested piece directly (without locking) so we
      // know the exact pre-lock cells.
      const base = validPlayingState(rng);
      const d = dropPosition(base.board, activeCells(base.active));
      const rested = {
        ...base,
        active: { ...base.active, row: base.active.row + d },
      };
      return rested;
    },
    (state) => {
      const restingCells = activeCells(state.active);

      // Precondition: moving down one more row must be invalid.
      const downOne = restingCells.map(({ r, c }) => ({ r: r + 1, c }));
      if (isValidPosition(state.board, downOne)) {
        // Not actually blocked (e.g. a degenerate generated state); skip.
        return true;
      }

      const result = stepDown(state);

      // Every pre-lock cell that falls inside the tracked grid must now be a
      // settled block (non-null) in the resulting board.
      for (const { r, c } of restingCells) {
        if (r < 0 || r > 19 || c < 0 || c > 9) continue;
        if (result.board[r][c] === null) return false;
      }
      return true;
    },
    { iterations: 150 },
  );
});

// Feature: tetris-game, Property 6: Hard drop lands at the lowest valid position
//
// For any GameState with a valid active piece, the hard-drop resting position
// is valid and one row below it is invalid: with d = dropPosition(board, cells),
// shifting the piece down by d is a valid position and shifting it down by d + 1
// is invalid (it would pass the floor or overlap a settled block).
//
// Validates: Requirements 6.1
test('Property 6: hard drop lands at the lowest valid position', () => {
  forAll(
    (rng) => validPlayingState(rng),
    (state) => {
      const cells = activeCells(state.active);
      const d = dropPosition(state.board, cells);

      const atRest = cells.map(({ r, c }) => ({ r: r + d, c }));
      const belowRest = cells.map(({ r, c }) => ({ r: r + d + 1, c }));

      // The resting position is valid, and one row lower is not.
      if (!isValidPosition(state.board, atRest)) return false;
      if (isValidPosition(state.board, belowRest)) return false;
      return true;
    },
    { iterations: 150 },
  );
});

// Feature: tetris-game, Property 7: Rotation is a cycle (four rotations return to origin)
//
// On an empty board with the piece centered a few rows down (so every
// intermediate orientation is unobstructed), applying tryRotate a number of
// times equal to the shape's orientation count returns the active piece to its
// original orientation and cells. For a single-orientation shape (O), a single
// tryRotate leaves the orientation and cells unchanged. A valid rotation
// advances rotationIndex by exactly one modulo the orientation count.
//
// Validates: Requirements 7.1, 7.2
test('Property 7: rotation is a cycle', () => {
  forAll(
    (rng) => {
      // Pick any shape and start orientation; place it centered on an empty
      // board a few rows down so all four orientations fit without collision.
      const piece = genActivePiece(rng);
      const key = piece.key;
      const state = {
        board: createBoard(),
        active: { key, rotationIndex: piece.rotationIndex, row: 5, col: 3 },
        next: key,
        score: 0,
        level: 1,
        linesCleared: 0,
        status: 'playing',
        fallSpeedMs: 1000,
        _draw: () => key,
      };
      return state;
    },
    (state) => {
      const key = state.active.key;
      const count = rotationCount(key);
      const originalCells = activeCells(state.active);
      const originalIndex = state.active.rotationIndex;

      // Single-orientation shape (O): one rotate is an exact no-op.
      if (count <= 1) {
        const once = tryRotate(state);
        if (once.active.rotationIndex !== originalIndex) return false;
        const onceCells = activeCells(once.active);
        return JSON.stringify(onceCells) === JSON.stringify(originalCells);
      }

      // A single valid rotation advances rotationIndex by one modulo count.
      const afterOne = tryRotate(state);
      if (
        afterOne.active.rotationIndex !==
        (originalIndex + 1) % count
      ) {
        return false;
      }

      // `count` rotations return to the original orientation and cells.
      let s = state;
      for (let i = 0; i < count; i++) {
        s = tryRotate(s);
      }
      if (s.active.rotationIndex !== originalIndex) return false;
      const cycledCells = activeCells(s.active);
      return JSON.stringify(cycledCells) === JSON.stringify(originalCells);
    },
    { iterations: 150 },
  );
});

// Feature: tetris-game, Property 15: Lines counter increases by rows removed
//
// For any GameState and any line-clear that removes k rows, the
// Lines_Cleared_Counter after the clear equals its previous value plus k.
//
// Strategy: build a playing state whose board already contains some full rows
// (via genBoardWithFullRows) and whose active piece rests clear of them, so
// locking the active piece clears exactly the rows that are already full. We
// compute the expected k INDEPENDENTLY of lockAndResolve: lock the active
// piece's module cells onto the board, then count findFullRows on that locked
// board. Then assert lockAndResolve(state).linesCleared === state.linesCleared + k.
//
// Validates: Requirements 12.4
test('Property 15: lines counter increases by rows removed', () => {
  forAll(
    (rng) => {
      const k = rng.int(1, 4);
      // A board with k full rows placed at the bottom. Fill the rest sparsely
      // so other rows are unlikely to be complete.
      const bottomRows = [];
      for (let i = 0; i < k; i++) bottomRows.push(19 - i);
      const board = genBoardWithFullRows(rng, {
        fill: 0.2,
        fullRows: bottomRows,
      });

      // Place the active piece near the top (rows 0–1 region) so, wherever its
      // cells land, locking does not depend on the bottom full rows and the
      // only rows that complete are the ones already full. Use spawnPiece to
      // get an in-bounds top piece.
      const key = KEYS[rng.int(0, KEYS.length - 1)];
      const active = spawnPiece(key);

      // Clear the active piece's own cells on the board so the piece is in a
      // valid position (not overlapping a settled block).
      const cells = activeCells(active);
      for (const { r, c } of cells) {
        if (r >= 0 && r < 20 && c >= 0 && c < 10) board[r][c] = null;
      }

      const linesCleared = rng.int(0, 60);
      const state = {
        board,
        active,
        next: key,
        score: rng.int(0, 100000),
        level: 1 + Math.floor(linesCleared / 10),
        linesCleared,
        status: 'playing',
        fallSpeedMs: 1000,
        _draw: () => key,
      };
      return state;
    },
    (state) => {
      // Compute k independently: lock the active piece, then count full rows
      // on the resulting board exactly as lockAndResolve would.
      const lockedBoard = lockPiece(
        state.board,
        activeCells(state.active),
        state.active.key,
      );
      const k = findFullRows(lockedBoard).length;

      const result = lockAndResolve(state);
      return result.linesCleared === state.linesCleared + k;
    },
    { iterations: 150 },
  );
});

// Feature: tetris-game, Property 18: Non-playing status ignores gameplay intents
//
// For any GameState whose status is 'paused' or 'gameover', applying any
// gameplay intent (moveLeft, moveRight, rotate, softDrop, hardDrop, stepDown)
// returns a state equal to the input. While 'gameover', a pauseToggle also
// leaves the state unchanged. We assert reference equality: applyIntent returns
// the SAME object when the intent is ignored.
//
// Validates: Requirements 7.4, 14.3, 15.3, 15.5
test('Property 18: non-playing status ignores gameplay intents', () => {
  const GAMEPLAY_INTENTS = [
    'moveLeft',
    'moveRight',
    'rotate',
    'softDrop',
    'hardDrop',
    'stepDown',
  ];
  forAll(
    (rng) => {
      const status = rng.bool() ? 'paused' : 'gameover';
      const state = genGameState(makeRng(rng.int(1, 2 ** 30)), { status });
      const intent = GAMEPLAY_INTENTS[rng.int(0, GAMEPLAY_INTENTS.length - 1)];
      return { state, intent };
    },
    ({ state, intent }) => {
      // Every gameplay intent is a no-op in a non-playing status.
      if (applyIntent(state, intent) !== state) return false;

      // While gameover, pauseToggle is also a no-op (Requirement 15.5).
      if (state.status === 'gameover') {
        if (applyIntent(state, 'pauseToggle') !== state) return false;
      }
      return true;
    },
    { iterations: 150 },
  );
});

// Feature: tetris-game, Property 19: Pause then resume is an identity round-trip
//
// For any 'playing' GameState, pause changes only status to 'paused' and
// preserves board/score/level/lines/active/next/fallSpeedMs; resume afterward
// returns a state equal to the original. We compare the data fields explicitly
// (ignoring any internal piece-source function field).
//
// Validates: Requirements 15.1, 15.2, 15.4
test('Property 19: pause then resume is an identity round-trip', () => {
  // Compare only the data fields of a GameState (ignore _draw).
  const sameData = (a, b) =>
    JSON.stringify(a.board) === JSON.stringify(b.board) &&
    JSON.stringify(a.active) === JSON.stringify(b.active) &&
    a.next === b.next &&
    a.score === b.score &&
    a.level === b.level &&
    a.linesCleared === b.linesCleared &&
    a.status === b.status &&
    a.fallSpeedMs === b.fallSpeedMs;

  forAll(
    (rng) => genGameState(makeRng(rng.int(1, 2 ** 30)), { status: 'playing' }),
    (state) => {
      const paused = pause(state);

      // Pause flips only the status to 'paused'; everything else is preserved.
      if (paused.status !== 'paused') return false;
      if (JSON.stringify(paused.board) !== JSON.stringify(state.board)) return false;
      if (JSON.stringify(paused.active) !== JSON.stringify(state.active)) return false;
      if (paused.next !== state.next) return false;
      if (paused.score !== state.score) return false;
      if (paused.level !== state.level) return false;
      if (paused.linesCleared !== state.linesCleared) return false;
      if (paused.fallSpeedMs !== state.fallSpeedMs) return false;

      // Resume returns to a state equal to the original (status back to
      // 'playing' and all data fields preserved).
      const resumed = resume(paused);
      return sameData(resumed, state);
    },
    { iterations: 150 },
  );
});

// Feature: tetris-game, Property 20: Restart yields a canonical fresh game
//
// For any prior GameState, restart produces a state with an empty board, score
// 0, level 1, linesCleared 0, status 'playing', and a freshly spawned active
// piece plus a defined next preview.
//
// Validates: Requirements 14.4
test('Property 20: restart yields a canonical fresh game', () => {
  forAll(
    (rng) => genGameState(makeRng(rng.int(1, 2 ** 30))),
    (state) => {
      const fresh = restart(state);

      // Empty board: 20x10, all cells null.
      if (fresh.board.length !== 20) return false;
      for (const row of fresh.board) {
        if (row.length !== 10) return false;
        for (const cell of row) {
          if (cell !== null) return false;
        }
      }

      // Canonical fresh counters and status.
      if (fresh.score !== 0) return false;
      if (fresh.level !== 1) return false;
      if (fresh.linesCleared !== 0) return false;
      if (fresh.status !== 'playing') return false;

      // A freshly spawned, valid active piece and a defined next preview.
      if (!fresh.active || !VALID_KEY_SET.has(fresh.active.key)) return false;
      if (!isValidPosition(fresh.board, activeCells(fresh.active))) return false;
      if (typeof fresh.next !== 'string' || !VALID_KEY_SET.has(fresh.next)) {
        return false;
      }
      return true;
    },
    { iterations: 150 },
  );
});
