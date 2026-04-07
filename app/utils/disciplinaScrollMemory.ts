const STORAGE_PREFIX = "df:disciplinaListScroll:";

export function stashDisciplinaListScroll(slug: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_PREFIX + slug, String(window.scrollY));
  } catch {
    // ignore
  }
}

export function peekDisciplinaListScroll(slug: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + slug);
    if (raw === null) return null;
    const y = Number.parseInt(raw, 10);
    return Number.isFinite(y) ? y : null;
  } catch {
    return null;
  }
}

export function clearDisciplinaListScroll(slug: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_PREFIX + slug);
  } catch {
    // ignore
  }
}
