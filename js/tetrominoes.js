// tetrominoes.js — pure shape data, tints, and fallback colors (task 2.1).
//
// This module is intentionally free of any DOM/browser references so it can be
// imported directly by tests. It defines the 7 standard tetrominoes, each as an
// ordered list of clockwise rotation states. Every orientation is a list of
// exactly four distinct, edge-connected { r, c } offsets relative to the piece
// bounding-box origin.
//
// Orientation counts (Requirements 2.1, 2.2, 7.2):
//   O:            1 orientation (rotation is a no-op)
//   I, S, Z:      2 distinct orientations
//   T, J, L:      4 distinct orientations

/**
 * SHAPES: map of shape key -> array of rotation states.
 * Each rotation state is an array of four { r, c } cell offsets.
 */
export const SHAPES = {
  // I piece — horizontal and vertical.
  I: [
    [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 }], // spawn (horizontal)
    [{ r: 0, c: 2 }, { r: 1, c: 2 }, { r: 2, c: 2 }, { r: 3, c: 2 }], // CW 90 (vertical)
  ],

  // O piece — single orientation; rotation leaves it unchanged.
  O: [
    [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }],
  ],

  // T piece — four orientations.
  T: [
    [{ r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }], // spawn
    [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 1 }], // CW 90
    [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 1 }], // CW 180
    [{ r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 2, c: 1 }], // CW 270
  ],

  // S piece — two orientations.
  S: [
    [{ r: 0, c: 1 }, { r: 0, c: 2 }, { r: 1, c: 0 }, { r: 1, c: 1 }], // spawn
    [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 2 }], // CW 90
  ],

  // Z piece — two orientations.
  Z: [
    [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 1 }, { r: 1, c: 2 }], // spawn
    [{ r: 0, c: 2 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 1 }], // CW 90
  ],

  // J piece — four orientations.
  J: [
    [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }], // spawn
    [{ r: 0, c: 1 }, { r: 0, c: 2 }, { r: 1, c: 1 }, { r: 2, c: 1 }], // CW 90
    [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 2 }], // CW 180
    [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 0 }, { r: 2, c: 1 }], // CW 270
  ],

  // L piece — four orientations.
  L: [
    [{ r: 0, c: 2 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }], // spawn
    [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 1 }, { r: 2, c: 2 }], // CW 90
    [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 0 }], // CW 180
    [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 1 }], // CW 270
  ],
};

/**
 * TINTS: per-shape tint color applied over the Block_Image so the 7 shapes
 * stay distinguishable (Requirement 2.3). Standard Tetris color associations.
 */
export const TINTS = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000',
};

/**
 * FALLBACK_COLORS: per-shape solid color used to fill a cell when the
 * Block_Image fails to load, keeping the game playable (Requirement 19.5).
 */
export const FALLBACK_COLORS = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000',
};

/**
 * rotationCount(shape): number of distinct orientations for a shape key.
 * Returns 0 for an unknown key so callers can treat it defensively.
 * @param {string} shape
 * @returns {number}
 */
export function rotationCount(shape) {
  const states = SHAPES[shape];
  return states ? states.length : 0;
}

/**
 * cellsFor(shape, rotationIndex): the four { r, c } offsets for a given
 * orientation. The rotation index wraps modulo the shape's orientation count.
 * Returns a fresh array of fresh cell objects so callers cannot mutate SHAPES.
 * Returns an empty array for an unknown shape key.
 * @param {string} shape
 * @param {number} rotationIndex
 * @returns {Array<{ r: number, c: number }>}
 */
export function cellsFor(shape, rotationIndex) {
  const states = SHAPES[shape];
  if (!states) return [];
  const count = states.length;
  const index = ((rotationIndex % count) + count) % count;
  return states[index].map((cell) => ({ r: cell.r, c: cell.c }));
}
