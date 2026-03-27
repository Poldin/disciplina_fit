import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/app/utils/supabase/admin";
import { markDayNotificationOpened } from "@/app/utils/markDayNotificationOpened";
import {
  computeDayPagePathProgress,
  type DayPagePathProgress,
} from "@/app/utils/disciplinePathProgress";
import type { DayBlock, BlockResponses } from "@/app/utils/dayBlockTypes";

export type DayContentSegment = {
  id: string;
  text: string;
  isSent: boolean;
  sendTimeUtc: string | null;
  sentAt: string | null;
  blocks: DayBlock[];
  responses: BlockResponses;
};

type ScheduleRow = {
  id: string;
  day_number: number | null;
  metadata: unknown;
  send_time_utc: string | null;
  is_sent: boolean | null;
  sent_at: string | null;
};

export type LoadDisciplineDayContentResult =
  | {
      ok: true;
      disciplineTitle: string | null;
      segments: DayContentSegment[];
      pathProgress: DayPagePathProgress | null;
    }
  | { ok: false; kind: "not_found" }
  | { ok: false; kind: "db"; message: string };

/**
 * Contenuto messaggi per /disciplina/[slug]/day/[n] (server: page o API).
 */
export async function loadDisciplineDayContent(
  supabase: SupabaseClient,
  userId: string,
  slug: string,
  dayNum: number
): Promise<LoadDisciplineDayContentResult> {
  const { data: discipline } = await supabase
    .from("disciplines")
    .select("id, title, slug, notification_plan, lenght_days")
    .eq("slug", slug)
    .single();

  if (!discipline) {
    return { ok: false, kind: "not_found" };
  }

  const admin = createAdminClient();
  const { data: link } = await admin
    .from("link_user_disciplines")
    .select("id")
    .eq("user_id", userId)
    .eq("discipline_id", discipline.id)
    .is("stopped_at", null)
    .maybeSingle();

  if (!link) {
    return { ok: false, kind: "not_found" };
  }

  const [dayQuery, sentQuery] = await Promise.all([
    admin
      .from("message_schedule")
      .select("id, day_number, metadata, send_time_utc, is_sent, sent_at")
      .eq("link_user_discipline_id", link.id)
      .eq("day_number", dayNum)
      .order("send_time_utc", { ascending: true }),
    admin
      .from("message_schedule")
      .select("day_number")
      .eq("link_user_discipline_id", link.id)
      .eq("is_sent", true),
  ]);

  const { data: rows, error } = dayQuery;
  if (error) {
    console.error("[disciplineDayContent] message_schedule", error);
    return { ok: false, kind: "db", message: error.message };
  }

  if (sentQuery.error) {
    console.error("[disciplineDayContent] message_schedule sent days", sentQuery.error);
    return { ok: false, kind: "db", message: sentQuery.error.message };
  }

  const list = (rows ?? []) as ScheduleRow[];
  if (list.length === 0) {
    return { ok: false, kind: "not_found" };
  }

  const linkId = typeof link.id === "number" ? link.id : Number(link.id);
  await markDayNotificationOpened(userId, linkId, dayNum);

  const segments = list
    .map((r) => {
      const m = r.metadata as {
        message?: string;
        blocks?: DayBlock[];
        responses?: BlockResponses;
      } | null;
      const text = m?.message?.trim() ?? "";
      return {
        id: r.id,
        text,
        isSent: Boolean(r.is_sent),
        sendTimeUtc: r.send_time_utc,
        sentAt: r.sent_at,
        blocks: Array.isArray(m?.blocks) ? (m.blocks as DayBlock[]) : [],
        responses: (m?.responses as BlockResponses) ?? {},
      };
    })
    .filter((s) => s.text.length > 0);

  const sentDayNumbers = [
    ...new Set(
      (sentQuery.data ?? [])
        .map((r) =>
          r.day_number == null ? NaN : Number(r.day_number)
        )
        .filter((n) => Number.isFinite(n))
    ),
  ];

  const pathProgress = computeDayPagePathProgress(
    discipline.notification_plan,
    discipline.lenght_days,
    sentDayNumbers
  );

  return {
    ok: true,
    disciplineTitle: discipline.title,
    segments,
    pathProgress,
  };
}
