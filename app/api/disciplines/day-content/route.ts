import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";
import { loadDisciplineDayContent } from "@/app/utils/disciplineDayContent";

/**
 * Contenuto messaggi per /disciplina/[slug]/day/[n] (stessa logica del Server Component).
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

  const result = await loadDisciplineDayContent(supabase, user.id, slug, dayNum);

  if (!result.ok) {
    if (result.kind === "not_found") {
      return NextResponse.json({ error: "Non trovato" }, { status: 404 });
    }
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }

  return NextResponse.json({
    disciplineTitle: result.disciplineTitle,
    segments: result.segments,
  });
}
