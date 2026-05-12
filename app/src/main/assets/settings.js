function handleSettingsEnter() {
  const items = settingsItems;
  const current = items[nav.settingsIndex];
  if (!current) return;
  const action = current.dataset.action || current.id;

  if (action === 'info' || action === 'settings-tunnel') {
    return;
  }

  if (action === 'update' || action === 'settings-update') {
    const btn = document.getElementById('settings-update-btn');
    if (!btn || btn.disabled) return;
    btn.textContent = 'Downloading...';
    btn.disabled = true;
    if (nativeBridge && typeof nativeBridge.updateApp === 'function') {
      nativeBridge.updateApp('https://github.com/kushwahayashh/ALEX-TV/releases/download/latest/ALEX-TV.apk');
    }
    return;
  }

  if (action === 'refresh' || action === 'settings-refresh') {
    const btn = document.getElementById('settings-refresh-btn');
    if (!btn || btn.disabled) return;
    btn.textContent = 'Refreshing...';
    btn.disabled = true;
    clearTmdbCache();
    loadHomeContent({ bypassCache: true })
      .then(() => {
        btn.textContent = 'Refresh Now';
      })
      .catch(() => {
        btn.textContent = 'Refresh Failed';
        setTimeout(() => {
          btn.textContent = 'Refresh Now';
        }, 1200);
      })
      .finally(() => {
        btn.disabled = false;
      });
    return;
  }

  if (action === 'clear-history' || action === 'settings-history') {
    const btn = document.getElementById('settings-history-btn');
    if (!btn || btn.disabled) return;
    btn.textContent = 'Clearing...';
    btn.disabled = true;
    nativeClearPlaybackHistory()
      .then((summary) => {
        playbackProgressByPath.clear();
        if (currentPage === 'library') {
          renderLibrary();
        }
        updatePlaybackHistorySummary(summary);
        btn.textContent = 'Cleared';
        setTimeout(() => {
          btn.textContent = 'Clear History';
        }, 1200);
      })
      .catch(() => {
        btn.textContent = 'Clear Failed';
        setTimeout(() => {
          btn.textContent = 'Clear History';
        }, 1200);
      })
      .finally(() => {
        btn.disabled = false;
      });
  }
}

async function updateTunnelUrlLabel(forceRefresh = false) {
  const el = document.getElementById('settings-tunnel-url');
  if (!el) return;

  const currentRoot = getBackendRoot();
  if (currentRoot) {
    el.textContent = currentRoot;
  } else {
    el.textContent = 'Checking...';
  }

  try {
    const url = await ensureBackendReady(forceRefresh);
    el.textContent = url;
  } catch (err) {
    if (!getBackendRoot()) {
      el.textContent = 'Unavailable';
    }
  }
}

function formatHistorySummary(summary) {
  if (!summary || !summary.hasHistory || !summary.count) {
    return 'No playback history yet';
  }

  const lastUpdated = summary.lastUpdatedAt
    ? new Date(summary.lastUpdatedAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Unknown';

  const itemLabel = summary.count === 1 ? 'item' : 'items';
  return `${summary.count} ${itemLabel} • Last updated ${lastUpdated}`;
}

function applyPlaybackHistorySummary(summary) {
  const desc = document.getElementById('settings-history-desc');
  const btn = document.getElementById('settings-history-btn');
  if (desc) {
    desc.textContent = formatHistorySummary(summary);
  }
  if (btn) {
    btn.disabled = !summary || !summary.hasHistory || !summary.count;
  }
}

async function updatePlaybackHistorySummary(prefetchedSummary = null) {
  const desc = document.getElementById('settings-history-desc');
  if (desc && !prefetchedSummary) {
    desc.textContent = 'Checking playback history...';
  }
  try {
    const summary = prefetchedSummary || await nativeGetPlaybackHistorySummary();
    applyPlaybackHistorySummary(summary);
  } catch (_) {
    applyPlaybackHistorySummary({ count: 0, lastUpdatedAt: 0, hasHistory: false });
  }
}
