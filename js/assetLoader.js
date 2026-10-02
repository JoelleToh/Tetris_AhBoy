// assetLoader.js — Block_Image loader with ready/failed status (task 8.1).
//
// This module is intentionally side-effecting: it constructs an HTMLImageElement
// to load the Block_Image and, on failure, writes a visible notice into the HUD.
// The renderer consumes the returned handle and checks `status`/`ready` to decide
// whether to paint cells with the image or with each shape's fallback color.
// (Requirements 19.1, 19.5, 18.5.)

/**
 * The DOM id of the HUD region used to surface a visible asset-failure notice.
 * The element is optional — if it is absent, the loader falls back to appending
 * a notice to <body>, and if even that is unavailable (e.g. in tests) it only
 * logs to the console. This keeps the loader safe to call before the HUD markup
 * exists.
 */
export const ASSET_NOTICE_ID = 'asset-notice';

const BLOCK_IMAGE_FAILURE_MESSAGE =
  'Block image failed to load — using fallback colors.';

/**
 * Surface a visible notice that the Block_Image failed to load, so the failure
 * is observable rather than silent. Writes into the HUD notice region when the
 * DOM is available and always logs to the console. (Requirements 18.5, 19.5.)
 *
 * @param {string} message the human-readable failure notice
 */
function showAssetNotice(message) {
  // Always log, even when there is no DOM (tests, headless environments).
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(message);
  }

  if (typeof document === 'undefined' || !document) return;

  let notice = document.getElementById(ASSET_NOTICE_ID);
  if (!notice) {
    const host = document.body;
    if (!host) return; // No place to attach the notice; the console log stands.
    notice = document.createElement('div');
    notice.id = ASSET_NOTICE_ID;
    notice.setAttribute('role', 'alert');
    host.appendChild(notice);
  }

  notice.textContent = message;
  notice.hidden = false;
}

/**
 * Load the Block_Image and return a mutable handle the renderer can poll.
 *
 * The returned object's `status` begins as `'loading'` and transitions to
 * `'ready'` once the image loads or `'failed'` if it errors. A convenience
 * boolean `ready` mirrors `status === 'ready'` so the renderer can cheaply
 * choose image vs. fallback-color rendering. On failure the loader also surfaces
 * a visible HUD notice and logs to the console. (Requirements 19.1, 19.5, 18.5.)
 *
 * @param {string} [src='assets/block.jpg'] relative path to the Block_Image
 * @returns {{ image: HTMLImageElement, status: string, ready: boolean }}
 *   a live handle whose `status`/`ready` fields update as loading resolves
 */
export function loadBlockImage(src = 'assets/block.jpg') {
  const image = new Image();

  const handle = {
    image,
    status: 'loading',
    ready: false,
  };

  image.onload = () => {
    handle.status = 'ready';
    handle.ready = true;
  };

  image.onerror = () => {
    handle.status = 'failed';
    handle.ready = false;
    showAssetNotice(BLOCK_IMAGE_FAILURE_MESSAGE);
  };

  // Kick off loading. Assigning src after wiring handlers ensures a cached or
  // immediately-failing load still triggers the callbacks.
  image.src = src;

  return handle;
}
