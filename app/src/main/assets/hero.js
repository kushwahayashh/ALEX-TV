// ── Hero ──
let heroTimer = null;
let heroFadeTimer = null;
let heroPending = null;
let heroCurrentId = null;
let heroPendingId = null;
let heroPreloadImage = null;
let genreMap = {};

function renderHeroMeta(movie) {
  const parts = [];

  const y = year(movie.release_date || movie.first_air_date);
  if (y) parts.push(`<span class="hero-badge hero-year-badge">${y}</span>`);

  const rating = (movie.vote_average && movie.vote_count >= 50) ? Math.round(movie.vote_average * 10) / 10 : null;
  if (rating) parts.push(`<span class="hero-badge hero-rating-badge">★ ${rating}</span>`);

  const genres = (movie.genre_ids || []).slice(0, 3)
    .map(id => genreMap[id])
    .filter(Boolean)
    .map(g => `<span class="hero-badge hero-genre-badge">${g}</span>`)
    .join('');
  if (genres) parts.push(genres);

  if (heroMetaEl) {
    heroMetaEl.innerHTML = parts.join('');
  }
}

function setHero(movie) {
  if (!movie || !heroBackdropEl || !heroTitleEl || !heroOverviewEl) return;

  const nextPendingId = movie.id || movie.title || movie.name || null;
  if (nextPendingId && (nextPendingId === heroCurrentId || nextPendingId === heroPendingId)) return;
  heroPending = movie;
  heroPendingId = nextPendingId;
  clearTimeout(heroTimer);
  clearTimeout(heroFadeTimer);
  if (heroPreloadImage) {
    heroPreloadImage.onload = null;
    heroPreloadImage.onerror = null;
    heroPreloadImage = null;
  }

  heroTimer = setTimeout(() => {
    const next = heroPending;
    heroPending = null;
    heroPendingId = null;
    if (!next) return;

    const nextId = next.id || next.title || next.name || null;
    if (nextId && nextId === heroCurrentId) return;
    const nextBackdropUrl = backdropURL(next.backdrop_path);

    const applyHero = () => {
      heroCurrentId = nextId;
      heroBackdropEl.className = 'fade-out';
      heroFadeTimer = setTimeout(() => {
        heroBackdropEl.style.backgroundImage = nextBackdropUrl ? `url(${nextBackdropUrl})` : '';
        heroTitleEl.textContent = next.title || next.name || '';
        renderHeroMeta(next);
        heroOverviewEl.textContent = next.overview || '';
        requestAnimationFrame(() => {
          heroBackdropEl.className = 'fade-in';
        });
      }, 140);
    };

    if (!nextBackdropUrl) {
      applyHero();
      return;
    }

    const img = new Image();
    heroPreloadImage = img;
    img.onload = () => {
      if (heroPreloadImage !== img) return;
      heroPreloadImage = null;
      applyHero();
    };
    img.onerror = () => {
      if (heroPreloadImage !== img) return;
      heroPreloadImage = null;
      applyHero();
    };
    img.src = nextBackdropUrl;
  }, 180);
}
