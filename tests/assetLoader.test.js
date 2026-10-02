// Feature: tetris-game
// Tests for the Block_Image loader in js/assetLoader.js (task 8.1).
//
// loadBlockImage is side-effecting: it builds an Image and, on failure, writes
// a visible HUD notice. These tests stub the global Image (and read the real
// DOM, available in the browser runner) so load/error transitions are
// deterministic rather than depending on a network fetch.

import { test, expect } from './harness.js';
import { loadBlockImage, ASSET_NOTICE_ID } from '../js/assetLoader.js';

// Replace the global Image with a controllable fake for the duration of `fn`,
// capturing the constructed instance so the test can fire onload/onerror.
function withFakeImage(fn) {
  const originalImage = globalThis.Image;
  let created = null;
  class FakeImage {
    constructor() {
      this.onload = null;
      this.onerror = null;
      this._src = '';
      created = this;
    }
    set src(value) {
      this._src = value;
    }
    get src() {
      return this._src;
    }
  }
  globalThis.Image = FakeImage;
  try {
    return fn(() => created);
  } finally {
    globalThis.Image = originalImage;
  }
}

// Validates: Requirements 19.1
test('loadBlockImage starts loading and uses the default Block_Image path', () => {
  withFakeImage((getImage) => {
    const handle = loadBlockImage();
    expect(handle.status).toBe('loading');
    expect(handle.ready).toBe(false);
    expect(getImage().src).toBe('assets/block.jpg');
  });
});

// Validates: Requirements 19.1
test('loadBlockImage transitions to ready on successful load', () => {
  withFakeImage((getImage) => {
    const handle = loadBlockImage('assets/block.jpg');
    getImage().onload();
    expect(handle.status).toBe('ready');
    expect(handle.ready).toBe(true);
  });
});

// Validates: Requirements 19.5
test('loadBlockImage transitions to failed on error', () => {
  withFakeImage((getImage) => {
    const handle = loadBlockImage('assets/does-not-exist.jpg');
    getImage().onerror();
    expect(handle.status).toBe('failed');
    expect(handle.ready).toBe(false);
  });
});

// Validates: Requirements 18.5, 19.5
test('loadBlockImage surfaces a visible HUD notice on failure', () => {
  if (typeof document === 'undefined' || !document.body) {
    // No DOM in this environment; the console log path still runs but there is
    // nothing visible to assert on, so skip without failing.
    return;
  }
  // Clean any notice left by a previous run.
  const existing = document.getElementById(ASSET_NOTICE_ID);
  if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

  withFakeImage((getImage) => {
    loadBlockImage('assets/does-not-exist.jpg');
    getImage().onerror();

    const notice = document.getElementById(ASSET_NOTICE_ID);
    expect(Boolean(notice)).toBe(true);
    expect(notice.hidden).toBe(false);
    expect(notice.textContent.length > 0).toBe(true);

    // Tidy up so the notice does not leak into later tests / the page.
    if (notice && notice.parentNode) notice.parentNode.removeChild(notice);
  });
});
