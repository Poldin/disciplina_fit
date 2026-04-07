const STORAGE_PREFIX = "df:dayShell:";

export type DayPageShellPrefill = {
  disciplineTitle: string | null;
  scheduleCalendarDateLabel: string | null;
  pathProgressRemaining: number | null;
  userName: string | null;
};

function key(slug: string, dayNumber: number) {
  return `${STORAGE_PREFIX}${slug}:${dayNumber}`;
}

export function stashDayPageShellPrefill(
  slug: string,
  dayNumber: number,
  data: DayPageShellPrefill
) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key(slug, dayNumber), JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function peekDayPageShellPrefill(
  slug: string,
  dayNumber: number
): DayPageShellPrefill | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key(slug, dayNumber));
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (typeof o !== "object" || o === null) return null;
    return {
      disciplineTitle:
        typeof o.disciplineTitle === "string" || o.disciplineTitle === null
          ? (o.disciplineTitle as string | null)
          : null,
      scheduleCalendarDateLabel:
        typeof o.scheduleCalendarDateLabel === "string" ||
        o.scheduleCalendarDateLabel === null
          ? (o.scheduleCalendarDateLabel as string | null)
          : null,
      pathProgressRemaining:
        typeof o.pathProgressRemaining === "number" ? o.pathProgressRemaining : null,
      userName:
        typeof o.userName === "string" || o.userName === null
          ? (o.userName as string | null)
          : null,
    };
  } catch {
    return null;
  }
}

export function clearDayPageShellPrefill(slug: string, dayNumber: number) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key(slug, dayNumber));
  } catch {
    // ignore
  }
}
