// ── Library ──
function setLibraryStatus(text) {
  const el = document.getElementById('library-status');
  if (!el) return;
  if (!text) {
    el.textContent = '';
    el.classList.add('hidden');
    return;
  }
  el.textContent = text;
  el.classList.remove('hidden');
}

function getParentPath(path) {
  if (!path || path === LIBRARY_ROOT) return null;
  const trimmed = path.replace(/\/+$/, '');
  const idx = trimmed.lastIndexOf('/');
  if (idx <= 0) return LIBRARY_ROOT;
  const parent = trimmed.slice(0, idx);
  if (!parent.startsWith(LIBRARY_ROOT)) return LIBRARY_ROOT;
  return parent || LIBRARY_ROOT;
}

window.__libraryBack = function() {
  const parent = getParentPath(libraryState.path || LIBRARY_ROOT);
  if (!parent) {
    window.__goHome && window.__goHome();
    return;
  }
  nav.libraryIndex = 0;
  loadLibrary(parent);
};

window.__goHome = function() {
  nav.area = 'nav';
  nav.col = navPills.findIndex(p => p.dataset.page === 'home');
  switchPage('home');
  focusCurrent();
};

function isLikelyBackendError(err) {
  if (!err) return false;
  const status = err.status;
  if (typeof status === 'number') {
    if ([401, 403, 404, 408, 429, 500, 502, 503, 504].includes(status)) return true;
  }
  const msg = String(err.message || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('http 5') ||
    msg.includes('http 4') ||
    msg.includes('cors')
  );
}

const LIBRARY_POLL_INTERVAL = 10000; // 10 seconds
let libraryPollTimer = null;

function startLibraryPolling() {
  stopLibraryPolling();
  libraryPollTimer = setInterval(() => {
    if (currentPage !== 'library' || libraryState.loading) return;
    loadLibrary(libraryState.path || LIBRARY_ROOT_PATH);
  }, LIBRARY_POLL_INTERVAL);
}

function stopLibraryPolling() {
  if (libraryPollTimer) {
    clearInterval(libraryPollTimer);
    libraryPollTimer = null;
  }
}

function cancelLibraryRetry() {
  if (libraryState.retryTimer) {
    clearTimeout(libraryState.retryTimer);
    libraryState.retryTimer = null;
  }
}

function scheduleLibraryRetry(reason) {
  if (libraryState.retryTimer || currentPage !== 'library') return;
  const delay = Math.min(1000 * Math.pow(1.5, libraryState.retryCount), 10000);
  libraryState.retryCount += 1;
  setLibraryStatus(`${reason} Retrying in ${Math.ceil(delay / 1000)}s...`);
  libraryState.retryTimer = setTimeout(() => {
    libraryState.retryTimer = null;
    loadLibrary(libraryState.path || LIBRARY_ROOT_PATH);
  }, delay);
}

async function loadLibrary(path, didRetry = false) {
  if (libraryState.loading) return;
  cancelLibraryRetry();
  libraryState.loading = true;
  setLibraryStatus(isBackendLikelyExpired() ? 'Reconnecting...' : 'Loading library...');
  try {
    const root = await ensureBackendReady(false);
    const listUrl = `${root.replace(/\/+$/, '')}/list?path=${encodeURIComponent(path)}`;
    const data = await fetchJson(listUrl);
    touchBackendActivity();
    libraryState.path = data.path || path;
    libraryState.items = Array.isArray(data.items) ? data.items : [];
    libraryState.visibleItems = [];
    libraryState.hasLoaded = true;
    libraryState.hasError = false;
    libraryState.retryCount = 0;
    await refreshLibraryPlaybackProgress(libraryState.items);
    updateNavState();
    renderLibrary();
    setLibraryStatus(libraryState.visibleItems.length ? '' : 'Empty folder');
  } catch (err) {
    if (!didRetry) {
      invalidateBackendCache();
      try {
        await ensureBackendReady(true);
        libraryState.loading = false;
        return loadLibrary(path, true);
      } catch (_) {
        // fall through to error handling
      }
    }
    libraryState.items = [];
    libraryState.visibleItems = [];
    libraryState.hasLoaded = false;
    libraryState.hasError = true;
    playbackProgressByPath.clear();
    renderLibrary();
    setLibraryStatus('Backend unavailable');
    scheduleLibraryRetry('Backend unavailable.');
  } finally {
    libraryState.loading = false;
  }
}

function renderLibrary() {
  renderLibraryBreadcrumbs();
  const list = libraryListEl;
  if (!list) return;
  list.innerHTML = '';

  const items = (libraryState.items || []).filter((item) => {
    if (item.type === 'folder') return true;
    if (item.type === 'file') return isVideoFile(item.name || item.path || '');
    return false;
  });
  libraryState.visibleItems = items;
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'library-empty';
    empty.textContent = libraryState.hasError ? 'Unable to load library' : 'No items found';
    list.appendChild(empty);
    nav.libraryItems = [];
    nav.libraryIndex = 0;
    return;
  }

  const frag = document.createDocumentFragment();
  items.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'library-item focusable';
    row.tabIndex = -1;
    row.dataset.index = String(i);
    row.dataset.path = item.path || '';
    row.dataset.type = item.type || '';

    const icon = document.createElement('div');
    icon.className = 'library-icon';
    icon.innerHTML = item.type === 'folder'
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="icon icon-tabler icons-tabler-filled icon-tabler-folder"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 3a1 1 0 0 1 .608 .206l.1 .087l2.706 2.707h6.586a3 3 0 0 1 2.995 2.824l.005 .176v8a3 3 0 0 1 -2.824 2.995l-.176 .005h-14a3 3 0 0 1 -2.995 -2.824l-.005 -.176v-11a3 3 0 0 1 2.824 -2.995l.176 -.005h4z" /></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="icon icon-tabler icons-tabler-filled icon-tabler-badge-hd"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M19 4a3 3 0 0 1 3 3v10a3 3 0 0 1 -3 3h-14a3 3 0 0 1 -3 -3v-10a3 3 0 0 1 3 -3zm-4 4h-1a1 1 0 0 0 -1 1v6a1 1 0 0 0 1 1h1a3 3 0 0 0 3 -3v-2a3 3 0 0 0 -3 -3m-5 0a1 1 0 0 0 -1 1v2h-1v-2a1 1 0 0 0 -.883 -.993l-.117 -.007a1 1 0 0 0 -1 1v6a1 1 0 0 0 2 0v-2h1v2a1 1 0 0 0 .883 .993l.117 .007a1 1 0 0 0 1 -1v-6a1 1 0 0 0 -1 -1m5 2a1 1 0 0 1 1 1v2a1 1 0 0 1 -.883 .993l-.117 .007z" /></svg>';

    const name = document.createElement('div');
    name.className = 'library-name';
    name.textContent = item.name || item.path || 'Untitled';

    const content = document.createElement('div');
    content.className = 'library-content';
    content.appendChild(name);

    const progressEntry = item.type === 'file' ? playbackProgressByPath.get(item.path || '') : null;
    const progressValue = Math.max(0, Math.min(1, Number(progressEntry && progressEntry.progress) || 0));
    if (progressValue > 0) {
      const progressTrack = document.createElement('div');
      progressTrack.className = 'library-progress';
      const progressFill = document.createElement('div');
      progressFill.className = 'library-progress-fill';
      progressFill.style.width = `${Math.max(progressValue * 100, 2)}%`;
      progressTrack.appendChild(progressFill);
      content.appendChild(progressTrack);
    }

    const left = document.createElement('div');
    left.className = 'library-left';
    left.appendChild(icon);
    left.appendChild(content);

    const meta = document.createElement('div');
    meta.className = 'library-meta';
    const typeLabel = item.type === 'folder' ? 'Folder' : 'File';
    const sizeLabel = item.type === 'file' ? formatBytes(item.size || 0) : '';
    meta.textContent = sizeLabel ? `${typeLabel} • ${sizeLabel}` : typeLabel;

    row.appendChild(left);
    row.appendChild(meta);
    frag.appendChild(row);
  });
  list.appendChild(frag);

  nav.libraryItems = Array.from(document.querySelectorAll('#library .library-item.focusable'));
  nav.libraryIndex = clamp(nav.libraryIndex, 0, nav.libraryItems.length - 1);
  if (currentPage === 'library' && nav.area === 'library') {
    focusCurrent();
  }
}

function getFolderIconSvg() {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="icon icon-tabler icons-tabler-filled icon-tabler-folder"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 3a1 1 0 0 1 .608 .206l.1 .087l2.706 2.707h6.586a3 3 0 0 1 2.995 2.824l.005 .176v8a3 3 0 0 1 -2.824 2.995l-.176 .005h-14a3 3 0 0 1 -2.995 -2.824l-.005 -.176v-11a3 3 0 0 1 2.824 -2.995l.176 -.005h4z" /></svg>';
}

function getLibraryPathSegments(path) {
  const normalized = (path || LIBRARY_ROOT).replace(/\/+$/, '') || LIBRARY_ROOT;
  const parts = normalized.split('/').filter(Boolean);
  const segments = [];

  if (!parts.length) {
    return [{ label: 'Home', path: LIBRARY_ROOT }];
  }

  let current = '';
  parts.forEach((part, index) => {
    current += `/${part}`;
    segments.push({
      label: index === 0 ? 'Home' : part,
      path: current,
      isCurrent: index === parts.length - 1
    });
  });

  if (segments[0] && segments[0].path !== LIBRARY_ROOT) {
    segments.unshift({ label: 'Home', path: LIBRARY_ROOT, isCurrent: normalized === LIBRARY_ROOT });
  } else if (segments[0]) {
    segments[0].label = 'Home';
  }

  return segments;
}

function renderLibraryBreadcrumbs() {
  const container = libraryBreadcrumbsEl;
  if (!container) return;
  container.innerHTML = '';

  const segments = getLibraryPathSegments(libraryState.path || LIBRARY_ROOT);
  const parentPath = getParentPath(libraryState.path || LIBRARY_ROOT);
  const row = document.createElement('div');
  row.className = 'library-item focusable';
  row.tabIndex = -1;
  row.dataset.type = 'breadcrumb';
  row.dataset.path = parentPath || '';

  const left = document.createElement('div');
  left.className = 'library-left';

  const icon = document.createElement('div');
  icon.className = 'library-icon';
  icon.innerHTML = getFolderIconSvg();

  const content = document.createElement('div');
  content.className = 'library-content';

  const name = document.createElement('div');
  name.className = 'library-name';
  name.textContent = segments.map(segment => segment.label).join(' / ');
  content.appendChild(name);

  left.appendChild(icon);
  left.appendChild(content);
  row.appendChild(left);
  container.appendChild(row);
}

function scrollLibraryIntoView(el) {
  if (!el) return;
  const list = libraryListEl;
  if (!list) return;
  const elTop = el.offsetTop;
  const elHeight = el.offsetHeight;
  const listHeight = list.clientHeight;
  const targetScroll = Math.max(0, elTop + (elHeight / 2) - (listHeight / 2));
  const currentScroll = parseFloat(list.dataset.targetScroll);
  const fallbackScroll = Number.isNaN(currentScroll) ? list.scrollTop : currentScroll;

  if (Math.abs(targetScroll - fallbackScroll) > 1) {
    list.dataset.targetScroll = String(targetScroll);
    scroller.scrollTo(list, null, targetScroll);
  }
}

async function openLibraryFile(item, didRetry = false) {
  if (!item || !item.path) return;
  try {
    setLibraryStatus('Opening file...');
    const root = await ensureBackendReady(false);
    const streamUrl = `${root.replace(/\/+$/, '')}/stream?path=${encodeURIComponent(item.path)}`;
    if (nativeBridge && typeof nativeBridge.play === 'function') {
      nativeBridge.play(streamUrl, item.name || '', item.path || '');
      return true;
    }
    throw new Error('Native player unavailable');
  } catch (err) {
    if (!didRetry) {
      invalidateBackendCache();
      try {
        await ensureBackendReady(true);
        return openLibraryFile(item, true);
      } catch (_) {
        // fall through to error handling
      }
    }
    setLibraryStatus('Unable to open file');
  }
}

async function refreshLibraryPlaybackProgress(items = libraryState.items) {
  const paths = (items || [])
    .filter(item => item && item.type === 'file' && item.path)
    .map(item => item.path);

  playbackProgressByPath.clear();
  if (!paths.length) return;

  try {
    const payload = await nativeGetPlaybackProgress(paths);
    Object.entries(payload || {}).forEach(([path, entry]) => {
      playbackProgressByPath.set(path, entry);
    });
  } catch (_) {
    playbackProgressByPath.clear();
  }
}

window.__refreshPlaybackProgress = function() {
  if (currentPage !== 'library') return;
  refreshLibraryPlaybackProgress(libraryState.items).then(() => {
    renderLibrary();
  }).catch(() => {});
};

function handleLibraryEnter() {
  const focused = (nav.libraryItems || [])[nav.libraryIndex];
  if (!focused) return;
  if (focused.dataset.type === 'breadcrumb') {
    const parent = focused.dataset.path || getParentPath(libraryState.path || LIBRARY_ROOT);
    if (parent) {
      nav.libraryIndex = 0;
      loadLibrary(parent);
    }
    return;
  }
  const item = (libraryState.visibleItems || [])[Math.max(0, nav.libraryIndex - 1)];
  if (!item) return;
  if (item.type === 'folder') {
    nav.libraryIndex = 1;
    loadLibrary(item.path);
  } else {
    openLibraryFile(item);
  }
}

function ensureLibraryLoaded() {
  if (!libraryState.loading) {
    loadLibrary(libraryState.path || LIBRARY_ROOT_PATH);
  }
}

function warmLibraryOnHome() {
  if (libraryState.hasLoaded || libraryState.loading) return;
  loadLibrary(libraryState.path || LIBRARY_ROOT_PATH).catch(() => {});
}
