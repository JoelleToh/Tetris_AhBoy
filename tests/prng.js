// Feature: tetris-game
// Seedable PRNG + property-test harness for the Tetris pure-logic tests.
//
// This module is intentionally self-contained: the logic modules (board.js,
// tetrominoes.js, game.js, scoring.js) may not exist yet when this harness is
// authored, so the generators embed a minimal, standards-matching copy of the
// shape/board data they need. Test files import the PRNG factory, the `forAll`
// driver, and the generators below.
//
// Data models mirror design.md:
//   Board       : 20x10 array of (null | shapeKey)
//   shapeKey    : one of 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
//   ActivePiece : { key, rotationIndex, row, col }
//   GameState   : { board, active, next, score, level, linesCleared, status, fallSpeedMs }

export const ROWS = 20;
export const COLS = 10;
export const SHAPE_KEYS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
export const STATUSES = ['playing', 'paused', 'gameover'];

// Minimal rotation offsets per shape, one list of four {r,c} cells per
// orientation. Orientation counts match the design: O=1; I,S,Z=2; T,J,L=4.
// These are used only to produce *plausible* generated pieces for the harness;
// the modules under test own the canonical definitions.
export const SHAPE_ROTATIONS = {
  I: [
    [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 }],
    [{ r: 0, c: 2 }, { r: 1, c: 2 }, { r: 2, c: 2 }, { r: 3, c: 2 }],
  ],
  O: [
    [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }],
  ],
  T: [
    [{ r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }],
    [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 1 }],
    [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 1 }],
    [{ r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 2, c: 1 }],
  ],
  S: [
    [{ r: 0, c: 1 }, { r: 0, c: 2 }, { r: 1, c: 0 }, { r: 1, c: 1 }],
    [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 2 }],
  ],
  Z: [
    [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 1 }, { r: 1, c: 2 }],
    [{ r: 0, c: 2 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 1 }],
  ],
  J: [
    [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }],
    [{ r: 0, c: 1 }, { r: 0, c: 2 }, { r: 1, c: 1 }, { r: 2, c: 1 }],
    [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 2 }],
    [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 0 }, { r: 2, c: 1 }],
  ],
  L: [
    [{ r: 0, c: 2 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }],
    [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 1 }, { r: 2, c: 2 }],
    [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 0 }],
    [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 1 }],
  ],
};

// ---------------------------------------------------------------------------
// Seedable PRNG (mulberry32)
// ---------------------------------------------------------------------------

/**
 * Create a mulberry32-style seedable PRNG. Deterministic for a given seed, so
 * property-test failures are reproducible.
 *
 * @param {number} seed - integer seed.
 * @returns {object} rng with helpers:
 *   - next()                 -> float in [0, 1)
 *   - int(min, max)          -> integer in [min, max] inclusive
 *   - bool(p=0.5)            -> boolean true with probability p
 *   - pick(array)            -> uniformly chosen element
 *   - seed                   -> the seed used (for reporting)
 */
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min, max) => min + Math.floor(next() * (max - min + 1));
  const bool = (p = 0.5) => next() < p;
  const pick = (array) => array[Math.floor(next() * array.length)];
  return { next, int, bool, pick, seed: seed >>> 0 };
}

// ---------------------------------------------------------------------------
// forAll driver
// ---------------------------------------------------------------------------

/**
 * Property-test driver. Runs the predicate against generated inputs for at
 * least `iterations` rounds (minimum 100) and reports the first counterexample.
 *
 * The predicate may return `false` or throw to signal failure. On the first
 * failure the driver throws an Error annotated with the failing input, the
 * iteration index, and the seed so the run is reproducible.
 *
 * @param {(rng: object, i: number) => any} generator - produces one input.
 * @param {(value: any) => boolean} predicate - returns true when the property holds.
 * @param {object} [opts]
 * @param {number} [opts.iterations=100] - number of rounds (clamped up to >=100).
 * @param {number} [opts.seed] - base seed; defaults to a time-derived seed.
 * @returns {{ iterations: number, seed: number }} summary on success.
 */
export function forAll(generator, predicate, opts = {}) {
  const requested = Number.isFinite(opts.iterations) ? opts.iterations : 100;
  const iterations = Math.max(100, Math.floor(requested));
  const baseSeed = Number.isFinite(opts.seed) ? opts.seed >>> 0 : (Date.now() >>> 0);

  for (let i = 0; i < iterations; i++) {
    // Derive a distinct, reproducible seed per iteration from the base seed.
    const iterSeed = (baseSeed + Math.imul(i, 0x9e3779b1)) >>> 0;
    const rng = makeRng(iterSeed);
    let value;
    try {
      value = generator(rng, i);
    } catch (genErr) {
      throw annotate(genErr, value, i, iterSeed, 'generator threw');
    }

    let held;
    try {
      held = predicate(value);
    } catch (predErr) {
      throw annotate(predErr, value, i, iterSeed, 'predicate threw');
    }

    if (held === false) {
      throw annotate(
        new Error('Property failed'),
        value,
        i,
        iterSeed,
        'predicate returned false',
      );
    }
  }

  return { iterations, seed: baseSeed };
}

function annotate(err, value, iteration, seed, reason) {
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    serialized = String(value);
  }
  err.counterexample = value;
  err.iteration = iteration;
  err.seed = seed;
  err.message =
    `${err.message} [${reason}] at iteration ${iteration} ` +
    `(seed ${seed}). Counterexample: ${serialized}`;
  return err;
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Uniformly random shape key (I/O/T/S/Z/J/L). */
export function genShape(rng) {
  return rng.pick(SHAPE_KEYS);
}

/** Random valid orientation index for the given shape key. */
export function genOrientation(rng, key = genShape(rng)) {
  const count = SHAPE_ROTATIONS[key].length;
  return rng.int(0, count - 1);
}

/** An empty 20x10 board of nulls. */
export function emptyBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
}

/**
 * Random board with configurable fill.
 *
 * @param {object} rng
 * @param {object} [opts]
 * @param {number} [opts.fill=0.3] - probability each cell is occupied.
 * @param {number[]} [opts.fullRows=[]] - row indices forced completely full.
 * @param {number} [opts.fullRowCount] - if set, that many random rows are
 *        forced full (ignored when `fullRows` is non-empty).
 * @returns {Array<Array<null|string>>} a 20x10 board.
 */
export function genBoard(rng, opts = {}) {
  const fill = Number.isFinite(opts.fill) ? opts.fill : 0.3;
  const board = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () =>
      rng.bool(fill) ? rng.pick(SHAPE_KEYS) : null,
    ),
  );

  let fullRows = Array.isArray(opts.fullRows) ? opts.fullRows.slice() : [];
  if (fullRows.length === 0 && Number.isFinite(opts.fullRowCount)) {
    const n = Math.max(0, Math.min(ROWS, Math.floor(opts.fullRowCount)));
    const candidates = Array.from({ length: ROWS }, (_, r) => r);
    // Partial Fisher-Yates to pick n distinct rows.
    for (let i = 0; i < n; i++) {
      const j = rng.int(i, ROWS - 1);
      const tmp = candidates[i];
      candidates[i] = candidates[j];
      candidates[j] = tmp;
    }
    fullRows = candidates.slice(0, n);
  }

  for (const r of fullRows) {
    if (r >= 0 && r < ROWS) {
      for (let c = 0; c < COLS; c++) {
        board[r][c] = board[r][c] ?? rng.pick(SHAPE_KEYS);
      }
    }
  }
  return board;
}

/** Convenience: a board guaranteed to contain at least one full row. */
export function genBoardWithFullRows(rng, opts = {}) {
  const count = Number.isFinite(opts.fullRowCount) ? opts.fullRowCount : rng.int(1, 4);
  return genBoard(rng, { ...opts, fullRowCount: Math.max(1, count) });
}

/**
 * Random active piece position. By default the generated piece is constrained
 * to sit within the board bounds for its chosen orientation; pass
 * `{ allowOutOfBounds: true }` to also generate positions that may fall
 * outside the field (useful for collision-predicate tests).
 *
 * @returns {{ key, rotationIndex, row, col }}
 */
export function genActivePiece(rng, opts = {}) {
  const key = opts.key || genShape(rng);
  const rotationIndex =
    Number.isFinite(opts.rotationIndex)
      ? opts.rotationIndex
      : genOrientation(rng, key);
  const cells = SHAPE_ROTATIONS[key][rotationIndex];

  if (opts.allowOutOfBounds) {
    return { key, rotationIndex, row: rng.int(-2, ROWS + 1), col: rng.int(-2, COLS + 1) };
  }

  // Keep every cell inside 0..ROWS-1 x 0..COLS-1 for the chosen orientation.
  const maxR = Math.max(...cells.map((o) => o.r));
  const minR = Math.min(...cells.map((o) => o.r));
  const maxC = Math.max(...cells.map((o) => o.c));
  const minC = Math.min(...cells.map((o) => o.c));
  const row = rng.int(-minR, ROWS - 1 - maxR);
  const col = rng.int(-minC, COLS - 1 - maxC);
  return { key, rotationIndex, row, col };
}

/** Absolute board cells occupied by an ActivePiece. */
export function pieceCells(piece) {
  const offsets = SHAPE_ROTATIONS[piece.key][piece.rotationIndex];
  return offsets.map((o) => ({ r: piece.row + o.r, c: piece.col + o.c }));
}

/**
 * Random reachable-looking GameState. Values are mutually consistent (level
 * derived from lines, fall speed derived from level) so a state resembles one
 * the reducers could actually produce. Not guaranteed collision-free against
 * the active piece unless `{ clearSpawnArea: true }` is passed.
 *
 * @returns {GameState}
 */
export function genGameState(rng, opts = {}) {
  const linesCleared = Number.isFinite(opts.linesCleared)
    ? opts.linesCleared
    : rng.int(0, 60);
  const level = 1 + Math.floor(linesCleared / 10);
  const fallSpeedMs = Math.max(1, Math.round(1000 * Math.pow(0.85, level - 1)));
  const status = opts.status || rng.pick(STATUSES);
  const fill = Number.isFinite(opts.fill) ? opts.fill : rng.next() * 0.4;

  const board = genBoard(rng, { fill });
  const active = genActivePiece(rng);

  if (opts.clearSpawnArea) {
    for (const cell of pieceCells(active)) {
      if (cell.r >= 0 && cell.r < ROWS && cell.c >= 0 && cell.c < COLS) {
        board[cell.r][cell.c] = null;
      }
    }
  }

  return {
    board,
    active,
    next: genShape(rng),
    score: rng.int(0, 100000),
    level,
    linesCleared,
    status,
    fallSpeedMs,
  };
}
