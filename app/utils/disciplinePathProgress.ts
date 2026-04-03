import { listNotificationPlanDayPreviews } from "@/app/utils/notificationPlanDisplay";

/** Giorni del percorso ancora da vivere dopo il giorno della pagina (non il progresso globale invii). */
export type DayPagePathProgress = {
  remaining: number;
};

/** Progresso iscrizione: giorni con almeno un invio effettuato vs totale (come sulla home). */
export type JoinedPathProgress = {
  completed: number;
  total: number;
  remaining: number;
  pct: number;
};

function normalizeLengthDays(
  lenghtDays: number | string | null | undefined
): number {
  if (lenghtDays == null) return 0;
  const n = typeof lenghtDays === "number" ? lenghtDays : Number(lenghtDays);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function getSegmentDayNumbers(
  notificationPlan: unknown,
  lenghtDays: number | string | null | undefined
): number[] {
  const planDays = listNotificationPlanDayPreviews(notificationPlan);
  const len = normalizeLengthDays(lenghtDays);
  return planDays.length > 0
    ? planDays.map((d) => d.dayNumber)
    : len > 0
      ? Array.from({ length: len }, (_, i) => i + 1)
      : [];
}

export function computeJoinedPathProgress(
  notificationPlan: unknown,
  lenghtDays: number | string | null | undefined,
  sentDayNumbers: number[]
): JoinedPathProgress | null {
  const segmentDayNumbers = getSegmentDayNumbers(notificationPlan, lenghtDays);
  if (segmentDayNumbers.length === 0) return null;

  const sent = new Set(sentDayNumbers);
  const completed = segmentDayNumbers.filter((d) => sent.has(d)).length;
  const total = segmentDayNumbers.length;
  const remaining = Math.max(0, total - completed);
  const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  return { completed, total, remaining, pct };
}

export function computeDayPagePathProgress(
  notificationPlan: unknown,
  lenghtDays: number | string | null | undefined,
  viewedDayNumber: number
): DayPagePathProgress | null {
  const segmentDayNumbers = getSegmentDayNumbers(notificationPlan, lenghtDays);
  if (segmentDayNumbers.length === 0) return null;

  const remaining = segmentDayNumbers.filter((d) => d > viewedDayNumber).length;

  return { remaining };
}
