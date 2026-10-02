# Requirements Document

## Introduction

This feature delivers a classic Tetris game as a polished, browser-based web application built with vanilla HTML, CSS, and JavaScript. The implementation uses no build step and no framework, so it can be committed to a GitHub repository and served directly via GitHub Pages with no server-side dependencies. The game follows standard Tetris rules: the 7 standard tetrominoes, movement and rotation, collision detection, line clears, scoring, increasing level and fall speed, game-over detection, pause/resume, and a next-piece preview, all rendered on a standard 10-column by 20-row playfield. The game uses an image-based block style: each Cell of a tetromino and each Settled_Block is rendered using a provided image asset (a cat photo) rather than plain solid colors. The image asset should be stored in the project under an assets directory with a clean filename (for example, copy and rename the provided WhatsApp image to assets/block.jpg) so that paths stay clean and GitHub Pages friendly.

## Glossary

- **Game**: The complete Tetris web application running in the browser.
- **Playfield**: The grid area where tetrominoes fall and settle, measuring 10 columns wide by 20 rows tall.
- **Tetromino**: A game piece composed of four cells arranged in one of the 7 standard shapes (I, O, T, S, Z, J, L).
- **Active_Tetromino**: The tetromino currently under player control that is falling.
- **Settled_Block**: A cell that belongs to a tetromino that has been locked into the Playfield.
- **Cell**: A single square position within the Playfield grid.
- **Spawn**: The action of placing a new Active_Tetromino at the top of the Playfield.
- **Soft_Drop**: Accelerated downward movement of the Active_Tetromino triggered by the player.
- **Hard_Drop**: Instant downward movement of the Active_Tetromino to its lowest valid position, followed by locking.
- **Lock**: The action of converting the Active_Tetromino into Settled_Blocks when the Active_Tetromino can no longer move down.
- **Line_Clear**: The removal of a fully occupied row from the Playfield.
- **Level**: An integer value that governs fall speed and scoring multipliers, increasing as the player clears lines.
- **Score**: The accumulated numeric points earned by the player.
- **Lines_Cleared_Counter**: The running total count of rows cleared during the current game.
- **Fall_Speed**: The time interval between automatic downward movements of the Active_Tetromino.
- **Next_Piece_Preview**: A display showing the shape of the tetromino that will Spawn next.
- **Game_Over**: The terminal state entered when a newly spawned tetromino cannot be placed.
- **Pause_State**: A state in which game progression is suspended and the Active_Tetromino does not fall.
- **GitHub_Pages**: The static hosting service used to serve the Game over HTTPS from a GitHub repository.
- **Block_Image**: The image asset used to visually render each Cell of a tetromino and each Settled_Block.

## Requirements

### Requirement 1: Render the Playfield

**User Story:** As a player, I want to see a 10-by-20 playfield in my browser, so that I can play Tetris on a standard board.

#### Acceptance Criteria

1. WHEN the Game loads, THE Game SHALL render a Playfield consisting of exactly 10 columns and 20 rows, totaling 200 Cells.
2. WHEN the Game loads, THE Game SHALL render each Settled_Block at the row-and-column grid position stored in the Playfield state, with each Settled_Block occupying exactly one Cell.
3. WHEN the Active_Tetromino position changes, THE Game SHALL render the Active_Tetromino's four Cells at the row-and-column grid positions stored in the Active_Tetromino state.
4. THE Game SHALL render every occupied Cell using the Block_Image and render every empty Cell with the background, such that an occupied Cell and an empty Cell are visually distinguishable.
5. IF the Active_Tetromino state or Playfield state references a grid position outside the bounds of 10 columns by 20 rows, THEN THE Game SHALL not render that Cell and SHALL preserve the existing rendered Playfield state.

### Requirement 2: Standard Tetromino Set

**User Story:** As a player, I want the 7 standard tetrominoes with correct shapes and colors, so that the game matches classic Tetris.

#### Acceptance Criteria

1. THE Game SHALL support exactly the 7 standard tetromino shapes: I, O, T, S, Z, J, and L.
2. THE Game SHALL define each of the 7 tetromino shapes as exactly four connected Cells, and SHALL render each tetromino using those four Cells.
3. THE Game SHALL render each of the 7 tetromino shapes using the Block_Image, and SHALL apply a distinct per-shape visual treatment (such as a colored tint or border overlay) so that each of the 7 shapes is visually distinguishable from the other 6.
4. WHEN a tetromino Spawns, THE Game SHALL select exactly one shape from the 7 standard tetromino shapes.
5. IF a Spawn request references a shape not among the 7 standard tetromino shapes, THEN THE Game SHALL not spawn a tetromino and SHALL preserve the current Playfield state.

### Requirement 3: Spawning Pieces

**User Story:** As a player, I want new pieces to appear at the top of the board, so that gameplay continues after each piece settles.

#### Acceptance Criteria

1. WHEN the Game starts, THE Game SHALL Spawn an Active_Tetromino with its Cells positioned within rows 0 and 1 of the Playfield, horizontally centered.
2. WHEN the Active_Tetromino Locks, THE Game SHALL Spawn the next Active_Tetromino within rows 0 and 1 of the Playfield within 50 milliseconds of the Lock.
3. WHEN a tetromino Spawns, THE Game SHALL select the shape using a uniform random selection from the 7 standard tetromino shapes.
4. IF a newly spawned Active_Tetromino overlaps a Settled_Block at its spawn position, THEN THE Game SHALL enter the Game_Over state.

### Requirement 4: Horizontal Movement

**User Story:** As a player, I want to move the active piece left and right, so that I can position it where I want.

#### Acceptance Criteria

1. WHEN the player presses the ArrowLeft key during active play, THE Game SHALL move the Active_Tetromino exactly one column to the left within 50 milliseconds.
2. WHEN the player presses the ArrowRight key during active play, THE Game SHALL move the Active_Tetromino exactly one column to the right within 50 milliseconds.
3. IF a horizontal move would place any of the four Cells of the Active_Tetromino outside the left or right Playfield boundary or onto a Settled_Block, THEN THE Game SHALL reject the move and keep the Active_Tetromino at its current row and column position.

### Requirement 5: Soft Drop

**User Story:** As a player, I want to soft drop the active piece, so that I can speed up its descent while keeping control.

#### Acceptance Criteria

1. WHEN the player presses the ArrowDown key during active play, THE Game SHALL move the Active_Tetromino down exactly one row within 50 milliseconds, provided all four Cells remain within the Playfield and clear of Settled_Blocks.
2. IF a Soft_Drop would place any Cell of the Active_Tetromino below the bottom row of the Playfield or onto a Settled_Block, THEN THE Game SHALL reject the downward move and Lock the Active_Tetromino at its current position.

### Requirement 6: Hard Drop

**User Story:** As a player, I want to hard drop the active piece, so that I can place it instantly at the bottom.

#### Acceptance Criteria

1. WHEN the player presses the Space key during active play, THE Game SHALL move the Active_Tetromino down to the lowest row where all four of its Cells remain within the Playfield and do not overlap a Settled_Block, within 50 milliseconds.
2. WHEN a Hard_Drop completes, THE Game SHALL Lock the Active_Tetromino at the dropped position within 50 milliseconds.

### Requirement 7: Rotation

**User Story:** As a player, I want to rotate the active piece, so that I can fit it into available spaces.

#### Acceptance Criteria

1. WHEN the player presses the rotate key during active play, THE Game SHALL rotate the Active_Tetromino 90 degrees clockwise to its next orientation.
2. WHERE the Active_Tetromino is a shape with a single orientation, THE Game SHALL leave the Active_Tetromino orientation unchanged when the rotate key is pressed.
3. IF a rotation would place any Cell of the Active_Tetromino outside the left, right, top, or bottom Playfield boundary or onto a Settled_Block, THEN THE Game SHALL reject the rotation and keep the Active_Tetromino at its current orientation.
4. WHILE the Game is in the Pause_State or the Game_Over state, THE Game SHALL ignore rotate inputs.

### Requirement 8: Collision Detection

**User Story:** As a player, I want pieces to respect walls, the floor, and settled blocks, so that the game behaves correctly.

#### Acceptance Criteria

1. IF a proposed movement or rotation would place any Cell of the Active_Tetromino at a column index less than 0 or greater than 9, THEN THE Game SHALL treat the position as invalid.
2. IF a proposed movement or rotation would place any Cell of the Active_Tetromino at a row index greater than 19, THEN THE Game SHALL treat the position as invalid.
3. IF a proposed movement or rotation would place any Cell of the Active_Tetromino onto a Settled_Block, THEN THE Game SHALL treat the position as invalid.
4. WHEN a proposed position is treated as invalid, THE Game SHALL discard the proposed position and retain the last valid position and orientation of the Active_Tetromino.

### Requirement 9: Automatic Fall and Locking

**User Story:** As a player, I want pieces to fall automatically and lock when they can no longer descend, so that the game progresses on its own.

#### Acceptance Criteria

1. WHILE the Game is in active play, THE Game SHALL move the Active_Tetromino down one row each time the Fall_Speed interval elapses.
2. IF the automatic downward move would place any Cell of the Active_Tetromino at a row index greater than 19 or onto a Settled_Block, THEN THE Game SHALL cancel the downward move and Lock the Active_Tetromino at its current position.
3. WHEN the Active_Tetromino Locks, THE Game SHALL convert each of its four Cells into a Settled_Block at the same grid positions in the Playfield.

### Requirement 10: Line Clearing

**User Story:** As a player, I want full rows to clear, including multiple rows at once, so that I can keep playing and earn points.

#### Acceptance Criteria

1. WHEN the Active_Tetromino Locks, THE Game SHALL identify each row of the Playfield in which all 10 Cells are occupied by Settled_Blocks.
2. IF no row has all 10 Cells occupied when the Active_Tetromino Locks, THEN THE Game SHALL leave the Playfield unchanged and perform no Line_Clear operation.
3. WHEN one or more full rows are identified, THE Game SHALL remove all identified full rows from the Playfield in a single Line_Clear operation.
4. WHEN a Line_Clear operation removes rows, THE Game SHALL shift every Settled_Block positioned above a removed row downward by a number of rows equal to the count of removed rows below it, preserving the relative arrangement of the remaining Settled_Blocks.

### Requirement 11: Scoring

**User Story:** As a player, I want to earn points based on lines cleared and level, so that I can track my performance.

#### Acceptance Criteria

1. WHEN a new Game begins, THE Game SHALL set the Score to 0.
2. WHEN a Line_Clear operation removes exactly 1 row, THE Game SHALL increase the Score by 100 multiplied by the current Level.
3. WHEN a Line_Clear operation removes exactly 2 rows, THE Game SHALL increase the Score by 300 multiplied by the current Level.
4. WHEN a Line_Clear operation removes exactly 3 rows, THE Game SHALL increase the Score by 500 multiplied by the current Level.
5. WHEN a Line_Clear operation removes exactly 4 rows, THE Game SHALL increase the Score by 800 multiplied by the current Level.
6. THE Game SHALL display the current Score, as a non-negative integer, in the browser at all times during active play.

### Requirement 12: Level and Lines Counter

**User Story:** As a player, I want to see my level and total lines cleared, so that I can track my progress.

#### Acceptance Criteria

1. WHEN a new Game begins, THE Game SHALL set the Level to 1 and set the Lines_Cleared_Counter to 0.
2. THE Game SHALL display the current Level, as a positive integer, in the browser at all times during active play.
3. THE Game SHALL display the Lines_Cleared_Counter, as a non-negative integer, in the browser at all times during active play.
4. WHEN a Line_Clear operation removes rows, THE Game SHALL increase the Lines_Cleared_Counter by the number of rows removed.
5. WHEN the Lines_Cleared_Counter crosses each multiple of 10, THE Game SHALL set the Level to 1 plus the integer quotient of the Lines_Cleared_Counter divided by 10.

### Requirement 13: Increasing Fall Speed

**User Story:** As a player, I want pieces to fall faster as the level rises, so that the game becomes more challenging.

#### Acceptance Criteria

1. WHEN a new Game begins at Level 1, THE Game SHALL set the Fall_Speed interval to 1000 milliseconds.
2. WHEN the Level increases, THE Game SHALL set the Fall_Speed interval to a value strictly less than the Fall_Speed interval used at the immediately preceding Level, so that the Active_Tetromino advances downward one row more frequently.
3. THE Game SHALL maintain a Fall_Speed interval of at least 1 millisecond at every Level.

### Requirement 14: Game Over and Restart

**User Story:** As a player, I want the game to end when a piece cannot spawn, and I want to restart, so that I can play again.

#### Acceptance Criteria

1. IF a newly spawned Active_Tetromino overlaps a Settled_Block at its spawn position, THEN THE Game SHALL enter the Game_Over state within 100 milliseconds of the spawn attempt.
2. WHEN the Game enters the Game_Over state, THE Game SHALL display a visible Game_Over indication in the browser that remains visible until a restart occurs.
3. WHILE the Game is in the Game_Over state, THE Game SHALL stop moving the Active_Tetromino down automatically and SHALL reject movement, rotation, Soft_Drop, and Hard_Drop inputs.
4. WHEN the player activates the restart control, THE Game SHALL reset the Playfield to empty, set Score to 0, set Level to 1, set Lines_Cleared_Counter to 0, clear any Game_Over indication, and Spawn a new Active_Tetromino within 500 milliseconds of activation.

### Requirement 15: Pause and Resume

**User Story:** As a player, I want to pause and resume the game, so that I can take a break without losing progress.

#### Acceptance Criteria

1. WHEN the player activates the pause control while the Game is in active play, THE Game SHALL enter the Pause_State within 100 milliseconds and display a visible paused indication in the browser.
2. WHILE the Game is in the Pause_State, THE Game SHALL stop moving the Active_Tetromino down automatically and SHALL preserve the Playfield, Score, Level, Lines_Cleared_Counter, and Active_Tetromino position unchanged.
3. WHILE the Game is in the Pause_State, THE Game SHALL reject movement, rotation, Soft_Drop, and Hard_Drop inputs for the Active_Tetromino.
4. WHEN the player activates the resume control while the Game is in the Pause_State, THE Game SHALL exit the Pause_State, remove the paused indication, and resume automatic falling of the Active_Tetromino from its preserved position within 100 milliseconds.
5. IF the player activates the pause control while the Game is not in active play, THEN THE Game SHALL ignore the input and leave the current state unchanged.

### Requirement 16: Next Piece Preview

**User Story:** As a player, I want to see which piece comes next, so that I can plan my moves.

#### Acceptance Criteria

1. WHEN the Game starts, THE Game SHALL display the Next_Piece_Preview showing the shape of the tetromino that will Spawn next.
2. WHEN a tetromino Spawns, THE Game SHALL update the Next_Piece_Preview within 100 milliseconds to show the shape of the following tetromino.
3. THE Game SHALL render the Next_Piece_Preview shape such that its tetromino type is visually distinguishable from the other six tetromino types.

### Requirement 17: Keyboard-Accessible Controls and Responsive Layout

**User Story:** As a player, I want keyboard-accessible controls and a layout that works in the browser, so that I can play comfortably on different screen sizes.

#### Acceptance Criteria

1. THE Game SHALL accept keyboard input for horizontal movement, Soft_Drop, Hard_Drop, rotation, pause, resume, and restart.
2. THE Game SHALL display a description of the keyboard controls in the browser that identifies which key performs each of these actions.
3. IF the player presses a key that is not mapped to any Game action, THEN THE Game SHALL ignore the input and leave the current state unchanged.
4. WHERE the browser viewport width is at least 320 CSS pixels, THE Game SHALL render the Playfield and interface so that they are fully visible within the viewport without horizontal scrolling.
5. WHEN the browser viewport width changes, THE Game SHALL adjust the Playfield and interface within 500 milliseconds so that they remain fully visible within the viewport without horizontal scrolling.

### Requirement 18: GitHub Pages Deployment Structure

**User Story:** As a developer, I want the project structured for static hosting with no build step, so that I can serve it directly from GitHub Pages.

#### Acceptance Criteria

1. THE Game SHALL provide an index.html file at a location that GitHub_Pages serves as the entry point.
2. THE Game SHALL load and run using only HTML, CSS, and JavaScript, with no server-side processing and no runtime build step.
3. THE Game SHALL reference its CSS and JavaScript assets using relative paths that resolve to the correct asset when the Game is served from a GitHub_Pages project subpath.
4. WHEN the Game is served over HTTPS from GitHub_Pages, THE Game SHALL load all referenced CSS and JavaScript assets and become playable entirely within the browser.
5. IF a referenced CSS or JavaScript asset fails to load, THEN THE Game SHALL make the failure observable in the browser rather than continuing silently in a non-functional state.

### Requirement 19: Image-Based Block Rendering

**User Story:** As a player, I want the blocks to be rendered using the provided cat image, so that the game has a custom themed look.

#### Acceptance Criteria

1. THE Game SHALL render each Cell of every Active_Tetromino and every Settled_Block using the Block_Image.
2. THE Game SHALL store the Block_Image as a static asset within the project repository so that it is served by GitHub_Pages alongside the Game.
3. THE Game SHALL reference the Block_Image using a relative path that resolves correctly when the Game is served from a GitHub_Pages project subpath.
4. WHEN the Block_Image is applied to a Cell, THE Game SHALL scale the Block_Image to fit within the bounds of that single Cell.
5. IF the Block_Image fails to load, THEN THE Game SHALL render occupied Cells with a fallback solid color so that the Game remains playable.
