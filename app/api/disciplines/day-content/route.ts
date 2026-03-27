import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";
import { createAdminClient } from "@/app/utils/supabase/admin";
import { markDayNotificationOpened } from "@/app/utils/markDayNotificationOpened";

type ScheduleRow = {
  id: string;
  day_number: number | null;
  metadata: unknown;
  send_time_utc: string | null;
};

/**
 * Contenuto messaggi per /disciplina/[slug]/day/[n]: stessa logica della vecchia page server,
 * così la UI può navigare subito e caricare i dati in background.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim();
  const dayRaw = request.nextUrl.searchParams.get("day");
  const dayNum = dayRaw != null ? Number.parseInt(dayRaw, 10) : NaN;
  if (!slug || !Number.isFinite(dayNum) || dayNum < 1) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { data: discipline } = await supabase
    .from("disciplines")
    .select("id, title, slug")
    .eq("slug", slug)
    .single();

  if (!discipline) {
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });
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
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  }

  const { data: rows, error } = await admin
    .from("message_schedule")
    .select("id, day_number, metadata, send_time_utc")
    .eq("link_user_discipline_id", link.id)
    .eq("day_number", dayNum)
    .order("send_time_utc", { ascending: true });

  if (error) {
    console.error("[day-content] message_schedule", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }

  const list = (rows ?? []) as ScheduleRow[];
  if (list.length === 0) {
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  }

  const linkId = typeof link.id === "number" ? link.id : Number(link.id);
  await markDayNotificationOpened(user.id, linkId, dayNum);

  const segments = list
    .map((r) => {
      const m = r.metadata as { message?: string } | null;
      const text = m?.message?.trim() ?? "";
      return { id: r.id, text };
    })
    .filter((s) => s.text.length > 0);

  return NextResponse.json({
    disciplineTitle: discipline.title,
    segments,
  });
}
