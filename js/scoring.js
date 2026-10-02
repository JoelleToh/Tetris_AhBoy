// scoring.js — pure scoring, level, and fall-speed functions (task 4.1).
//
// This module imports nothing from the DOM so it is directly importable by
// tests. It implements the standard Tetris scoring table, level progression,
// and the per-level fall-speed interval.

// Base points awarded for clearing 0, 1, 2, 3, or 4 rows at once, indexed by
// the number of rows cleared. Index 0 (no rows cleared) awards nothing.
// (Requirements 11.2, 11.3, 11.4, 11.5)
const LINE_SCORE_BASE = [0, 100, 300, 500, 800];

// Fall-speed decay factor per level. Must satisfy 0 < DECAY < 1 so the interval
// strictly decreases as the level increases (until clamped at the 1ms floor).
const FALL_SPEED_DECAY = 0.85;

// Base fall-speed interval at level 1, in milliseconds. (Requirement 13.1)
const BASE_FALL_SPEED_MS = 1000;

// Minimum fall-speed interval, in milliseconds. (Requirement 13.2)
const MIN_FALL_SPEED_MS = 1;

/**
 * Points awarded for clearing `clearedCount` rows at the given `level`.
 * Equal to the base points for that count multiplied by the level.
 * (Requirements 11.2, 11.3, 11.4, 11.5)
 *
 * @param {number} clearedCount number of rows cleared (0..4)
 * @param {number} level current level (>= 1)
 * @returns {number} points awarded
 */
export function lineScore(clearedCount, level) {
  const base = LINE_SCORE_BASE[clearedCount] ?? 0;
  return base * level;
}

/**
 * The level for a given total number of cleared lines:
 * `1 + floor(linesCleared / 10)`. (Requirement 12.5)
 *
 * @param {number} linesCleared total lines cleared so far (>= 0)
 * @returns {number} level (>= 1)
 */
export function levelForLines(linesCleared) {
  return 1 + Math.floor(linesCleared / 10);
}

/**
 * The automatic-fall interval (in milliseconds) for a given level.
 *
 * Strictly decreasing in `level` while above the floor, clamped to a minimum of
 * 1ms, and exactly 1000ms at level 1. (Requirements 13.1, 13.2, 13.3)
 *
 * The geometric decay alone would round into plateaus (equal consecutive
 * values) as the interval shrinks toward the floor, which would break strict
 * monotonicity. To guarantee the interval strictly decreases on every level
 * until it reaches the 1ms floor, each level is forced to be at least one
 * millisecond less than the previous level, then clamped to the floor.
 *
 * @param {number} level current level (>= 1)
 * @returns {number} fall interval in milliseconds (>= 1)
 */
export function fallSpeedForLevel(level) {
  if (level <= 1) {
    return BASE_FALL_SPEED_MS;
  }
  const raw = Math.round(BASE_FALL_SPEED_MS * Math.pow(FALL_SPEED_DECAY, level - 1));
  // Keep the interval strictly below the previous level's value until the floor.
  const strictlyDecreasing = Math.min(raw, fallSpeedForLevel(level - 1) - 1);
  return Math.max(MIN_FALL_SPEED_MS, strictlyDecreasing);
}
