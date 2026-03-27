import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";
import { createAdminClient } from "@/app/utils/supabase/admin";

/**
 * Salva le risposte dell'utente (rating, testo) nel metadata del message_schedule.
 * Fa merge di responses esistenti con quelle nuove.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const { messageScheduleId, responses } = body as {
    messageScheduleId?: unknown;
    responses?: unknown;
  };

  if (
    typeof messageScheduleId !== "string" ||
    !messageScheduleId ||
    typeof responses !== "object" ||
    responses === null ||
    Array.isArray(responses)
  ) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Recupera il record e verifica ownership tramite link_user_disciplines
  const { data: row, error: rowError } = await admin
    .from("message_schedule")
    .select("id, metadata, link_user_discipline_id")
    .eq("id", messageScheduleId)
    .maybeSingle();

  if (rowError || !row) {
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  }

  const { data: link } = await admin
    .from("link_user_disciplines")
    .select("id")
    .eq("id", row.link_user_discipline_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!link) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const existing = (row.metadata as Record<string, unknown>) ?? {};
  const existingResponses =
    (existing.responses as Record<string, unknown>) ?? {};

  const updatedMetadata = {
    ...existing,
    responses: {
      ...existingResponses,
      ...(responses as Record<string, unknown>),
    },
  };

  const { error: updateError } = await admin
    .from("message_schedule")
    .update({ metadata: updatedMetadata })
    .eq("id", messageScheduleId);

  if (updateError) {
    console.error("[day-response] update error", updateError);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
