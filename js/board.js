// board.js — pure board operations: bounds, collision, lock, line clear (tasks 3.x).
//
// A Board is a 2D array `board[row][col]`, 20 rows x 10 cols by default.
// Each entry is either `null` (empty) or a shape-key string identifying a
// Settled_Block. Row 0 is the top; row 19 is the bottom. This module imports
// nothing from the DOM so it is directly importable by tests.

/**
 * Create an empty board.
 * @param {number} [rows=20] number of rows
 * @param {number} [cols=10] number of columns
 * @returns {Array<Array<null>>} a rows x cols grid filled with null (empty)
 */
export function createBoard(rows = 20, cols = 10) {
  const board = new Array(rows);
  for (let r = 0; r < rows; r++) {
    board[r] = new Array(cols).fill(null);
  }
  return board;
}

/**
 * Whether a grid position is within the playable bounds.
 *
 * Columns must be 0..9 and rows must be <= 19. The top is left open above
 * row 0 so spawn math can position pieces above the field; occupancy is only
 * tracked within rows 0..19. (Requirements 8.1, 8.2.)
 *
 * @param {number} r row index
 * @param {number} c column index
 * @returns {boolean} true iff 0 <= c <= 9 and r <= 19
 */
export function inBounds(r, c) {
  return c >= 0 && c <= 9 && r <= 19;
}

/**
 * The core collision predicate: whether a piece may occupy the given cells.
 *
 * A position is valid iff every cell is in bounds (0 <= c <= 9 and r <= 19)
 * and does not land on a Settled_Block. Cells above the top (r < 0) are
 * treated as in bounds for spawn math and only count as occupied when they
 * fall within the board's row range. (Requirements 8.1, 8.2, 8.3, 1.5.)
 *
 * @param {Array<Array<null|string>>} board the playfield
 * @param {Array<{r: number, c: number}>} pieceCells absolute cell positions
 * @returns {boolean} true iff every cell is a valid, unoccupied position
 */
export function isValidPosition(board, pieceCells) {
  for (const { r, c } of pieceCells) {
    if (!inBounds(r, c)) return false;
    // Only cells within the tracked row range can collide with settled blocks.
    if (r >= 0 && board[r][c] !== null) return false;
  }
  return true;
}

/**
 * Lock a piece into the board, settling its cells.
 *
 * Returns a NEW board (the input is never mutated) with each cell in
 * `pieceCells` set to `shapeKey`. Cells whose row falls outside the tracked
 * 0..rows-1 range are skipped so lock math never throws for spawn-area rows.
 * (Requirement 9.3.)
 *
 * @param {Array<Array<null|string>>} board the playfield
 * @param {Array<{r: number, c: number}>} pieceCells absolute cell positions
 * @param {string} shapeKey the shape key to store at each cell
 * @returns {Array<Array<null|string>>} a new board with the cells set
 */
export function lockPiece(board, pieceCells, shapeKey) {
  const next = board.map((row) => row.slice());
  for (const { r, c } of pieceCells) {
    if (r >= 0 && r < next.length && c >= 0 && c < next[r].length) {
      next[r][c] = shapeKey;
    }
  }
  return next;
}

/**
 * Compute the hard-drop distance for a piece.
 *
 * Returns the maximum downward row-offset delta `d` (an integer >= 0) such
 * that shifting every cell of `pieceCells` down by `d` is still a valid
 * position per `isValidPosition`. In other words, moving the piece down by
 * the returned delta leaves it resting on the floor or on a Settled_Block,
 * and moving it down by one more would be invalid.
 *
 * Callers (e.g. game.js hardDrop) apply the delta: the resting cells are
 * `pieceCells.map(({ r, c }) => ({ r: r + d, c }))`. If the current position
 * is already invalid, the delta is 0.
 *
 * @param {Array<Array<null|string>>} board the playfield
 * @param {Array<{r: number, c: number}>} pieceCells absolute cell positions
 * @returns {number} the number of rows to move the piece down for a hard drop
 */
export function dropPosition(board, pieceCells) {
  let d = 0;
  while (
    isValidPosition(
      board,
      pieceCells.map(({ r, c }) => ({ r: r + d + 1, c }))
    )
  ) {
    d++;
  }
  return d;
}

/**
 * Find the indices of fully occupied rows.
 *
 * Returns an array of row indices (ascending) for every row in which all
 * columns are occupied by a Settled_Block (non-null). (Requirement 10.1.)
 *
 * @param {Array<Array<null|string>>} board the playfield
 * @returns {number[]} indices of rows where all cells are occupied
 */
export function findFullRows(board) {
  const full = [];
  for (let r = 0; r < board.length; r++) {
    if (board[r].every((cell) => cell !== null)) {
      full.push(r);
    }
  }
  return full;
}

/**
 * Clear the given rows from the board.
 *
 * Returns `{ board, cleared }` where `cleared` is the number of rows removed.
 * The returned board has the same dimensions as the input: the listed rows
 * are removed, the surviving rows keep their relative order (so blocks above
 * removed rows effectively shift down by the number of cleared rows below
 * them), and empty (all-null) rows are prepended at the top to restore the
 * row count. The input board is never mutated. If `rowIndices` is empty, an
 * equivalent (freshly copied) board is returned with `cleared` 0.
 * (Requirements 10.3, 10.4.)
 *
 * @param {Array<Array<null|string>>} board the playfield
 * @param {number[]} rowIndices indices of rows to remove
 * @returns {{board: Array<Array<null|string>>, cleared: number}} new board and count
 */
export function clearRows(board, rowIndices) {
  const rows = board.length;
  const cols = board[0] ? board[0].length : 0;
  const remove = new Set(rowIndices);
  // Keep surviving rows in their original top-to-bottom order (deep-copied).
  const survivors = [];
  for (let r = 0; r < rows; r++) {
    if (!remove.has(r)) survivors.push(board[r].slice());
  }
  const cleared = rows - survivors.length;
  // Prepend empty rows so the board keeps its original height; survivors
  // settle at the bottom, preserving their relative arrangement.
  const next = [];
  for (let i = 0; i < cleared; i++) {
    next.push(new Array(cols).fill(null));
  }
  for (const row of survivors) next.push(row);
  return { board: next, cleared };
}
