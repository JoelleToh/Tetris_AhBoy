// game.js — game state machine and reducers (tasks 6.x).
//
// This module holds the pure game-logic state machine. It imports only from the
// other pure modules (tetrominoes.js, board.js, scoring.js) and nothing from the
// DOM, so it is directly importable by tests.
//
// GameState model (see design.md):
//   {
//     board: Board,                 // 20x10 of null | shapeKey
//     active: ActivePiece,          // { key, rotationIndex, row, col }
//     next: shapeKey,               // next piece type for the preview
//     score: non-negative integer,
//     level: positive integer,
//     linesCleared: non-negative integer,
//     status: 'playing' | 'paused' | 'gameover',
//     fallSpeedMs: positive integer,
//   }
//
// The absolute cells of the active piece are:
//   cellsFor(active.key, active.rotationIndex)
//     .map(o => ({ r: active.row + o.r, c: active.col + o.c }))

import { SHAPES, cellsFor, rotationCount } from './tetrominoes.js';
import {
  createBoard,
  isValidPosition,
  lockPiece,
  dropPosition,
  findFullRows,
  clearRows,
} from './board.js';
import { lineScore, levelForLines, fallSpeedForLevel } from './scoring.js';

// The 7 standard shape keys, used by the default uniform-random piece source.
const SHAPE_KEYS = Object.keys(SHAPES);

// Board width used for horizontal spawn centering.
const BOARD_COLS = 10;

/**
 * The 7 standard shape keys, in definition order. Exposed for tests and the
 * piece source.
 * @type {string[]}
 */
export const KEYS = SHAPE_KEYS;

/**
 * Default uniform-random piece source: returns one of the 7 standard shape
 * keys with equal probability. (Requirement 3.3)
 * @returns {string} a shape key
 */
export function randomPiece() {
  const index = Math.floor(Math.random() * SHAPE_KEYS.length);
  return SHAPE_KEYS[index];
}

/**
 * Normalize a piece-source function. If `seedPieceFn` is a function it is used
 * as-is (for deterministic tests); otherwise the uniform-random picker is used.
 * @param {Function} [seedPieceFn]
 * @returns {() => string}
 */
function pieceSource(seedPieceFn) {
  return typeof seedPieceFn === 'function' ? seedPieceFn : randomPiece;
}

/**
 * Compute the active piece's four absolute cells for a given state's active
 * piece (or any ActivePiece-shaped object). (design.md: ActivePiece model)
 * @param {{ key: string, rotationIndex: number, row: number, col: number }} piece
 * @returns {Array<{ r: number, c: number }>}
 */
export function activeCells(piece) {
  return cellsFor(piece.key, piece.rotationIndex).map((o) => ({
    r: piece.row + o.r,
    c: piece.col + o.c,
  }));
}

/**
 * The horizontally-centered spawn column for a shape at rotation 0, so the
 * piece's cells sit near the middle of the 10-wide board in rows 0–1.
 * (Requirement 3.1)
 *
 * Computed from the shape's spawn-orientation bounding box: center the box
 * within the board and floor to an integer column.
 * @param {string} key shape key
 * @returns {number} the spawn column (origin col offset)
 */
export function spawnColumn(key) {
  const cells = cellsFor(key, 0);
  let minC = Infinity;
  let maxC = -Infinity;
  for (const { c } of cells) {
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  }
  const width = maxC - minC + 1;
  // Center the bounding box; subtract minC so the origin lands correctly.
  return Math.floor((BOARD_COLS - width) / 2) - minC;
}

/**
 * Build an ActivePiece for a freshly spawned shape, centered horizontally in
 * rows 0–1 at rotation 0. (Requirement 3.1)
 * @param {string} key shape key
 * @returns {{ key: string, rotationIndex: number, row: number, col: number }}
 */
export function spawnPiece(key) {
  return { key, rotationIndex: 0, row: 0, col: spawnColumn(key) };
}

/**
 * newGame(seedPieceFn): build an initial GameState.
 *
 * Empty board, score 0, level 1, linesCleared 0, status 'playing',
 * fallSpeedMs = fallSpeedForLevel(1). The active piece is spawned centered in
 * rows 0–1, and `next` is a drawn shape for the preview.
 * (Requirements 3.1, 11.1, 12.1, 16.1)
 *
 * @param {Function} [seedPieceFn] optional deterministic piece source
 * @returns {object} the initial GameState (with a hidden piece source attached)
 */
export function newGame(seedPieceFn) {
  const draw = pieceSource(seedPieceFn);
  const activeKey = draw();
  const nextKey = draw();
  const level = 1;
  return {
    board: createBoard(),
    active: spawnPiece(activeKey),
    next: nextKey,
    score: 0,
    level,
    linesCleared: 0,
    status: 'playing',
    fallSpeedMs: fallSpeedForLevel(level),
    // Non-enumerable-ish internal piece source so spawn/restart can draw more
    // pieces deterministically in tests. It is a plain property; reducers copy
    // it forward. Tests may ignore it.
    _draw: draw,
  };
}

/**
 * spawn(state): move `next` into `active` centered at the top, draw a new
 * `next`, and transition to 'gameover' if the spawn position is invalid.
 * Pure: returns a new state and does not mutate the input.
 * (Requirements 3.1–3.4, 14.1, 16.2)
 *
 * @param {object} state the current GameState
 * @returns {object} the next GameState
 */
export function spawn(state) {
  const draw = pieceSource(state._draw);
  const active = spawnPiece(state.next);
  const next = draw();
  const spawned = { ...state, active, next, _draw: draw };
  if (!isValidPosition(spawned.board, activeCells(active))) {
    // Overlapping spawn → game over. The piece is still recorded so a renderer
    // can show the final frame, but status halts play. (Requirements 3.4, 14.1)
    return { ...spawned, status: 'gameover' };
  }
  return spawned;
}

// --- Movement, rotation, drop, lock, and status reducers --------------------
//
// These reducers are implemented in tasks 6.5 (movement/rotation/drop) and 6.11
// (lock resolution and status transitions). applyIntent dispatches to them, so
// safe placeholders live here until those tasks replace them. Each placeholder
// is pure and returns the state unchanged so the module loads and applyIntent's
// status-gating is fully exercisable now.

/**
 * tryMove(state, dr, dc): shift the active piece by (dr, dc) if the resulting
 * position is valid; otherwise return the state unchanged.
 *
 * Pure: builds a candidate ActivePiece, tests its absolute cells against the
 * board, and returns a new state only when the move is legal. Horizontal moves
 * (dc = ±1) and the one-row descent used by soft/auto drop share this helper.
 * (Requirements 4.1, 4.2, 4.3, 5.1)
 *
 * @param {object} state the current GameState
 * @param {number} dr row delta
 * @param {number} dc column delta
 * @returns {object} the moved state, or the original if blocked
 */
export function tryMove(state, dr, dc) {
  const { active } = state;
  const candidate = { ...active, row: active.row + dr, col: active.col + dc };
  if (isValidPosition(state.board, activeCells(candidate))) {
    return { ...state, active: candidate };
  }
  return state;
}

/**
 * tryRotate(state): rotate the active piece clockwise to its next orientation
 * if the rotated cells are a valid position; otherwise reject (unchanged).
 *
 * The next orientation is `(rotationIndex + 1) % rotationCount(key)`. For
 * single-orientation shapes (O, rotationCount 1) this wraps back to the same
 * index, so rotation is a no-op. Rotation keeps the piece's origin (row, col)
 * fixed; only the orientation changes. (Requirements 7.1, 7.2, 7.3)
 *
 * @param {object} state the current GameState
 * @returns {object} the rotated state, or the original if blocked/no-op
 */
export function tryRotate(state) {
  const { active } = state;
  const count = rotationCount(active.key);
  if (count <= 1) return state; // single-orientation shape: nothing to do.
  const rotationIndex = (active.rotationIndex + 1) % count;
  const candidate = { ...active, rotationIndex };
  if (isValidPosition(state.board, activeCells(candidate))) {
    return { ...state, active: candidate };
  }
  return state;
}

/**
 * softDrop(state): move the active piece down one row if valid; if the piece
 * cannot descend (blocked by the floor or a Settled_Block), lock it and
 * resolve (clear lines, score, spawn next). (Requirements 5.2, 6.2, 9.2)
 *
 * @param {object} state the current GameState
 * @returns {object} the next GameState
 */
export function softDrop(state) {
  const moved = tryMove(state, 1, 0);
  if (moved !== state) return moved; // descended one row.
  return lockAndResolve(state); // blocked → settle the piece.
}

/**
 * hardDrop(state): move the active piece straight down to its resting position
 * (the lowest valid row), then lock and resolve. (Requirements 6.1, 6.2)
 *
 * @param {object} state the current GameState
 * @returns {object} the next GameState after the piece settles
 */
export function hardDrop(state) {
  const { active } = state;
  const d = dropPosition(state.board, activeCells(active));
  const rested = { ...state, active: { ...active, row: active.row + d } };
  return lockAndResolve(rested);
}

/**
 * stepDown(state): the automatic fall tick. Identical to the downward step of
 * softDrop — move down one row if valid, otherwise lock and resolve.
 * (Requirements 9.1, 9.2)
 *
 * @param {object} state the current GameState
 * @returns {object} the next GameState
 */
export function stepDown(state) {
  const moved = tryMove(state, 1, 0);
  if (moved !== state) return moved; // descended one row.
  return lockAndResolve(state); // blocked → settle the piece.
}

/**
 * lockAndResolve(state): settle the active piece into the board, clear any
 * completed rows, update score/lines/level/fall speed, then spawn the next
 * piece.
 *
 * Pure: builds and returns a new state and does not mutate the input.
 *
 * Steps:
 *  1. Lock the active piece's four cells into the board. (Req 9.3)
 *  2. Find fully occupied rows. (Req 10.1)
 *  3. Clear them, shifting survivors down and keeping the board 20x10.
 *     (Reqs 10.2, 10.3, 10.4)
 *  4. Increase the lines counter by the number of cleared rows. (Req 12.4)
 *  5. Award line score using the CURRENT level (before it is updated), so a
 *     clear that also bumps the level still scores at the pre-clear level.
 *     (Reqs 11.2, 11.3, 11.4, 11.5)
 *  6. Recompute the level from the new lines total. (Req 12.5)
 *  7. Recompute the fall-speed interval for the new level. (Reqs 13.2)
 *  8. Spawn the next piece from the updated state; `spawn` also transitions to
 *     'gameover' if the spawn position overlaps a Settled_Block. (Req 14.1)
 *
 * @param {object} state the current GameState
 * @returns {object} the next GameState after the active piece settles
 */
export function lockAndResolve(state) {
  const { active, board, score, level, linesCleared } = state;

  // 1. Settle the active piece's cells into the board. (Req 9.3)
  const lockedBoard = lockPiece(board, activeCells(active), active.key);

  // 2–3. Find and clear completed rows. (Reqs 10.1–10.4)
  const full = findFullRows(lockedBoard);
  const { board: clearedBoard, cleared } = clearRows(lockedBoard, full);

  // 4. Advance the Lines_Cleared_Counter by the rows removed. (Req 12.4)
  const newLines = linesCleared + cleared;

  // 5. Award score at the CURRENT level (before the level update). (Reqs 11.2–11.5)
  const newScore = score + lineScore(cleared, level);

  // 6–7. Recompute level and fall speed from the new lines total. (Reqs 12.5, 13.2)
  const newLevel = levelForLines(newLines);
  const newFallSpeed = fallSpeedForLevel(newLevel);

  // 8. Bring in the next piece (may transition to 'gameover' on overlap).
  return spawn({
    ...state,
    board: clearedBoard,
    score: newScore,
    level: newLevel,
    linesCleared: newLines,
    fallSpeedMs: newFallSpeed,
  });
}

/**
 * pause(state): enter the paused state from playing.
 *
 * Pure: only acts while status === 'playing', in which case it flips the status
 * to 'paused' and preserves everything else (board, score, level, lines,
 * active piece, next, fall speed) unchanged, so the loop stops stepping the
 * piece while the frame is retained. From any other status it is a no-op and
 * returns the state unchanged. (Requirements 15.1, 15.2)
 *
 * @param {object} state the current GameState
 * @returns {object} the paused state, or the original if not playing
 */
export function pause(state) {
  if (state.status !== 'playing') return state;
  return { ...state, status: 'paused' };
}

/**
 * resume(state): leave the paused state back to playing.
 *
 * Pure: only acts while status === 'paused', flipping the status back to
 * 'playing' with everything else preserved so pause → resume is an identity
 * round-trip that re-enables automatic falling. From any other status it is a
 * no-op. (Requirement 15.4)
 *
 * @param {object} state the current GameState
 * @returns {object} the resumed state, or the original if not paused
 */
export function resume(state) {
  if (state.status !== 'paused') return state;
  return { ...state, status: 'playing' };
}

/**
 * restart(state, seedPieceFn): reset to a canonical fresh game.
 *
 * Returns a brand-new game via `newGame`: empty board, score 0, level 1, lines
 * 0, status 'playing', no game-over indication, and a freshly spawned active
 * piece plus a next-piece preview. Allowed from any status. The piece source is
 * taken from the explicit `seedPieceFn` when provided (deterministic tests),
 * otherwise it reuses the prior state's piece source so randomness continues.
 * (Requirement 14.4)
 *
 * @param {object} state the current GameState
 * @param {Function} [seedPieceFn] optional deterministic piece source
 * @returns {object} a canonical fresh GameState
 */
export function restart(state, seedPieceFn) {
  return newGame(seedPieceFn ?? state._draw);
}

/**
 * applyIntent(state, intent): the single gatekeeper that enforces which
 * intents are allowed in which status, then dispatches to the matching
 * reducer. (Requirements 7.4, 14.3, 15.3, 15.5, 17.3)
 *
 * Rules:
 *   - Gameplay intents (moveLeft, moveRight, softDrop, hardDrop, rotate,
 *     stepDown) are applied only while status === 'playing'; in 'paused' and
 *     'gameover' they are ignored and the state is returned unchanged.
 *   - 'pauseToggle' acts only while 'playing' (→ paused) or 'paused'
 *     (→ playing); it is ignored while 'gameover'.
 *   - 'restart' is always allowed.
 *   - Any unrecognized intent is a no-op.
 *
 * @param {object} state the current GameState
 * @param {string} intent one of the Intent strings
 * @returns {object} the next GameState (same reference semantics when ignored)
 */
export function applyIntent(state, intent) {
  switch (intent) {
    // restart is always allowed, regardless of status.
    case 'restart':
      return restart(state);

    // pauseToggle only acts while playing or paused; ignored while gameover.
    case 'pauseToggle':
      if (state.status === 'playing') return pause(state);
      if (state.status === 'paused') return resume(state);
      return state;

    // Gameplay intents are applied only while playing.
    case 'moveLeft':
      return state.status === 'playing' ? tryMove(state, 0, -1) : state;
    case 'moveRight':
      return state.status === 'playing' ? tryMove(state, 0, 1) : state;
    case 'softDrop':
      return state.status === 'playing' ? softDrop(state) : state;
    case 'hardDrop':
      return state.status === 'playing' ? hardDrop(state) : state;
    case 'rotate':
      return state.status === 'playing' ? tryRotate(state) : state;
    case 'stepDown':
      return state.status === 'playing' ? stepDown(state) : state;

    // Unrecognized intents are a no-op.
    default:
      return state;
  }
}
