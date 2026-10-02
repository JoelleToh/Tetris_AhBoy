// Feature: tetris-game
// Tests for the pure key-to-intent mapping in js/input.js.
//
// Two test tasks target this file (10.2, 10.3); each adds its own cases below.

import { test, expect } from './harness.js';
import { forAll, makeRng } from './prng.js';
import { KEY_MAP, keyToIntent } from '../js/input.js';

// Feature: tetris-game, Property 21: Unmapped keys produce no intent
//
// For any key string that is NOT present in the control map, keyToIntent
// returns null (no intent). We generate random key strings — single random
// characters and short random strings — and only assert on those that are not
// mapped, so the property exercises the "unmapped -> null" guarantee.
//
// Validates: Requirement 17.3
test('Property 21: unmapped keys produce no intent', () => {
  // Printable ASCII range to draw random characters from.
  const randomChar = (rng) => String.fromCharCode(rng.int(33, 126));
  const randomString = (rng) => {
    const len = rng.int(1, 6);
    let s = '';
    for (let i = 0; i < len; i++) s += randomChar(rng);
    return s;
  };

  forAll(
    (rng) => (rng.bool() ? randomChar(rng) : randomString(rng)),
    (key) => {
      // Skip keys that happen to be in the control map; the property is only
      // about keys NOT in the map.
      if (Object.prototype.hasOwnProperty.call(KEY_MAP, key)) return true;
      return keyToIntent(key) === null;
    },
    { iterations: 200 },
  );
});

// Task 10.3: the control map covers every required action.
//
// The set of intents produced by KEY_MAP must include move left, move right,
// soft drop, hard drop, rotate, pause/resume toggle, and restart.
//
// Validates: Requirement 17.1
test('control map covers all required actions', () => {
  const intents = new Set(Object.values(KEY_MAP));
  const required = [
    'moveLeft',
    'moveRight',
    'softDrop',
    'hardDrop',
    'rotate',
    'pauseToggle',
    'restart',
  ];
  for (const action of required) {
    expect(intents.has(action)).toBe(true);
  }
});
