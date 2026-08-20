/**
 * Defers the initial timeline request until after effect setup. This keeps the
 * request intact when React development StrictMode replays setup and cleanup.
 */
export function scheduleInitialTimelineLoad(
  hasLoaded: () => boolean,
  markLoaded: () => void,
  load: () => void,
): () => void {
  const timer = setTimeout(() => {
    if (hasLoaded()) return;
    markLoaded();
    load();
  }, 0);

  return () => clearTimeout(timer);
}
