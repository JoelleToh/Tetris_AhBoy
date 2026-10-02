// renderer.js — canvas rendering of board, active piece, and preview (task 9.1).
//
// This module is side-effecting: it draws the game state onto two <canvas>
// elements and updates HUD text and overlay visibility in the DOM. All pure
// shape data (tints, fallback colors, cell offsets) comes from tetrominoes.js.
//
// The renderer paints each occupied cell by scaling the Block_Image into the
// cell, then overlaying the per-shape tint and a 1px border so adjacent cells of
// the same shape stay distinguishable (Requirements 2.3, 19.1, 19.4). When the
// Block_Image failed to load, cells are filled with each shape's fallback solid
// color instead so the game stays playable (Requirement 19.5). Empty cells are
// left as the canvas background (Requirement 1.4), and any cell outside the
// 10x20 grid is skipped (Requirement 1.5).
//
// HUD / overlay DOM element ids this renderer reads (task 12.1 must match these):
//   #score            — text element showing the current Score (Req 11.6)
//   #level            — text element showing the current Level (Req 12.2)
//   #lines            — text element showing the Lines_Cleared_Counter (Req 12.3)
//   #paused-overlay   — element shown while status === 'paused' (Req 15.1)
//   #gameover-overlay — element shown while status === 'gameover' (Req 14.2)
// Every lookup is guarded so the renderer degrades gracefully when an element
// (or the whole DOM) is absent — e.g. in a headless test environment.

import { TINTS, FALLBACK_COLORS, cellsFor } from './tetrominoes.js';

const ROWS = 20;
const COLS = 10;


// Canvas background for empty cells / cleared areas (Requirement 1.4).
const BACKGROUND = '#101018';

// Neutral 1px grid border drawn around each occupied cell. Kept subtle so it
// separates adjacent blocks without tinting or obscuring the Block_Image.
const CELL_BORDER = 'rgba(0, 0, 0, 0.35)';

// HUD / overlay element ids. Documented above; keep in sync with index.html.
const SCORE_ID = 'score';
const LEVEL_ID = 'level';
const LINES_ID = 'lines';
const PAUSED_OVERLAY_ID = 'paused-overlay';
const GAMEOVER_OVERLAY_ID = 'gameover-overlay';

/**
 * createRenderer(boardCanvas, previewCanvas, assets)
 *
 * @param {HTMLCanvasElement|null} boardCanvas   the 10x20 playfield canvas
 * @param {HTMLCanvasElement|null} previewCanvas the next-piece preview canvas
 * @param {{ image: HTMLImageElement, status: string, ready: boolean }} assets
 *   the handle returned by loadBlockImage; `status` is polled each render so a
 *   late-arriving load/failure is picked up without rebuilding the renderer.
 * @returns {{ render: (state: object) => void }}
 */
export function createRenderer(boardCanvas, previewCanvas, assets) {
  // 2D contexts are resolved lazily and defensively. A missing canvas (or a
  // canvas with no 2D support, as in some test shims) simply means that surface
  // is skipped; the rest of render() still runs.
  const boardCtx = get2dContext(boardCanvas);
  const previewCtx = get2dContext(previewCanvas);

  /**
   * Decide whether the Block_Image is usable right now. It is usable when the
   * loader reports it ready; it is explicitly unusable when the load failed, in
   * which case callers paint the fallback color (Requirement 19.5). While still
   * loading we also fall back so the field is never blank.
   * @returns {boolean} true if the image should be drawn, false to use fallback
   */
  function imageUsable() {
    if (!assets) return false;
    if (assets.status === 'failed') return false;
    return Boolean(assets.ready) || assets.status === 'ready';
  }

  /**
   * Paint a single occupied cell at grid (r, c) with the given shape key.
   * Skips any cell outside the 10x20 grid, preserving the rest of the field
   * (Requirement 1.5). Uses image+tint when available, else the fallback color.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} r grid row
   * @param {number} c grid column
   * @param {string} key shape key (I/O/T/S/Z/J/L)
   * @param {number} cell cell size in pixels
   * @param {boolean} useImage whether the Block_Image is usable this frame
   */
  function drawCell(ctx, r, c, key, cell, useImage) {
    if (r < 0 || r > ROWS - 1 || c < 0 || c > COLS - 1) return; // Req 1.5
    const x = c * cell;
    const y = r * cell;
    const tint = TINTS[key] || '#ffffff';

    if (useImage) {
      // Scale the Block_Image into this single cell, unmodified, so the photo
      // shows through with no color overlay (Requirement 19.4).
      ctx.drawImage(assets.image, x, y, cell, cell);
    } else {
      // Image unavailable: solid per-shape fallback color (Requirement 19.5).
      ctx.fillStyle = FALLBACK_COLORS[key] || tint;
      ctx.fillRect(x, y, cell, cell);
    }

    // 1px neutral border so neighboring blocks read as separate cells without
    // tinting the image.
    ctx.strokeStyle = CELL_BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
  }

  /**
   * Draw the playfield: background, settled blocks, then the active piece.
   * @param {object} state the current GameState
   */
  function renderBoard(state) {
    if (!boardCtx || !boardCanvas) return;

    const width = boardCanvas.width;
    const height = boardCanvas.height;
    const cell = Math.floor(Math.min(width / COLS, height / ROWS));

    // Clear to background so empty cells are distinguishable (Requirement 1.4).
    boardCtx.fillStyle = BACKGROUND;
    boardCtx.fillRect(0, 0, width, height);

    if (cell <= 0) return;

    const useImage = imageUsable();

    // Settled blocks from stored grid positions (Requirements 1.2).
    const board = state && state.board;
    if (Array.isArray(board)) {
      for (let r = 0; r < board.length; r += 1) {
        const row = board[r];
        if (!Array.isArray(row)) continue;
        for (let c = 0; c < row.length; c += 1) {
          const key = row[c];
          if (key) drawCell(boardCtx, r, c, key, cell, useImage);
        }
      }
    }

    // Active piece from its stored grid position (Requirement 1.3).
    const active = state && state.active;
    if (active && active.key) {
      const offsets = cellsFor(active.key, active.rotationIndex || 0);
      for (const o of offsets) {
        drawCell(
          boardCtx,
          (active.row || 0) + o.r,
          (active.col || 0) + o.c,
          active.key,
          cell,
          useImage,
        );
      }
    }
  }

  /**
   * Draw the next-piece preview, centered in its canvas (Requirements 16.1,
   * 16.2, 16.3).
   * @param {object} state the current GameState
   */
  function renderPreview(state) {
    if (!previewCtx || !previewCanvas) return;

    const width = previewCanvas.width;
    const height = previewCanvas.height;

    previewCtx.fillStyle = BACKGROUND;
    previewCtx.fillRect(0, 0, width, height);

    const key = state && state.next;
    if (!key) return;

    const offsets = cellsFor(key, 0);
    if (!offsets.length) return;

    // Compute the shape's bounding box so it can be centered in the canvas.
    let minR = Infinity;
    let minC = Infinity;
    let maxR = -Infinity;
    let maxC = -Infinity;
    for (const o of offsets) {
      if (o.r < minR) minR = o.r;
      if (o.c < minC) minC = o.c;
      if (o.r > maxR) maxR = o.r;
      if (o.c > maxC) maxC = o.c;
    }
    const shapeCols = maxC - minC + 1;
    const shapeRows = maxR - minR + 1;

    // Use a cell size that fits the shape with a little padding.
    const cell = Math.floor(
      Math.min(width / (shapeCols + 1), height / (shapeRows + 1)),
    );
    if (cell <= 0) return;

    const offsetX = Math.floor((width - shapeCols * cell) / 2);
    const offsetY = Math.floor((height - shapeRows * cell) / 2);
    const useImage = imageUsable();
    const tint = TINTS[key] || '#ffffff';

    for (const o of offsets) {
      const x = offsetX + (o.c - minC) * cell;
      const y = offsetY + (o.r - minR) * cell;

      if (useImage) {
        // Draw the image unmodified so it is clearly visible in the preview.
        previewCtx.drawImage(assets.image, x, y, cell, cell);
      } else {
        previewCtx.fillStyle = FALLBACK_COLORS[key] || tint;
        previewCtx.fillRect(x, y, cell, cell);
      }

      previewCtx.strokeStyle = CELL_BORDER;
      previewCtx.lineWidth = 1;
      previewCtx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
    }
  }

  /**
   * Update HUD text (score/level/lines) and show/hide overlays based on status.
   * All DOM access is guarded (Requirements 11.6, 12.2, 12.3, 14.2, 15.1).
   * @param {object} state the current GameState
   */
  function renderHud(state) {
    if (typeof document === 'undefined' || !document) return;

    setText(SCORE_ID, state && state.score);
    setText(LEVEL_ID, state && state.level);
    setText(LINES_ID, state && state.linesCleared);

    const status = state && state.status;
    setOverlayVisible(PAUSED_OVERLAY_ID, status === 'paused'); // Req 15.1
    setOverlayVisible(GAMEOVER_OVERLAY_ID, status === 'gameover'); // Req 14.2
  }

  /**
   * render(state): draw board, preview, and HUD from the current state.
   * @param {object} state the current GameState
   */
  function render(state) {
    renderBoard(state);
    renderPreview(state);
    renderHud(state);
  }

  return { render };
}

/**
 * Resolve a 2D context from a canvas, tolerating a missing canvas or a stub
 * without getContext (returns null so callers can skip that surface).
 * @param {HTMLCanvasElement|null} canvas
 * @returns {CanvasRenderingContext2D|null}
 */
function get2dContext(canvas) {
  if (!canvas || typeof canvas.getContext !== 'function') return null;
  try {
    return canvas.getContext('2d');
  } catch (_err) {
    return null;
  }
}

/**
 * Set an element's text content by id, if the element exists. Non-numeric or
 * nullish values are coerced to a sensible string.
 * @param {string} id
 * @param {*} value
 */
function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  const text = value === undefined || value === null ? '' : String(value);
  el.textContent = text;
}

/**
 * Show or hide an overlay element by id, if it exists. Uses the `hidden`
 * attribute so CSS can style the visible/hidden states.
 * @param {string} id
 * @param {boolean} visible
 */
function setOverlayVisible(id, visible) {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = !visible;
}
