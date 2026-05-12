// ── Boot ──
async function init() {
  const homeContentPromise = loadHomeContent();
  warmLibraryOnHome();
  await homeContentPromise;

  // Start focus on first content row
  nav.area = 0;
  nav.col = 0;
  focusCurrent();
}

init();
