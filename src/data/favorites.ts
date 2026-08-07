const favoritesKey = 'racketpoint-favorites-v1';

function hasWindow() {
  return typeof window !== 'undefined';
}

export function getFavoriteSkus() {
  if (!hasWindow()) {
    return [] as string[];
  }

  const raw = window.localStorage.getItem(favoritesKey);
  if (!raw) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

export function isFavoriteSku(sku: string) {
  return getFavoriteSkus().includes(sku);
}

export function toggleFavoriteSku(sku: string) {
  if (!hasWindow()) {
    return false;
  }

  const favorites = new Set(getFavoriteSkus());

  if (favorites.has(sku)) {
    favorites.delete(sku);
  } else {
    favorites.add(sku);
  }

  window.localStorage.setItem(favoritesKey, JSON.stringify([...favorites]));
  window.dispatchEvent(new CustomEvent('racketpoint:favorites-changed'));
  return favorites.has(sku);
}
