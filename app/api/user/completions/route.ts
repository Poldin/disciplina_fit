import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";
import { createAdminClient } from "@/app/utils/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ completions: [] });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("link_user_disciplines")
    .select("id, completed_at, disciplines(title, slug, img_url)")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("[user-completions] fetch error", error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }

  return NextResponse.json({ completions: data ?? [] });
}
