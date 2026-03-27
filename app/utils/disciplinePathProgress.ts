import { listNotificationPlanDayPreviews } from "@/app/utils/notificationPlanDisplay";

/** Dati per la barra sotto al titolo giorno: emerald = sbloccati, pallino = posizione giorno corrente. */
export type DayPagePathProgress = {
  completed: number;
  total: number;
  completedPct: number;
  markerPct: number;
  /** 1-based: questo giorno è l’N-esimo step del percorso (stesso ordinamento della home). */
  currentOrdinal: number | null;
};

function normalizeLengthDays(
  lenghtDays: number | string | null | undefined
): number {
  if (lenghtDays == null) return 0;
  const n = typeof lenghtDays === "number" ? lenghtDays : Number(lenghtDays);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function computeDayPagePathProgress(
  notificationPlan: unknown,
  lenghtDays: number | string | null | undefined,
  sentDayNumbers: number[],
  currentDayNumber: number
): DayPagePathProgress | null {
  const planDays = listNotificationPlanDayPreviews(notificationPlan);
  const len = normalizeLengthDays(lenghtDays);
  const segmentDayNumbers: number[] =
    planDays.length > 0
      ? planDays.map((d) => d.dayNumber)
      : len > 0
        ? Array.from({ length: len }, (_, i) => i + 1)
        : [];

  if (segmentDayNumbers.length === 0) return null;

  const sent = new Set(sentDayNumbers);
  const completed = segmentDayNumbers.filter((d) => sent.has(d)).length;
  const total = segmentDayNumbers.length;
  const completedPct = Math.min(100, Math.round((completed / total) * 100));

  const idx = segmentDayNumbers.indexOf(currentDayNumber);
  const currentOrdinal = idx >= 0 ? idx + 1 : null;

  let markerPct: number;
  if (idx >= 0) {
    markerPct = ((idx + 0.5) / total) * 100;
  } else {
    const maxD = Math.max(...segmentDayNumbers);
    const minD = Math.min(...segmentDayNumbers);
    if (currentDayNumber <= minD) markerPct = (0.5 / total) * 100;
    else if (currentDayNumber >= maxD) markerPct = 100 - (0.5 / total) * 100;
    else
      markerPct = Math.min(
        100,
        Math.max(0, ((currentDayNumber - minD) / (maxD - minD)) * 100)
      );
  }

  markerPct = Math.min(100, Math.max(0, markerPct));

  return { completed, total, completedPct, markerPct, currentOrdinal };
}
