// ── Helpers ──
const nativeBridge = typeof window !== 'undefined' ? window.AndroidBridge : null;
const nativeCallbacks = {};
let nativeCbSeq = 0;
const LIBRARY_ROOT = LIBRARY_ROOT_PATH;

function nativeFetchJson(url) {
  return new Promise((resolve, reject) => {
    const id = `cb_${Date.now()}_${nativeCbSeq++}`;
    nativeCallbacks[id] = { resolve, reject };
    if (!nativeBridge || typeof nativeBridge.fetchJson !== 'function') {
      delete nativeCallbacks[id];
      reject(new Error('Native bridge unavailable'));
      return;
    }
    nativeBridge.fetchJson(url, id);
  });
}

function nativeGetPlaybackProgress(paths) {
  return new Promise((resolve, reject) => {
    const id = `cb_${Date.now()}_${nativeCbSeq++}`;
    nativeCallbacks[id] = { resolve, reject };
    if (!nativeBridge || typeof nativeBridge.getPlaybackProgress !== 'function') {
      delete nativeCallbacks[id];
      resolve({});
      return;
    }
    nativeBridge.getPlaybackProgress(JSON.stringify(paths || []), id);
  });
}

function nativeGetPlaybackHistorySummary() {
  return new Promise((resolve, reject) => {
    const id = `cb_${Date.now()}_${nativeCbSeq++}`;
    nativeCallbacks[id] = { resolve, reject };
    if (!nativeBridge || typeof nativeBridge.getPlaybackHistorySummary !== 'function') {
      delete nativeCallbacks[id];
      resolve({ count: 0, lastUpdatedAt: 0, hasHistory: false });
      return;
    }
    nativeBridge.getPlaybackHistorySummary(id);
  });
}

function nativeClearPlaybackHistory() {
  return new Promise((resolve, reject) => {
    const id = `cb_${Date.now()}_${nativeCbSeq++}`;
    nativeCallbacks[id] = { resolve, reject };
    if (!nativeBridge || typeof nativeBridge.clearPlaybackHistory !== 'function') {
      delete nativeCallbacks[id];
      resolve({ count: 0, lastUpdatedAt: 0, hasHistory: false });
      return;
    }
    nativeBridge.clearPlaybackHistory(id);
  });
}

function updateNavState() {
  if (!nativeBridge || typeof nativeBridge.setNavState !== 'function') return;
  nativeBridge.setNavState(currentPage, libraryState.path || LIBRARY_ROOT);
}

window.__nativeFetchResolve = function(id, ok, payload) {
  const cb = nativeCallbacks[id];
  if (!cb) return;
  delete nativeCallbacks[id];
  if (ok) {
    try {
      cb.resolve(JSON.parse(payload));
    } catch (err) {
      cb.reject(err);
    }
  } else {
    const msg = payload || 'Native fetch failed';
    const err = new Error(msg);
    // Extract HTTP status and body from "HTTP <code> <json>" format
    const httpMatch = msg.match(/^HTTP (\d+)\s*(.*)/);
    if (httpMatch) {
      err.status = parseInt(httpMatch[1], 10);
      try { err.body = JSON.parse(httpMatch[2]); } catch (_) {}
    }
    cb.reject(err);
  }
};

window.__nativePlaybackProgressResolve = function(id, ok, payload) {
  const cb = nativeCallbacks[id];
  if (!cb) return;
  delete nativeCallbacks[id];
  if (ok) {
    try {
      cb.resolve(JSON.parse(payload));
    } catch (err) {
      cb.reject(err);
    }
  } else {
    cb.reject(new Error(payload || 'Playback progress unavailable'));
  }
};

window.__nativePlaybackHistoryResolve = function(id, ok, payload) {
  const cb = nativeCallbacks[id];
  if (!cb) return;
  delete nativeCallbacks[id];
  if (ok) {
    try {
      cb.resolve(JSON.parse(payload));
    } catch (err) {
      cb.reject(err);
    }
  } else {
    cb.reject(new Error(payload || 'Playback history unavailable'));
  }
};

async function fetchJson(url) {
  if (nativeBridge && typeof nativeBridge.fetchJson === 'function') {
    return nativeFetchJson(url);
  }
  const res = await fetch(url);
  if (!res.ok) {
    let body = null;
    try { body = await res.json(); } catch (_) {}
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return res.json();
}
