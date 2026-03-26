import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";
import { createAdminClient } from "@/app/utils/supabase/admin";

/**
 * Giorni (day_number) per cui esiste almeno un message_schedule con is_sent=true
 * per il link attivo utente–disciplina.
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
    .select("day_number")
    .eq("link_user_discipline_id", link.id)
    .eq("is_sent", true);

  const sent = [
    ...new Set(
      (rows ?? [])
        .map((r) =>
          r.day_number == null ? NaN : Number(r.day_number)
        )
        .filter((n) => Number.isFinite(n))
    ),
  ].sort((a, b) => a - b);

  return NextResponse.json({ sentDayNumbers: sent });
}
