function toUrl(origin, path, params) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  return `${origin}${path}?${sp.toString()}`;
}

export function sanitizeMoves(moves) {
  if (!moves) return '';
  // 허용 문자만 남기고 소문자화: r y b g u d l r
  return String(moves).toLowerCase().replace(/[^rybgudlr]/g, '');
}

export function parseUrl(urlLike) {
  try {
    const u = new URL(urlLike, window.location.origin);
    const s = u.searchParams.get('s');
    const p = sanitizeMoves(u.searchParams.get('p') || '');
    const m = (u.searchParams.get('m') || 'c').toLowerCase(); // c=classic, r=random
    const n = (u.searchParams.get('n') || '').trim();
    const c = u.searchParams.get('c');
    const seed = s ? parseInt(s, 36) >>> 0 : null;
    const count = c ? parseInt(c, 10) : undefined;
    return { seed, moves: p, mode: m === 'r' ? 'r' : 'c', name: n, count };
  } catch {
    return { seed: null, moves: '', mode: 'c', name: '' };
  }
}

export function getSeedAndMovesFromUrl() {
  const { seed, moves, mode, name } = parseUrl(window.location.href);
  return { seed, moves, mode, name };
}

export function buildUrlFromState({ seed, moves, mode, name, count }) {
  if (!seed) return window.location.href;
  const s36 = (seed >>> 0).toString(36);
  const m = (mode === 'r' || mode === 'c') ? mode : 'c';
  const n = name ? String(name) : undefined;
  const c = (typeof count === 'number' && isFinite(count) && count > 0) ? String(count) : undefined;
  return toUrl(window.location.origin, window.location.pathname, { s: s36, p: moves || '', m, n, c });
}

export function setUrl(url, replace = false) {
  if (replace) {
    window.history.replaceState({}, '', url);
  } else {
    window.history.pushState({}, '', url);
  }
}


