// ── Config ──
const API_KEY = '8bd45cfb804f84ce85fa6accd833d6a1';
const BASE    = 'https://api.themoviedb.org/3';
const IMG     = 'https://image.tmdb.org/t/p';
const BACKDROP_SIZE = 'w1280';
const LIBRARY_ROOT_PATH = '/media';
const TMDB_CACHE_PREFIX = 'tmdb_cache_v1:';

// Cache TTLs (ms)
const TMDB_CACHE_TTL_DEFAULT = 3 * 60 * 60 * 1000; // 3 hours
const TMDB_CACHE_TTL_TRENDING = 60 * 60 * 1000;    // 1 hour
const TMDB_CACHE_TTL_POPULAR = 6 * 60 * 60 * 1000; // 6 hours
const TMDB_CACHE_TTL_GENRES = 24 * 60 * 60 * 1000; // 24 hours
const VIDEO_EXTS = new Set([
  'mp4', 'mkv', 'avi', 'mov', 'm4v', 'webm',
  'mpg', 'mpeg', 'flv', 'ts', 'm2ts', '3gp',
  '3gpp', 'ogm', 'ogv', 'wmv'
]);

// ── Endpoints ──
const ROWS = [
  { id: 'trending',    url: `/trending/movie/week?api_key=${API_KEY}`,  type: 'movie' },
  { id: 'popular',     url: `/movie/popular?api_key=${API_KEY}`,       type: 'movie' },
];
