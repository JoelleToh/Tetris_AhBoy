// input.js — keyboard mapping to intents (task 10.1).
//
// Translates `keydown` events into game intents and dispatches them. The pure
// mapping is exported separately (`KEY_MAP` / `keyToIntent`) so it can be
// unit- and property-tested without a DOM. The side-effecting listener added
// by `attachInput` is a thin wrapper around that pure mapping.
//
// Intent = 'moveLeft' | 'moveRight' | 'softDrop' | 'hardDrop' | 'rotate'
//        | 'pauseToggle' | 'restart' | 'stepDown'
//
// `stepDown` originates from the game loop, not from input, so it is not part
// of the key mapping here. (Requirements 17.1, 17.3.)

/**
 * Mapping of keyboard identifiers to intents.
 *
 * Keyed by both `KeyboardEvent.key` values (e.g. 'ArrowLeft', 'p', 'P') and
 * `KeyboardEvent.code` values (e.g. 'Space') so lookups work regardless of
 * which identifier a caller provides. Any key absent from this map produces
 * no intent (Requirement 17.3).
 *
 * @type {Readonly<Record<string, string>>}
 */
export const KEY_MAP = Object.freeze({
  // Movement.
  ArrowLeft: 'moveLeft',
  ArrowRight: 'moveRight',
  // Soft drop.
  ArrowDown: 'softDrop',
  // Hard drop — Space reports key ' ' and code 'Space'; accept both.
  ' ': 'hardDrop',
  Space: 'hardDrop',
  // Rotate clockwise.
  ArrowUp: 'rotate',
  // Pause/resume toggle (either case).
  p: 'pauseToggle',
  P: 'pauseToggle',
  // Restart (either case).
  r: 'restart',
  R: 'restart',
});

/**
 * Pure mapping from a keyboard key/code to an intent.
 *
 * Returns the mapped intent string, or `null` when the key is not mapped
 * (Requirement 17.3). Both `key` and `code` are consulted so callers can pass
 * whichever they have; `key` takes precedence when both resolve.
 *
 * @param {string} [key] the `KeyboardEvent.key` value
 * @param {string} [code] the `KeyboardEvent.code` value
 * @returns {string|null} the intent, or `null` if the key is unmapped
 */
export function keyToIntent(key, code) {
  if (key != null && Object.prototype.hasOwnProperty.call(KEY_MAP, key)) {
    return KEY_MAP[key];
  }
  if (code != null && Object.prototype.hasOwnProperty.call(KEY_MAP, code)) {
    return KEY_MAP[code];
  }
  return null;
}

/**
 * Attach a `keydown` listener that maps keys to intents and dispatches them.
 *
 * For mapped keys the intent is dispatched and `preventDefault` is called to
 * stop default browser behavior such as arrow/Space page scrolling. Unmapped
 * keys produce no intent and no `preventDefault` call (Requirements 17.1, 17.3).
 *
 * @param {EventTarget} target element/window to listen on
 * @param {(intent: string) => void} dispatch called with each mapped intent
 * @returns {() => void} a function that removes the listener
 */
export function attachInput(target, dispatch) {
  const handler = (event) => {
    const intent = keyToIntent(event.key, event.code);
    if (intent === null) return; // Unmapped: no intent, no preventDefault.
    if (typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    dispatch(intent);
  };

  target.addEventListener('keydown', handler);
  return () => target.removeEventListener('keydown', handler);
}
