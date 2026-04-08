import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";
import { createAdminClient } from "@/app/utils/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ completion: null });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("link_user_disciplines")
    .select(
      "id, discipline_id, completed_at, disciplines(title, slug, img_url)"
    )
    .eq("user_id", user.id)
    .eq("status", "completed")
    .is("completion_seen_at", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[completion-unseen] fetch error", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }

  return NextResponse.json({ completion: data ?? null });
}
