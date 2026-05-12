// ── State ──
const nav = {
  area: 0,
  col: 0,
  cols: [],         // remember last column per row
  rows: [],         // will hold references to focusable arrays per row
  movies: [],       // parallel array: movies[rowIdx][colIdx] = movie data
  libraryIndex: 0,
  libraryItems: [],
  settingsIndex: 0,
};

let navLastTime = 0;
let lastRowScrollIndex = null;
const tmdbCacheMemory = new Map();
const playbackProgressByPath = new Map();

class SmoothScroller {
  constructor() {
    this.targets = new Map();
    this.running = false;
  }
  
  scrollTo(el, targetX, targetY) {
    if (!el) return;
    if (!this.targets.has(el)) {
      this.targets.set(el, { 
        x: el.scrollLeft, 
        y: el.scrollTop, 
        tx: targetX !== null ? targetX : el.scrollLeft, 
        ty: targetY !== null ? targetY : el.scrollTop 
      });
    } else {
      const state = this.targets.get(el);
      if (targetX !== null) state.tx = targetX;
      if (targetY !== null) state.ty = targetY;
    }
    
    if (!this.running) {
      this.running = true;
      requestAnimationFrame(() => this.tick());
    }
  }
  
  isScrolling(el) {
    if (!el) return false;
    const state = this.targets.get(el);
    if (!state) return false;
    const dx = Math.abs(state.tx - state.x);
    const dy = Math.abs(state.ty - state.y);
    return dx > 2 || dy > 2;
  }
  
  tick() {
    let active = false;
    const lerpFactor = 0.22;

    this.targets.forEach((state, el) => {
      const dx = state.tx - state.x;
      const dy = state.ty - state.y;
      
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        state.x += dx * lerpFactor;
        state.y += dy * lerpFactor;
        el.scrollLeft = state.x;
        el.scrollTop = state.y;
        active = true;
      } else {
        el.scrollLeft = state.tx;
        el.scrollTop = state.ty;
        this.targets.delete(el);
      }
    });
    
    if (active) {
      requestAnimationFrame(() => this.tick());
    } else {
      this.running = false;
    }
  }
}
const scroller = new SmoothScroller();

const libraryState = {
  path: LIBRARY_ROOT_PATH,
  items: [],
  visibleItems: [],
  loading: false,
  hasLoaded: false,
  hasError: false,
  retryCount: 0,
  retryTimer: null,
};

const heroBackdropEl = document.getElementById('hero-backdrop');
const heroTitleEl = document.getElementById('hero-title');
const heroMetaEl = document.getElementById('hero-meta');
const heroOverviewEl = document.getElementById('hero-overview');
const contentEl = document.getElementById('content');
const libraryEl = document.getElementById('library');
const settingsPageEl = document.getElementById('settings-page');
const comingSoonEl = document.getElementById('coming-soon');
const libraryListEl = document.getElementById('library-list');
const libraryBreadcrumbsEl = document.getElementById('library-breadcrumbs');
const rowEls = Array.from(document.querySelectorAll('.row'));
const rowScrollEls = rowEls.map(row => row.querySelector('.row-scroll'));
