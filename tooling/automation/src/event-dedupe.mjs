// Repeat suppression for per-poll dispatcher events.
//
// The dispatcher polls every 30 seconds in a fresh process and used to write
// issue_discovered, eligibility_failed, issue_not_eligible and stalled events
// for every candidate on every poll, whether or not anything had changed. With
// ~67 long-ineligible candidates that was 300-560 MB of events a day and filled
// the disk (2026-09-29). An event is now written when its signature changes
// (new state, new reason) or when the re-emit window has passed, so a stuck
// issue still shows up at least once per window.

export const DEFAULT_REPEAT_WINDOW_MS = 60 * 60 * 1000;

export function createRepeatSuppressor({ state = {}, now = () => Date.now(), windowMs = DEFAULT_REPEAT_WINDOW_MS } = {}) {
  const entries = new Map();
  const cutoff = now() - windowMs * 24;

  for (const [key, value] of Object.entries(state?.entries ?? {})) {
    if (value && typeof value.signature === "string" && Number.isFinite(value.at) && value.at >= cutoff) {
      entries.set(key, { at: value.at, signature: value.signature });
    }
  }

  let dirty = false;

  return {
    /* True when the event should be written; records the decision. */
    shouldEmit(key, signature) {
      const current = now();
      const normalized = String(signature ?? "");
      const previous = entries.get(key);

      if (previous && previous.signature === normalized && current - previous.at < windowMs) {
        return false;
      }

      entries.set(key, { at: current, signature: normalized });
      dirty = true;
      return true;
    },
    isDirty() {
      return dirty;
    },
    toState() {
      dirty = false;
      return { entries: Object.fromEntries(entries), windowMs };
    },
  };
}
