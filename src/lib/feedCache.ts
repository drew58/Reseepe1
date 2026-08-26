type FeedName = "home" | "reels";

const memoryCache = new Map<FeedName, { rows: any[]; cachedAt: number }>();
const TTL = 1000 * 60 * 3;

const keyFor = (feed: FeedName) => `reseepe.feed.${feed}`;

export const setFeedCache = (feed: FeedName, rows: any[]) => {
  const cachedAt = Date.now();
  memoryCache.set(feed, { rows, cachedAt });
  try {
    sessionStorage.setItem(keyFor(feed), JSON.stringify({ rows, cachedAt }));
  } catch {
    // Ignore storage limits/private mode.
  }
};

export const getFeedCache = <T,>(feed: FeedName): T[] => {
  const inMemory = memoryCache.get(feed);
  if (inMemory && Date.now() - inMemory.cachedAt < TTL) return inMemory.rows as T[];
  try {
    const raw = sessionStorage.getItem(keyFor(feed));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.rows) || Date.now() - parsed.cachedAt > TTL) return [];
    memoryCache.set(feed, { rows: parsed.rows, cachedAt: parsed.cachedAt });
    return parsed.rows as T[];
  } catch {
    return [];
  }
};
