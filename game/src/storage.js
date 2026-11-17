// The best run, kept in the browser between visits. Storage can be missing or blocked (a private
// window, a sandboxed preview), so every read and write is guarded and the game plays on without it.
const KEY = 'last-mile.best';

/** The best score saved on this browser, or 0. */
export function loadBest() {
  try {
    const value = Number(window.localStorage.getItem(KEY));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

/** Save `score` as the best run. */
export function saveBest(score) {
  try {
    window.localStorage.setItem(KEY, String(Math.floor(score)));
  } catch {
    // Storage is unavailable: the best run lasts for this visit only.
  }
}
