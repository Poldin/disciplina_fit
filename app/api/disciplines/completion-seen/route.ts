import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";
import { createAdminClient } from "@/app/utils/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { linkId?: unknown }
    | null;
  const linkId = typeof body?.linkId === "number" ? body.linkId : null;
  if (!linkId) {
    return NextResponse.json({ error: "linkId non valido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("link_user_disciplines")
    .update({ completion_seen_at: new Date().toISOString() })
    .eq("id", linkId)
    .eq("user_id", user.id)
    .eq("status", "completed");

  if (error) {
    console.error("[completion-seen] update error", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
