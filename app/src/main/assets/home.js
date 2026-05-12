// ── Cards ──
function createCard(movie, rowIdx, colIdx) {
  const el = document.createElement('div');
  el.className = 'card focusable';
  el.tabIndex = -1;
  el.dataset.row = rowIdx;
  el.dataset.col = colIdx;

  const img = document.createElement('img');
  img.className = 'card-poster is-loading';
  img.alt = '';
  img.loading = 'lazy';
  img.addEventListener('load', () => {
    img.classList.remove('is-loading');
    img.classList.add('is-loaded');
  }, { once: true });
  img.addEventListener('error', () => {
    img.classList.remove('is-loading');
  }, { once: true });
  img.src = posterURL(movie.poster_path);

  if (img.complete && img.naturalWidth > 0) {
    img.classList.remove('is-loading');
    img.classList.add('is-loaded');
  }

  el.appendChild(img);
  return el;
}

function renderRow(rowEl, movies, rowIdx) {
  const scroll = rowScrollEls[rowIdx] || rowEl.querySelector('.row-scroll');
  const frag = document.createDocumentFragment();
  rowEl.dataset.rowIndex = rowIdx;
  const focusables = [];
  nav.movies[rowIdx] = movies;
  movies.forEach((movie, i) => {
    const card = createCard(movie, rowIdx, i);
    frag.appendChild(card);
    focusables.push(card);
  });
  scroll.replaceChildren(frag);
  nav.rows[rowIdx] = focusables;
}

// ── Skeleton loaders ──
function showSkeletons() {
  rowScrollEls.forEach(scroll => {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 8; i++) {
      const el = document.createElement('div');
      el.className = 'card skeleton';
      el.innerHTML = '<img class="card-poster" src="" alt="">';
      frag.appendChild(el);
    }
    scroll.replaceChildren(frag);
  });
}

async function loadHomeContent(options = {}) {
  const { bypassCache = false } = options;
  showSkeletons();

  const fetchOptions = bypassCache ? { bypassCache: true } : undefined;
  const [genreData, ...results] = await Promise.all([
    tmdbFetch(`/genre/movie/list?api_key=${API_KEY}`, fetchOptions),
    ...ROWS.map(r => tmdbFetch(r.url, fetchOptions))
  ]);

  genreMap = {};
  if (genreData && genreData.genres) {
    genreData.genres.forEach(g => { genreMap[g.id] = g.name; });
  }

  const heroMovie = results[0].results[0];
  if (heroMovie) setHero(heroMovie);

  results.forEach((data, i) => {
    renderRow(rowEls[i], data.results, i);
  });
}
