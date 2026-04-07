const JOINED_KEY = "df.disciplina.joined";
const SENT_DAYS_KEY = "df.disciplina.sentDays";
/** Durata breve: riduce richieste su back navigation, ma resta accettabile dopo join/stop (invalidazione esplicita). */
const TTL_MS = 120_000;

export type CachedActiveDiscipline = {
  id: string;
  title: string | null;
  img_url: string | null;
  slug: string;
};

type JoinedPayload = {
  t: number;
  joined: boolean;
  activeDiscipline: CachedActiveDiscipline | null;
};

type SentDaysPayload = {
  t: number;
  sentDayNumbers: number[];
};

function storageKey(prefix: string, userId: string, disciplineId: string) {
  return `${prefix}:${userId}:${disciplineId}`;
}

function isFresh(t: number) {
  return Date.now() - t < TTL_MS;
}

export function readJoinedFromSession(
  userId: string,
  disciplineId: string
): JoinedPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(JOINED_KEY, userId, disciplineId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as JoinedPayload;
    if (
      typeof parsed.t !== "number" ||
      typeof parsed.joined !== "boolean" ||
      (parsed.activeDiscipline !== null && typeof parsed.activeDiscipline !== "object")
    ) {
      return null;
    }
    if (!isFresh(parsed.t)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeJoinedToSession(
  userId: string,
  disciplineId: string,
  joined: boolean,
  activeDiscipline: CachedActiveDiscipline | null
) {
  if (typeof window === "undefined") return;
  try {
    const payload: JoinedPayload = {
      t: Date.now(),
      joined,
      activeDiscipline,
    };
    sessionStorage.setItem(
      storageKey(JOINED_KEY, userId, disciplineId),
      JSON.stringify(payload)
    );
  } catch {
    // quota piena o sessionStorage disabilitato
  }
}

export function readSentDaysFromSession(
  userId: string,
  disciplineId: string
): number[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(SENT_DAYS_KEY, userId, disciplineId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SentDaysPayload;
    if (typeof parsed.t !== "number" || !Array.isArray(parsed.sentDayNumbers)) {
      return null;
    }
    if (!isFresh(parsed.t)) return null;
    return parsed.sentDayNumbers;
  } catch {
    return null;
  }
}

export function writeSentDaysToSession(
  userId: string,
  disciplineId: string,
  sentDayNumbers: number[]
) {
  if (typeof window === "undefined") return;
  try {
    const payload: SentDaysPayload = { t: Date.now(), sentDayNumbers };
    sessionStorage.setItem(
      storageKey(SENT_DAYS_KEY, userId, disciplineId),
      JSON.stringify(payload)
    );
  } catch {
    // ignore
  }
}

/** Dopo join / stop percorso: evita di mostrare stato vecchio dalla cache. */
export function clearDisciplinaSessionCache(userId: string, disciplineId: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(storageKey(JOINED_KEY, userId, disciplineId));
    sessionStorage.removeItem(storageKey(SENT_DAYS_KEY, userId, disciplineId));
  } catch {
    // ignore
  }
}
