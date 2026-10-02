// main.js — composition root: wiring, game loop, bootstrapping (task 11.1).
//
// This is the only side-effecting entry module. It wires the pure game logic
// (game.js) to the side-effecting layers (assetLoader.js, renderer.js,
// input.js) and drives everything from a single requestAnimationFrame loop.
//
// Data flow (see design.md):
//   keyboard --(input.js)--> intent --\
//                                       >--(applyIntent)--> new state --(render)
//   rAF loop --(stepDown intent)-------/
//
// Timing: an accumulator compares elapsed wall-clock time against the current
// fallSpeedMs. Each time the interval elapses while status === 'playing', the
// loop issues one `stepDown` intent (Requirement 9.1). The loop never steps the
// piece while paused or gameover (Requirements 14.3, 15.2); it still renders so
// overlays stay correct. fallSpeedMs is re-read from state every iteration so a
// level-up changes the fall rate immediately. Using an accumulator (not
// setInterval) keeps timing decoupled from frame rate.
//
// Bootstrap: on successful setup we call window.__tetrisBootOk() so the inline
// guard in index.html clears its boot-error timeout. If setup throws, we do NOT
// call it and we log the error, so the boot-error banner surfaces the failure
// (Requirement 18.5).

import { loadBlockImage } from './assetLoader.js';
import { newGame, applyIntent } from './game.js';
import { attachInput } from './input.js';
import { createRenderer } from './renderer.js';

// Canvas element ids, per index.html.
const BOARD_CANVAS_ID = 'board';
const PREVIEW_CANVAS_ID = 'preview';

// Guard against a huge dt after a tab is backgrounded (rAF pauses, then fires
// with a large gap). Clamp per-frame elapsed time so the piece does not
// teleport downward through many steps at once on the first frame back.
const MAX_FRAME_DT_MS = 1000;

/**
 * Wire on-screen touch buttons to the dispatch path.
 *
 * Finds every element with a `data-intent` attribute inside `root` and fires
 * the matching intent on tap. Uses `pointerdown` (with a `click` fallback) so
 * taps feel immediate, and calls `preventDefault` to suppress the browser's
 * synthetic mouse events, double-tap zoom, and text selection. Buttons work for
 * any status because `applyIntent` gates intents itself (e.g. restart always
 * works, gameplay intents are ignored while paused/gameover).
 *
 * @param {Document|HTMLElement} root element to search for touch buttons
 * @param {(intent: string) => void} dispatch shared intent dispatcher
 */
function attachTouch(root, dispatch) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  const buttons = root.querySelectorAll('[data-intent]');
  buttons.forEach((btn) => {
    const intent = btn.getAttribute('data-intent');
    if (!intent) return;
    let handled = false;
    const fire = (event) => {
      if (event) event.preventDefault();
      handled = true;
      dispatch(intent);
      // Reset the de-dupe flag on the next tick so later taps still register.
      setTimeout(() => {
        handled = false;
      }, 0);
    };
    // pointerdown gives the snappiest response on touch and mouse alike.
    btn.addEventListener('pointerdown', fire);
    // Fallback for environments without Pointer Events; skip if pointerdown
    // already handled this interaction.
    btn.addEventListener('click', (event) => {
      if (handled) return;
      fire(event);
    });
  });
}

/**
 * Bootstrap the game: load the Block_Image, build initial state, wire input,
 * render once, and start the fall-speed accumulator loop.
 *
 * All wiring is wrapped by the caller in try/catch so a thrown error leaves the
 * boot guard un-signaled and the error banner visible (Requirement 18.5).
 */
function boot() {
  const boardCanvas = document.getElementById(BOARD_CANVAS_ID);
  const previewCanvas = document.getElementById(PREVIEW_CANVAS_ID);

  // Degrade gracefully if the board canvas is missing: there is nothing to play
  // on, so surface the problem rather than running a loop that renders nothing.
  if (!boardCanvas) {
    throw new Error(
      `Missing #${BOARD_CANVAS_ID} canvas; cannot start the game.`,
    );
  }

  // Load the themed Block_Image. The handle's status updates asynchronously;
  // the renderer polls it each frame and falls back to solid colors on failure.
  const assets = loadBlockImage();

  // Build the renderer over both canvases (preview may be absent — the renderer
  // guards that internally).
  const renderer = createRenderer(boardCanvas, previewCanvas, assets);

  // Mutable game state. Every intent produces a fresh state via applyIntent.
  let state = newGame();

  /**
   * Dispatch an intent: fold it into state and render the result. Shared by
   * keyboard input and the auto-fall loop so there is a single update path.
   * @param {string} intent one of the Intent strings
   */
  function dispatch(intent) {
    state = applyIntent(state, intent);
    renderer.render(state);
  }

  // Initial paint so the board, preview, and HUD show before the first tick.
  renderer.render(state);

  // Keyboard controls. Listen on window so keys work without focusing a
  // specific element (input.js maps keys to intents and calls dispatch).
  attachInput(window, dispatch);

  // On-screen touch controls for mobile / no-keyboard play. Each button in the
  // markup carries a data-intent that maps to the same intents the keyboard
  // produces, so touch and keyboard share the single dispatch path above.
  attachTouch(document, dispatch);

  // --- Fall-speed accumulator loop ------------------------------------------
  let lastTime = null; // timestamp of the previous frame (ms), null on first.
  let accumulator = 0; // elapsed time credited toward the next step (ms).

  /**
   * One animation frame: advance the accumulator and issue stepDown intents
   * while playing, then render.
   * @param {number} now the rAF high-resolution timestamp in ms
   */
  function frame(now) {
    if (lastTime === null) lastTime = now;
    // Clamp dt so a long pause (backgrounded tab) does not dump many steps.
    const dt = Math.min(now - lastTime, MAX_FRAME_DT_MS);
    lastTime = now;

    if (state.status === 'playing') {
      accumulator += dt;
      // Re-read fallSpeedMs each iteration so a mid-loop level-up (via a lock
      // that clears lines) takes effect immediately. Guard against a
      // non-positive interval to avoid an infinite loop.
      let interval = state.fallSpeedMs > 0 ? state.fallSpeedMs : 1;
      while (accumulator >= interval) {
        accumulator -= interval;
        dispatch('stepDown');
        // A step may have changed the level (and thus the interval) or ended
        // the game; refresh both so the loop reacts right away.
        if (state.status !== 'playing') {
          accumulator = 0;
          break;
        }
        interval = state.fallSpeedMs > 0 ? state.fallSpeedMs : 1;
      }
    } else {
      // Not playing: drop any banked time so resuming does not immediately
      // fast-forward the piece (Requirements 14.3, 15.2).
      accumulator = 0;
    }

    // Render every frame so overlays and HUD stay current even when paused.
    renderer.render(state);
    window.requestAnimationFrame(frame);
  }

  window.requestAnimationFrame(frame);
}

// Run the composition root, guarding so any failure is observable rather than
// leaving a blank, dead page (Requirement 18.5).
try {
  boot();
  // Signal the inline bootstrap guard that the module came up healthy; this
  // clears its boot-error timeout so the banner stays hidden.
  if (typeof window !== 'undefined' && typeof window.__tetrisBootOk === 'function') {
    window.__tetrisBootOk();
  }
} catch (err) {
  // Do NOT call __tetrisBootOk — leaving it un-signaled lets the index.html
  // boot-error banner appear. Log so the specific failure is diagnosable.
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error('Tetris failed to start:', err);
  }
}
