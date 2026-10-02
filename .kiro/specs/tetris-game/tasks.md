# Implementation Plan: Tetris Game

## Overview

This plan implements the vanilla HTML/CSS/JS Tetris game described in the design, with no build step and no framework, hostable directly on GitHub Pages. Work proceeds in dependency order: project scaffolding and asset setup first, then the dependency-free pure-logic modules (`tetrominoes.js`, `board.js`, `scoring.js`) with their unit and property tests, then the game state machine and reducers in `game.js` with tests, then the side-effecting layers (`assetLoader.js`, `renderer.js`, `input.js`, `main.js`), then `index.html` markup and responsive CSS, and finally wiring and integration/smoke verification.

Pure logic is kept free of DOM references so it is imported directly by tests. Property-based tests use a hand-written seedable-PRNG harness (`tests/prng.js`), run via `tests/test-runner.html` with no build step; each property test is tagged `// Feature: tetris-game, Property N: ...` and runs at least 100 iterations. Example-based unit tests cover the fixed, non-input-varying criteria.

## Tasks

- [x] 1. Scaffold project structure and set up the test harness
  - [x] 1.1 Create the static-site directory structure and ES-module entry wiring
    - Create `index.html` placeholder with `<script type="module" src="js/main.js">`, plus empty module files `js/tetrominoes.js`, `js/board.js`, `js/scoring.js`, `js/game.js`, `js/input.js`, `js/renderer.js`, `js/assetLoader.js`, `js/main.js`, and `css/styles.css`
    - Ensure all references use relative paths so the site resolves from a GitHub Pages project subpath
    - _Requirements: 18.1, 18.2, 18.3_

  - [x] 1.2 Copy and rename the Block_Image into the assets directory
    - Create `assets/` and copy the source image `WhatsApp Image 2026-10-02 at 2.21.38 PM.jpeg` from the workspace root to `assets/block.jpg` (copy, do not move; leave the original in place)
    - Confirm the clean, space-free relative path `assets/block.jpg` exists
    - _Requirements: 19.2, 19.3_

  - [x] 1.3 Build the seedable PRNG and property-test harness
    - Implement `tests/prng.js` with a mulberry32-style seedable PRNG, a `forAll(generator, predicate, { iterations })` driver running at least 100 iterations and reporting the first counterexample, and generators for random boards (configurable fill, including boards engineered to have full rows), random shapes, random orientations, random active-piece positions, and random reachable `GameState`s
    - _Requirements: 18.2_

  - [x] 1.4 Create the browser test runner
    - Implement `tests/test-runner.html` to load `tests/prng.js` and all `*.test.js` files as ES modules and print pass/fail results to the page and console, with no bundler or npm scripts
    - _Requirements: 18.2_

- [x] 2. Implement tetromino shape data (pure)
  - [x] 2.1 Define shapes, rotations, tints, and fallback colors
    - In `js/tetrominoes.js`, define `SHAPES` for the 7 standard pieces (O: 1 orientation; I, S, Z: 2; T, J, L: 4), each orientation being four connected `{r,c}` offsets; add `TINTS` and `FALLBACK_COLORS` maps keyed by shape, and `rotationCount(shape)` and `cellsFor(shape, rotationIndex)`
    - Import nothing from the DOM so the module is directly testable
    - _Requirements: 2.1, 2.2, 2.3, 7.2, 19.5_

  - [x] 2.2 Write property test: every orientation is four connected cells
    - **Property 8: Every tetromino orientation is exactly four connected cells**
    - **Validates: Requirements 2.2**

  - [x] 2.3 Write property test: distinct tints and defined fallback colors
    - **Property 22: Each shape has a distinct tint and a defined fallback color**
    - **Validates: Requirements 2.3, 19.5**

  - [x] 2.4 Write unit test: SHAPES contains exactly the 7 keys
    - Assert `SHAPES` has exactly I, O, T, S, Z, J, L
    - _Requirements: 2.1_

- [x] 3. Implement pure board operations
  - [x] 3.1 Create board, bounds, and collision predicate
    - In `js/board.js`, implement `createBoard(rows=20, cols=10)` returning a 20×10 grid of `null`, `inBounds(r, c)`, and `isValidPosition(board, pieceCells)` (valid iff every cell has `0 <= c <= 9`, `r <= 19`, and is not on a Settled_Block)
    - _Requirements: 1.1, 8.1, 8.2, 8.3, 1.5_

  - [x] 3.2 Write property test: collision predicate correctness
    - **Property 1: Collision predicate is correct**
    - **Validates: Requirements 8.1, 8.2, 8.3, 1.5**

  - [x] 3.3 Write unit test: board is exactly 20×10 / 200 cells
    - Assert dimensions and total cell count
    - _Requirements: 1.1_

  - [x] 3.4 Implement lock, hard-drop position, and line-clear operations
    - In `js/board.js`, implement `lockPiece(board, pieceCells, shapeKey)` (returns new board with those cells set to shapeKey), `dropPosition(board, pieceCells)` (lowest valid offset), `findFullRows(board)`, and `clearRows(board, rowIndices)` returning `{ board, cleared }` with full rows removed, rows above shifted down by the count removed below them, and empty rows added at top
    - _Requirements: 6.1, 9.3, 10.1, 10.3, 10.4_

  - [x] 3.5 Write property test: locking adds exactly four occupied cells
    - **Property 5: Locking adds exactly four occupied cells**
    - **Validates: Requirements 9.3**

  - [x] 3.6 Write property test: findFullRows identifies exactly the complete rows
    - **Property 11: `findFullRows` identifies exactly the complete rows**
    - **Validates: Requirements 10.1**

  - [x] 3.7 Write property test: clearing with no full rows is a no-op
    - **Property 12: Clearing with no full rows is a no-op**
    - **Validates: Requirements 10.2**

  - [x] 3.8 Write property test: line clear conserves surviving blocks
    - **Property 13: Line clear conserves surviving blocks and removes exactly 10 per cleared row**
    - **Validates: Requirements 10.3, 10.4**

- [x] 4. Implement pure scoring, level, and fall-speed functions
  - [x] 4.1 Implement scoring, level, and fall-speed functions
    - In `js/scoring.js`, implement `lineScore(clearedCount, level)` (0/100/300/500/800 indexed by count, times level), `levelForLines(linesCleared)` = `1 + floor(linesCleared / 10)`, and `fallSpeedForLevel(level)` strictly decreasing in level, clamped to a 1ms minimum, equal to 1000 at level 1
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 12.5, 13.1, 13.2, 13.3_

  - [x] 4.2 Write property test: line score is base-by-count times level
    - **Property 14: Line score is base-by-count times level**
    - **Validates: Requirements 11.2, 11.3, 11.4, 11.5**

  - [x] 4.3 Write property test: level equals one plus floor(lines / 10)
    - **Property 16: Level equals one plus floor(lines / 10)**
    - **Validates: Requirements 12.5**

  - [x] 4.4 Write property test: fall speed strictly decreasing and bounded below
    - **Property 17: Fall speed is strictly decreasing and bounded below**
    - **Validates: Requirements 13.1, 13.2, 13.3**

  - [x] 4.5 Write unit test: fallSpeedForLevel(1) === 1000
    - Assert the level-1 interval
    - _Requirements: 13.1_

- [x] 5. Checkpoint - pure logic complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement game state machine and reducers
  - [x] 6.1 Implement initial state, spawning, and intent dispatcher
    - In `js/game.js`, implement `newGame(seedPieceFn)` (empty board, score 0, level 1, lines 0, status `playing`, active piece centered in rows 0–1, a next piece), `spawn(state)` (move `next` into `active` centered at top, draw a new `next`, transition to `gameover` if the spawn position is invalid), and `applyIntent(state, intent)` as the single gatekeeper enforcing which intents are allowed per status
    - Keep reducers pure, using `board.js` and `scoring.js`; import nothing from the DOM
    - _Requirements: 3.1, 3.3, 3.4, 11.1, 12.1, 14.1, 16.1, 16.2, 7.4, 14.3, 15.3, 15.5, 17.3, 2.4, 2.5_

  - [x] 6.2 Write property test: spawned and next shapes are always valid keys
    - **Property 9: Spawned and next shapes are always valid shape keys**
    - **Validates: Requirements 2.4, 3.3, 16.1, 16.2**

  - [x] 6.3 Write property test: overlapping spawn triggers game over
    - **Property 10: Overlapping spawn triggers game over**
    - **Validates: Requirements 3.4, 14.1**

  - [x] 6.4 Write unit test: newGame initial values
    - Assert score 0, level 1, lines 0, status `playing`, and a next shape present
    - _Requirements: 11.1, 12.1, 16.1_

  - [x] 6.5 Implement movement, rotation, and drop reducers
    - In `js/game.js`, implement `tryMove(state, dr, dc)`, `tryRotate(state)` (clockwise to next orientation if valid; single-orientation shapes unchanged; reject on collision), `softDrop(state)` (down one row or lock if blocked), `hardDrop(state)` (move to `dropPosition` then lock), and `stepDown(state)` (auto fall tick: down one row or lock if blocked)
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 6.1, 6.2, 7.1, 7.2, 7.3, 8.4, 9.1, 9.2_

  - [x] 6.6 Write property test: active piece is always in a valid position
    - **Property 2: The active piece is always in a valid position**
    - **Validates: Requirements 4.3, 7.3, 8.4**

  - [x] 6.7 Write property test: a valid single step moves exactly one cell
    - **Property 3: A valid single step moves exactly one cell in one direction**
    - **Validates: Requirements 4.1, 4.2, 5.1, 9.1**

  - [x] 6.8 Write property test: blocked downward movement locks the piece
    - **Property 4: Blocked downward movement locks the piece**
    - **Validates: Requirements 5.2, 6.2, 9.2**

  - [x] 6.9 Write property test: hard drop lands at the lowest valid position
    - **Property 6: Hard drop lands at the lowest valid position**
    - **Validates: Requirements 6.1**

  - [x] 6.10 Write property test: rotation is a cycle
    - **Property 7: Rotation is a cycle (four rotations return to origin)**
    - **Validates: Requirements 7.1, 7.2**

  - [x] 6.11 Implement lock resolution and status-transition reducers
    - In `js/game.js`, implement `lockAndResolve(state)` (lock active cells, find and clear full rows, update score/lines/level/fallSpeedMs, then spawn next), and `pause(state)`, `resume(state)`, `restart(state, seedPieceFn)` with the preservation/reset semantics from the design
    - _Requirements: 9.3, 10.1, 10.2, 10.3, 10.4, 11.2, 11.3, 11.4, 11.5, 12.4, 12.5, 13.2, 14.4, 15.1, 15.2, 15.4_

  - [x] 6.12 Write property test: lines counter increases by rows removed
    - **Property 15: Lines counter increases by rows removed**
    - **Validates: Requirements 12.4**

  - [x] 6.13 Write property test: non-playing status ignores gameplay intents
    - **Property 18: Non-playing status ignores gameplay intents**
    - **Validates: Requirements 7.4, 14.3, 15.3, 15.5**

  - [x] 6.14 Write property test: pause then resume is an identity round-trip
    - **Property 19: Pause then resume is an identity round-trip**
    - **Validates: Requirements 15.1, 15.2, 15.4**

  - [x] 6.15 Write property test: restart yields a canonical fresh game
    - **Property 20: Restart yields a canonical fresh game**
    - **Validates: Requirements 14.4**

- [x] 7. Checkpoint - game logic complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement the Block_Image asset loader
  - [x] 8.1 Implement loadBlockImage with ready/failed status and HUD notice
    - In `js/assetLoader.js`, implement `loadBlockImage(src='assets/block.jpg')` returning `{ image, status }` where status becomes `'ready'` on load and `'failed'` on error, exposing a flag the renderer checks to choose image vs fallback, and surfacing a visible HUD notice (plus console log) on failure
    - _Requirements: 19.1, 19.5, 18.5_

- [x] 9. Implement the canvas renderer
  - [x] 9.1 Implement createRenderer and per-cell image+tint / fallback drawing
    - In `js/renderer.js`, implement `createRenderer(boardCanvas, previewCanvas, assets)` returning `{ render(state) }`; draw each occupied cell by scaling the Block_Image into the cell then applying the per-shape tint overlay and 1px border, or filling the per-shape fallback color when the image status is `'failed'`; leave empty cells as background; skip any cell outside 10×20; draw the active piece and the next-piece preview from stored grid positions
    - Update HUD text (score, level, lines) and show/hide the paused and game-over overlays
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.3, 11.6, 12.2, 12.3, 14.2, 15.1, 16.1, 16.2, 16.3, 19.1, 19.4, 19.5_

  - [x] 9.2 Write unit test: failed image status selects fallback colors
    - Assert the renderer's cell-fill selection picks `FALLBACK_COLORS` when image status is `'failed'`
    - _Requirements: 18.5, 19.5_

- [x] 10. Implement keyboard input mapping
  - [x] 10.1 Implement attachInput key-to-intent mapping
    - In `js/input.js`, implement `attachInput(target, dispatch)` adding a `keydown` listener mapping ArrowLeft/ArrowRight to move, ArrowDown to soft drop, Space to hard drop, ArrowUp to rotate, P to pause/resume toggle, R to restart; call `preventDefault` for mapped keys; unmapped keys produce no intent
    - _Requirements: 17.1, 17.3_

  - [x] 10.2 Write property test: unmapped keys produce no intent
    - **Property 21: Unmapped keys produce no intent**
    - **Validates: Requirements 17.3**

  - [x] 10.3 Write unit test: control map covers all required actions
    - Assert the map covers move/soft/hard/rotate/pause/resume/restart
    - _Requirements: 17.1_

- [x] 11. Implement the composition root and game loop
  - [x] 11.1 Wire modules together in main.js with the fall-speed accumulator loop
    - In `js/main.js`, load the Block_Image, build initial state via `newGame`, attach input, start a `requestAnimationFrame` loop with an accumulator that issues one `stepDown` intent each time `fallSpeedMs` elapses while `status === 'playing'`, dispatch intents through `applyIntent`, and call the renderer on each state change; guard module-load errors so failures are observable
    - _Requirements: 9.1, 14.3, 15.2, 18.5_

- [x] 12. Build the page markup and responsive layout
  - [x] 12.1 Author index.html markup, HUD, controls help, and bootstrap guard
    - Fill in `index.html` with the board and preview `<canvas>` elements, HUD regions for score/level/lines, paused and game-over overlay elements, a controls-help section listing each key and its action, and a small inline bootstrap guard that shows a visible error banner if the main module fails to load; reference CSS/JS/image via relative paths
    - _Requirements: 11.6, 12.2, 12.3, 14.2, 15.1, 17.2, 18.1, 18.3, 18.5_

  - [x] 12.2 Author responsive CSS layout
    - In `css/styles.css`, lay out the playfield, preview, HUD, and overlays so they are fully visible with no horizontal scrolling at viewport widths of at least 320px and adjust on resize
    - _Requirements: 17.4, 17.5_

- [x] 13. Final integration and smoke verification
  - [x] 13.1 Verify end-to-end wiring across modules
    - Confirm input intents flow through `applyIntent` to new state and into the renderer, the fall-speed accumulator steps the piece during `playing` only, pause/resume and restart transitions update overlays and state, and the next-piece preview updates on spawn
    - _Requirements: 9.1, 14.4, 15.4, 16.2_

  - [x] 13.2 Run the full test suite via the browser test runner
    - Open `tests/test-runner.html` through a local static server and confirm all unit and property tests pass
    - _Requirements: 18.2_

- [x] 14. Final checkpoint - ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (unit, property, and integration tests) and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each task references the specific requirements and/or design correctness properties it implements for full traceability.
- Property-based tests use the vanilla seedable-PRNG harness in `tests/prng.js`, run at least 100 iterations each, and are tagged `// Feature: tetris-game, Property N: ...`.
- Unit tests cover the fixed, non-input-varying criteria; rendering, responsive layout, controls help, and deployment are verified by the thin integration/smoke checks since they are side-effecting or non-input-varying.
- Checkpoints provide incremental validation points between major layers.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4", "2.1", "3.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.2", "3.3", "4.2", "4.3", "4.4", "4.5", "8.1", "10.1"] },
    { "id": 3, "tasks": ["3.4", "6.1", "10.2", "10.3"] },
    { "id": 4, "tasks": ["3.5", "3.6", "3.7", "3.8", "6.2", "6.3", "6.4", "6.5"] },
    { "id": 5, "tasks": ["6.6", "6.7", "6.8", "6.9", "6.10", "6.11", "9.1"] },
    { "id": 6, "tasks": ["6.12", "6.13", "6.14", "6.15", "9.2", "12.1", "12.2"] },
    { "id": 7, "tasks": ["11.1"] },
    { "id": 8, "tasks": ["13.1", "13.2"] }
  ]
}
```
