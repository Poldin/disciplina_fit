import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/app/utils/supabase/server";
import { createAdminClient } from "@/app/utils/supabase/admin";
import { markDayNotificationOpened } from "@/app/utils/markDayNotificationOpened";
import DayMessagesMarkdown from "./DayMessagesMarkdown";

type ScheduleRow = {
  id: string;
  day_number: number | null;
  metadata: unknown;
  send_time_utc: string | null;
};

export default async function DisciplinaDayPage({
  params,
}: {
  params: Promise<{ slug: string; dayNumber: string }>;
}) {
  const { slug, dayNumber: dayParam } = await params;
  const dayNum = Number.parseInt(dayParam, 10);
  if (!Number.isFinite(dayNum) || dayNum < 1) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  const { data: discipline } = await supabase
    .from("disciplines")
    .select("id, title, slug")
    .eq("slug", slug)
    .single();

  if (!discipline) {
    notFound();
  }

  const admin = createAdminClient();
  const { data: link } = await admin
    .from("link_user_disciplines")
    .select("id")
    .eq("user_id", user.id)
    .eq("discipline_id", discipline.id)
    .is("stopped_at", null)
    .maybeSingle();

  if (!link) {
    notFound();
  }

  const { data: rows, error } = await admin
    .from("message_schedule")
    .select("id, day_number, metadata, send_time_utc")
    .eq("link_user_discipline_id", link.id)
    .eq("day_number", dayNum)
    .order("send_time_utc", { ascending: true });

  if (error) {
    console.error("[disciplina/day] query message_schedule", error);
    notFound();
  }

  const list = (rows ?? []) as ScheduleRow[];
  if (list.length === 0) {
    notFound();
  }

  await markDayNotificationOpened(user.id, link.id, dayNum);

  const segments = list
    .map((r) => {
      const m = r.metadata as { message?: string } | null;
      const text = m?.message?.trim() ?? "";
      return { id: r.id, text };
    })
    .filter((s) => s.text.length > 0);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
          <Link
            href={`/disciplina/${encodeURIComponent(slug)}`}
            className="hover:text-zinc-800 dark:hover:text-zinc-200 underline-offset-2 hover:underline"
          >
            ← {discipline.title ?? slug}
          </Link>
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-8">
          Giorno {dayNum}
        </h1>
        <div className="space-y-10 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-6 sm:p-8 shadow-sm">
          {segments.length === 0 ? (
            <p className="text-zinc-600 dark:text-zinc-400">
              Nessun testo per questo giorno.
            </p>
          ) : (
            segments.map((seg, i) => (
              <div
                key={seg.id}
                className={
                  i > 0
                    ? "pt-10 border-t border-zinc-200 dark:border-zinc-800"
                    : undefined
                }
              >
                <DayMessagesMarkdown source={seg.text} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
