// A revision check prevents one device from silently overwriting another.
export function nextRevision(actual, expected) {
  if (actual !== expected) {
    const error = new Error('Your progress changed on another device. Export your current draft, then reload to load the newer version.');
    error.code = 'sync/conflict';
    throw error;
  }
  return actual + 1;
}
export function serializeProgress(state) {
  const payload = JSON.stringify(state);
  if (new TextEncoder().encode(payload).length > 700000) {
    throw new Error('Your notes are too large to sync. Export a backup and shorten your notes.');
  }
  return payload;
}
