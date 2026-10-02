// Feature: tetris-game
// Unit tests for the canvas renderer in js/renderer.js (task 9.2).
//
// The renderer is side-effecting: it draws onto a 2D canvas context. Rather
// than exercise a real browser canvas, these tests drive it with a FAKE canvas
// whose getContext('2d') returns a stub context that records every fillStyle
// assignment and every fillRect / drawImage / strokeRect call. That lets us
// assert *which* drawing path the renderer took.
//
// Task 9.2 specifically: when the Block_Image status is 'failed', the renderer
// must pick the per-shape FALLBACK_COLORS branch (Requirements 18.5, 19.5),
// i.e. it must NOT call drawImage and it must fill the cell with
// FALLBACK_COLORS[key]. The renderer decides this via imageUsable(), which
// returns false when assets.status === 'failed'.

import { test, expect } from './harness.js';
import { createRenderer } from '../js/renderer.js';
import { FALLBACK_COLORS } from '../js/tetrominoes.js';

// Build a fake 2D context that records a chronological log of operations,
// capturing the current fillStyle at the moment each fill op is issued so a
// test can tell which color was used for which rectangle.
function makeFakeCtx() {
  const ops = [];
  const ctx = {
    // Drawing state the renderer reads/writes.
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    globalAlpha: 1,

    fillRect(x, y, w, h) {
      ops.push({ op: 'fillRect', x, y, w, h, fillStyle: ctx.fillStyle, globalAlpha: ctx.globalAlpha });
    },
    strokeRect(x, y, w, h) {
      ops.push({ op: 'strokeRect', x, y, w, h, strokeStyle: ctx.strokeStyle });
    },
    drawImage(img, x, y, w, h) {
      ops.push({ op: 'drawImage', x, y, w, h });
    },
  };
  return { ctx, ops };
}

// A minimal fake canvas whose getContext('2d') yields the provided fake ctx.
function makeFakeCanvas(width, height, fakeCtx) {
  return {
    width,
    height,
    getContext(kind) {
      return kind === '2d' ? fakeCtx : null;
    },
  };
}

// A GameState with a single settled 'T' block at the bottom-left corner plus an
// active piece, so renderBoard paints at least one occupied cell.
function makeState() {
  const board = Array.from({ length: 20 }, () => new Array(10).fill(null));
  board[19][0] = 'T';
  return {
    board,
    active: { key: 'I', rotationIndex: 0, row: 0, col: 3 },
    next: 'I',
    status: 'playing',
    score: 0,
    level: 1,
    linesCleared: 0,
  };
}

// Validates: Requirements 18.5, 19.5
test('renderer uses FALLBACK_COLORS (not the image) when image status is failed', () => {
  const board = makeFakeCtx();
  const preview = makeFakeCtx();

  // 100x200 board => cell size = min(100/10, 200/20) = 10px (> 0).
  const CELL = 10;
  const boardCanvas = makeFakeCanvas(100, 200, board.ctx);
  const previewCanvas = makeFakeCanvas(40, 40, preview.ctx);

  // Image failed to load: ready false, status 'failed' => fallback path.
  const assets = { image: {}, status: 'failed', ready: false };

  const renderer = createRenderer(boardCanvas, previewCanvas, assets);
  renderer.render(makeState());

  // Fallback path must never scale the Block_Image onto the board.
  const drawImageCalls = board.ops.filter((o) => o.op === 'drawImage');
  expect(drawImageCalls.length).toBe(0);

  // The settled 'T' cell is at grid (19, 0) => pixel (x = 0*CELL, y = 19*CELL),
  // size CELL x CELL. Find the cell-sized fillRect at that position (not the
  // full-canvas background fill, which is 100x200) and check the fillStyle
  // captured at that moment.
  const tCellFill = board.ops.find(
    (o) =>
      o.op === 'fillRect' &&
      o.x === 0 * CELL &&
      o.y === 19 * CELL &&
      o.w === CELL &&
      o.h === CELL,
  );
  expect(Boolean(tCellFill)).toBe(true);
  expect(tCellFill.fillStyle).toBe(FALLBACK_COLORS.T);

  // Every cell-sized fill must be a full-opacity fallback color (the tint
  // overlay path runs at reduced alpha and only happens on the image branch).
  const cellFills = board.ops.filter(
    (o) => o.op === 'fillRect' && o.w === CELL && o.h === CELL,
  );
  expect(cellFills.length > 0).toBe(true);
  for (const fill of cellFills) {
    expect(fill.globalAlpha).toBe(1);
  }
});
