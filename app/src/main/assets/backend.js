const START_TUNNEL_URL = 'https://alexhasitbig--alex-server-start.modal.run';
const BACKEND_CACHE_KEY = 'backend_root_v1';
const BACKEND_IDLE_TIMEOUT = 600 * 1000; // matches server IDLE_TIMEOUT_SECONDS

let backendRoot = null;
let _ensureBackendPromise = null;
let _lastBackendActivity = 0;

function getBackendRoot() {
  return backendRoot || readCachedBackendRoot();
}

function readCachedBackendRoot() {
  if (backendRoot) return backendRoot;
  try {
    const cached = localStorage.getItem(BACKEND_CACHE_KEY);
    if (cached) return cached;
  } catch (err) {
    // Ignore cache read failures.
  }
  return null;
}

function writeCachedBackendRoot(url) {
  backendRoot = url;
  _lastBackendActivity = Date.now();
  try {
    localStorage.setItem(BACKEND_CACHE_KEY, url);
  } catch (err) {
    // Ignore cache write failures.
  }
}

function touchBackendActivity() {
  _lastBackendActivity = Date.now();
}

function isBackendLikelyExpired() {
  return _lastBackendActivity > 0 && (Date.now() - _lastBackendActivity) > BACKEND_IDLE_TIMEOUT;
}

function invalidateBackendCache() {
  backendRoot = null;
  try {
    localStorage.removeItem(BACKEND_CACHE_KEY);
  } catch (err) {
    // Ignore cache clear failures.
  }
}

async function isBackendAlive(url) {
  try {
    const res = await fetchJson(`${url.replace(/\/+$/, '')}/health`);
    return res && res.ok === true;
  } catch (err) {
    return false;
  }
}

async function _doEnsureBackendReady(forceRefresh) {
  if (!forceRefresh && !isBackendLikelyExpired()) {
    const cached = readCachedBackendRoot();
    if (cached && (await isBackendAlive(cached))) {
      backendRoot = cached;
      touchBackendActivity();
      return backendRoot;
    }
  }

  invalidateBackendCache();
  const data = await fetchJson(START_TUNNEL_URL);
  if (!data || !data.url) throw new Error('Backend unavailable');
  writeCachedBackendRoot(data.url);
  return data.url;
}

async function ensureBackendReady(forceRefresh = false) {
  if (_ensureBackendPromise && !forceRefresh) return _ensureBackendPromise;

  _ensureBackendPromise = _doEnsureBackendReady(forceRefresh)
    .catch((err) => {
      _ensureBackendPromise = null;
      invalidateBackendCache();
      throw err;
    })
    .then((url) => {
      _ensureBackendPromise = null;
      return url;
    });

  return _ensureBackendPromise;
}
