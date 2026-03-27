import { listNotificationPlanDayPreviews } from "@/app/utils/notificationPlanDisplay";

/** Giorni ancora da “sbloccare” (invio effettuato) rispetto al piano, come sulla home. */
export type DayPagePathProgress = {
  remaining: number;
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
  sentDayNumbers: number[]
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
  const remaining = Math.max(0, total - completed);

  return { remaining };
}
