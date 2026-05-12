// ── Page Switching ──
const navPills = Array.from(document.querySelectorAll('.nav-pill.focusable'));
const settingsItems = Array.from(document.querySelectorAll('.settings-item.focusable'));
let currentPage = 'home';

function switchPage(page) {
  navPills.forEach(p => p.classList.toggle('active', p.dataset.page === page));
  currentPage = page;
  updateNavState();

  if (heroBackdropEl) heroBackdropEl.parentElement.style.display = page === 'home' ? '' : 'none';
  if (contentEl) contentEl.style.display = page === 'home' ? '' : 'none';
  if (libraryEl) libraryEl.classList.toggle('hidden', page !== 'library');
  if (settingsPageEl) settingsPageEl.classList.toggle('hidden', page !== 'settings');
  if (comingSoonEl) comingSoonEl.classList.toggle('hidden', true);

  if (page !== 'library') {
    cancelLibraryRetry();
    stopLibraryPolling();
  }
  if (page === 'library') {
    ensureLibraryLoaded();
    startLibraryPolling();
  }
  if (page === 'settings') {
    updateTunnelUrlLabel(false);
    updatePlaybackHistorySummary();
  }
}

// ── Spatial Navigation ──
function focusCurrent() {
  if (nav.area === 'nav') {
    const pills = navPills;
    nav.col = clamp(nav.col, 0, pills.length - 1);
    const el = pills[nav.col];
    if (el) {
      el.focus({ preventScroll: true });
      switchPage(el.dataset.page);
    }
    return;
  }
  if (nav.area === 'library') {
    const items = nav.libraryItems || [];
    nav.libraryIndex = clamp(nav.libraryIndex, 0, items.length - 1);
    const el = items[nav.libraryIndex];
    if (el) {
      el.focus({ preventScroll: true });
      scrollLibraryIntoView(el);
    }
    return;
  }
  if (nav.area === 'settings') {
    const items = settingsItems;
    nav.settingsIndex = clamp(nav.settingsIndex, 0, items.length - 1);
    const el = items[nav.settingsIndex];
    if (el) el.focus({ preventScroll: true });
    return;
  }
  const row = nav.rows[nav.area] || [];
  nav.col = clamp(nav.col, 0, row.length - 1);
  nav.cols[nav.area] = nav.col;
  const el = row[nav.col];
  if (el) {
    el.focus({ preventScroll: true });
    scrollIntoRow(el);
    scrollToRow(el);
    const movie = (nav.movies[nav.area] || [])[nav.col];
    if (movie) setHero(movie);
  }
}

function scrollToRow(el) {
  const content = contentEl;
  const rowEl = el.closest('.row');
  if (!rowEl) return;
  const rowIdx = Number(rowEl.dataset.rowIndex);
  if (!Number.isNaN(rowIdx) && rowIdx === lastRowScrollIndex) return;
  lastRowScrollIndex = Number.isNaN(rowIdx) ? null : rowIdx;

  // Cache offsetTop to avoid future layout reads
  if (!rowEl.dataset.cachedOffsetTop) {
    rowEl.dataset.cachedOffsetTop = rowEl.offsetTop;
  }
  
  const targetScroll = Number(rowEl.dataset.cachedOffsetTop) - 16;
  scroller.scrollTo(content, null, targetScroll);
}

function scrollIntoRow(el) {
  const scroll = el.closest('.row-scroll');
  if (!scroll) return;
  
  // Mathematical positioning to avoid layout reads (el.offsetLeft, el.offsetWidth, scroll.clientWidth)
  const colIdx = Number(el.dataset.col) || 0;
  const cardWidth = 120;
  const cardGap = 8;
  const rowPaddingLeft = 42;
  
  const elLeft = rowPaddingLeft + (colIdx * (cardWidth + cardGap));
  const elWidth = cardWidth;
  
  // Hardcode visible width assuming 1080p / 720p scaled to CSS pixels.
  // Using window.innerWidth once is much cheaper than reading clientWidth repeatedly.
  if (!window.cachedInnerWidth) window.cachedInnerWidth = window.innerWidth;
  const scrollWidth = window.cachedInnerWidth;
  const targetScroll = Math.max(0, elLeft + (elWidth / 2) - (scrollWidth / 2));
  const currentScroll = parseFloat(scroll.dataset.targetScroll);
  const fallbackScroll = Number.isNaN(currentScroll) ? scroll.scrollLeft : currentScroll;

  if (Math.abs(targetScroll - fallbackScroll) > 1) {
    scroll.dataset.targetScroll = String(targetScroll);
    scroller.scrollTo(scroll, targetScroll, null);
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function totalContentRows() {
  return ROWS.length;
}

function processNavKey(key) {
  const prevArea = nav.area;
  const prevCol = nav.col;
  const prevLib = nav.libraryIndex;

  if (key === 'Enter') {
    if (nav.area === 'library') handleLibraryEnter();
    if (nav.area === 'settings') handleSettingsEnter();
    return;
  }

  if (nav.area === 'settings') {
    if (key === 'ArrowUp') {
      if (nav.settingsIndex === 0) {
        nav.area = 'nav';
        nav.col = navPills.findIndex(p => p.dataset.page === 'settings');
      } else {
        nav.settingsIndex = Math.max(0, nav.settingsIndex - 1);
      }
      focusCurrent();
    } else if (key === 'ArrowDown') {
      nav.settingsIndex = clamp(nav.settingsIndex + 1, 0, settingsItems.length - 1);
      focusCurrent();
    }
    return;
  }

  if (nav.area === 'library') {
    switch (key) {
      case 'ArrowDown':
        nav.libraryIndex = clamp(nav.libraryIndex + 1, 0, (nav.libraryItems || []).length - 1);
        break;
      case 'ArrowUp':
        if (nav.libraryIndex === 0) {
          nav.area = 'nav';
          nav.col = navPills.findIndex(p => p.dataset.page === currentPage);
        } else {
          nav.libraryIndex = Math.max(0, nav.libraryIndex - 1);
        }
        break;
      default:
        break;
    }

    if (nav.area === prevArea && nav.libraryIndex === prevLib) return;
    focusCurrent();
    return;
  }

  switch (key) {
    case 'ArrowRight':
      nav.col++;
      if (nav.area === 'nav') {
        nav.col = clamp(nav.col, 0, navPills.length - 1);
      } else {
        nav.col = clamp(nav.col, 0, (nav.rows[nav.area] || []).length - 1);
      }
      break;

    case 'ArrowLeft':
      nav.col = Math.max(0, nav.col - 1);
      break;

    case 'ArrowDown':
      if (nav.area === 'nav') {
        if (currentPage === 'home') {
          nav.area = 0;
          nav.col = nav.cols[0] ?? 0;
        } else if (currentPage === 'library') {
          nav.area = 'library';
          nav.libraryIndex = 0;
        } else if (currentPage === 'settings') {
          nav.area = 'settings';
          nav.settingsIndex = 0;
          focusCurrent();
          return;
        }
      } else if (nav.area < totalContentRows() - 1) {
        nav.area++;
        nav.col = nav.cols[nav.area] ?? nav.col;
      }
      break;

    case 'ArrowUp':
      if (nav.area === 'nav') return;
      if (nav.area === 0) {
        nav.area = 'nav';
        nav.col = navPills.findIndex(p => p.dataset.page === currentPage);
      } else {
        nav.area--;
        nav.col = nav.cols[nav.area] ?? nav.col;
      }
      break;

    case 'Enter':
      return;
  }

  if (nav.area === prevArea && nav.col === prevCol) return;
  focusCurrent();
}

function handleKey(e) {
  const key = e.key;
  if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(key)) return;
  e.preventDefault();
  
  const now = performance.now();
  
  // Adaptive throttle: faster single taps, slower holds to let scroll keep up
  let throttle;
  if (e.repeat) {
    throttle = 80;
  } else {
    throttle = 16;
  }
  
  if (now - navLastTime < throttle) return;
  
  navLastTime = now;
  processNavKey(key);
}

document.addEventListener('keydown', handleKey);
