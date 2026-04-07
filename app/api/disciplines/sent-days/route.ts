import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";
import { createAdminClient } from "@/app/utils/supabase/admin";
import { isScheduleDayUnlockedByUtcCalendar } from "@/app/utils/scheduleDayUnlock";

/**
 * Giorni (day_number) accessibili per il link attivo: data UTC odierna >= data UTC
 * del primo send_time_utc programmato per quel giorno (non dipende da is_sent).
 */
export async function GET(request: NextRequest) {
  const disciplineId = request.nextUrl.searchParams.get("disciplineId");
  if (!disciplineId?.trim()) {
    return NextResponse.json(
      { error: "disciplineId richiesto" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ sentDayNumbers: [] as number[] });
  }

  const admin = createAdminClient();
  const { data: link } = await admin
    .from("link_user_disciplines")
    .select("id")
    .eq("user_id", user.id)
    .eq("discipline_id", disciplineId.trim())
    .is("stopped_at", null)
    .maybeSingle();

  if (!link) {
    return NextResponse.json({ sentDayNumbers: [] as number[] });
  }

  const { data: rows } = await admin
    .from("message_schedule")
    .select("day_number, send_time_utc")
    .eq("link_user_discipline_id", link.id)
    .not("send_time_utc", "is", null);

  const now = new Date();
  const earliestByDay = new Map<number, string>();

  for (const r of rows ?? []) {
    const dn =
      r.day_number == null ? NaN : Number(r.day_number);
    if (!Number.isFinite(dn)) continue;
    const iso = r.send_time_utc as string;
    const cur = earliestByDay.get(dn);
    if (!cur || iso < cur) earliestByDay.set(dn, iso);
  }

  const unlockedDays = [...earliestByDay.entries()]
    .filter(([, iso]) => isScheduleDayUnlockedByUtcCalendar(iso, now))
    .map(([dn]) => dn)
    .sort((a, b) => a - b);

  return NextResponse.json({ sentDayNumbers: unlockedDays });
}
