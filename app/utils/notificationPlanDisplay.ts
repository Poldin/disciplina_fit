/**
 * Estrae giorni ordinati e anteprima del primo messaggio del giorno dal notification_plan (JSON disciplina).
 */
export type NotificationDayPreview = {
  dayNumber: number;
  preview: string;
};

function wordsPreview(text: string, maxWords = 14): string {
  const w = text.trim().split(/\s+/).filter(Boolean);
  if (w.length === 0) return "";
  if (w.length <= maxWords) return w.join(" ");
  return `${w.slice(0, maxWords).join(" ")}…`;
}

export function listNotificationPlanDayPreviews(plan: unknown): NotificationDayPreview[] {
  if (!plan || typeof plan !== "object") return [];
  const o = plan as Record<string, unknown>;
  const items: NotificationDayPreview[] = [];

  for (const [key, val] of Object.entries(o)) {
    if (!/^day_\d+$/.test(key)) continue;
    const dayNumber = Number.parseInt(key.replace("day_", ""), 10);
    if (!Number.isFinite(dayNumber) || dayNumber < 1) continue;
    if (!Array.isArray(val) || val.length === 0) continue;
    const first = val[0] as { message?: unknown };
    const raw =
      typeof first?.message === "string" ? first.message.trim() : "";
    items.push({
      dayNumber,
      preview: wordsPreview(raw),
    });
  }

  items.sort((a, b) => a.dayNumber - b.dayNumber);
  return items;
}
