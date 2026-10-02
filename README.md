# Cat Tetris

A classic Tetris game with a custom twist: every block is rendered using a cat photo.
Built with vanilla HTML, CSS, and JavaScript — no build step, no framework — so it can be
hosted directly on GitHub Pages.

## Features

- Standard 10 x 20 playfield and the 7 standard tetrominoes (I, O, T, S, Z, J, L)
- Move, rotate, soft drop, and hard drop
- Line clears (including multi-line) with standard scoring
- Increasing level and fall speed
- Pause / resume, game over, and restart
- Next-piece preview
- Cat-image blocks with a per-shape tint, plus a solid-color fallback if the image fails to load
- Keyboard controls and a responsive layout down to 320px wide

## Controls

| Key          | Action              |
| ------------ | ------------------- |
| Left / Right | Move piece          |
| Down         | Soft drop           |
| Space        | Hard drop           |
| Up           | Rotate (clockwise)  |
| P            | Pause / resume      |
| R            | Restart             |

## Project structure

```
index.html            Entry point
css/styles.css        Layout and responsive styling
js/                    ES modules (game logic + rendering)
assets/block.jpg       Block image (the cat photo)
tests/                 Browser-based unit and property tests
```

## Running locally

Because the game uses ES modules, serve it over a local static server rather than opening
the file directly:

```
# Python 3
python -m http.server 8000
# then open http://localhost:8000
```

## Deploying to GitHub Pages

1. Create a new repository on GitHub and push this project (see commands below).
2. In the repo, go to Settings > Pages.
3. Under "Build and deployment", set Source to "Deploy from a branch", pick the `main`
   branch and the root folder, and save.
4. Your game will be served at `https://<your-username>.github.io/<repo-name>/`.

## Notes

- The original source photo (`WhatsApp Image ....jpeg`) is git-ignored by default because the
  game uses `assets/block.jpg`. Remove that line from `.gitignore` if you want to track it.
- The game code is implemented by working through the tasks in the project spec.
