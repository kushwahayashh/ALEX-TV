function getTmdbCacheTtl(path) {
  if (path.startsWith('/trending/')) return TMDB_CACHE_TTL_TRENDING;
  if (path.startsWith('/movie/popular')) return TMDB_CACHE_TTL_POPULAR;
  if (path.startsWith('/genre/')) return TMDB_CACHE_TTL_GENRES;
  return TMDB_CACHE_TTL_DEFAULT;
}

function isValidCacheEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (typeof entry.expiresAt !== 'number') return false;
  if (!Object.prototype.hasOwnProperty.call(entry, 'data')) return false;
  return true;
}

function sweepTmdbCache(now = Date.now()) {
  for (const [key, entry] of tmdbCacheMemory.entries()) {
    if (!entry || entry.expiresAt <= now) {
      tmdbCacheMemory.delete(key);
    }
  }
}

function readTmdbCache(path) {
  const key = TMDB_CACHE_PREFIX + path;
  const now = Date.now();

  sweepTmdbCache(now);

  if (tmdbCacheMemory.has(key)) {
    const entry = tmdbCacheMemory.get(key);
    if (entry && entry.expiresAt > now) return entry.data;
    tmdbCacheMemory.delete(key);
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!isValidCacheEntry(entry)) {
      localStorage.removeItem(key);
      return null;
    }
    if (entry.expiresAt > now) {
      tmdbCacheMemory.set(key, entry);
      return entry.data;
    }
    localStorage.removeItem(key);
  } catch (err) {
    // Ignore cache read failures (e.g. storage disabled)
  }

  return null;
}

function writeTmdbCache(path, data, ttlMs) {
  const key = TMDB_CACHE_PREFIX + path;
  const entry = {
    expiresAt: Date.now() + ttlMs,
    data
  };
  sweepTmdbCache();
  tmdbCacheMemory.set(key, entry);
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (err) {
    // Ignore cache write failures (e.g. quota exceeded)
  }
}

function clearTmdbCache() {
  tmdbCacheMemory.clear();
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(TMDB_CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch (err) {
    // Ignore cache clear failures
  }
}

async function tmdbFetch(path, options = {}) {
  const { bypassCache = false, ttlMs } = options;
  if (!bypassCache) {
    const cached = readTmdbCache(path);
    if (cached) return cached;
  }

  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const ttl = typeof ttlMs === 'number' ? ttlMs : getTmdbCacheTtl(path);
  writeTmdbCache(path, data, ttl);
  return data;
}

function posterURL(path, size = 'w300') {
  return path ? `${IMG}/${size}${path}` : '';
}

function backdropURL(path, size = BACKDROP_SIZE) {
  return path ? `${IMG}/${size}${path}` : '';
}

function year(dateStr) {
  return dateStr ? dateStr.split('-')[0] : '';
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  const digits = size >= 10 || unit === 0 ? 0 : 1;
  return `${size.toFixed(digits)} ${units[unit]}`;
}

function isVideoFile(pathOrName) {
  if (!pathOrName) return false;
  const lower = String(pathOrName).toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot <= 0 || dot === lower.length - 1) return false;
  const ext = lower.slice(dot + 1);
  return VIDEO_EXTS.has(ext);
}
