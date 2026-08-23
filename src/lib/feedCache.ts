let cachedFeed: any[] = [];
let cachedAt = 0;

const KEY = "reseepee.feed.cache";
const TTL = 1000 * 60 * 3;

export const setFeedCache = (rows: any[]) => {
  cachedFeed = rows;
  cachedAt = Date.now();
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ rows, cachedAt }));
  } catch {
    // Ignore storage limits/private mode.
  }
};

export const getFeedCache = <T,>(): T[] => {
  if (cachedFeed.length && Date.now() - cachedAt < TTL) return cachedFeed as T[];
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.rows) || Date.now() - parsed.cachedAt > TTL) return [];
    cachedFeed = parsed.rows;
    cachedAt = parsed.cachedAt;
    return cachedFeed as T[];
  } catch {
    return [];
  }
};