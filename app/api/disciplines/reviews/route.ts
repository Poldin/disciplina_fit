import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";
import { createAdminClient } from "@/app/utils/supabase/admin";

type ReviewBody = {
  linkId?: unknown;
  rating?: unknown;
  comment?: unknown;
  isPublic?: unknown;
};

export async function GET(request: NextRequest) {
  const linkIdParam = request.nextUrl.searchParams.get("linkId")?.trim();
  const disciplineId = request.nextUrl.searchParams.get("disciplineId")?.trim();
  if (linkIdParam) {
    const linkId = Number(linkIdParam);
    if (!Number.isFinite(linkId)) {
      return NextResponse.json({ error: "linkId non valido" }, { status: 400 });
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: row, error } = await admin
      .from("discipline_reviews")
      .select("rating, comment, is_public")
      .eq("link_user_discipline_id", linkId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[disciplines-reviews] own review fetch error", error);
      return NextResponse.json({ error: "Errore server" }, { status: 500 });
    }

    return NextResponse.json({
      review: row
        ? {
            rating: Number(row.rating),
            comment: row.comment ?? "",
            isPublic: row.is_public === true,
          }
        : null,
    });
  }

  if (!disciplineId) {
    return NextResponse.json({ error: "disciplineId o linkId richiesto" }, { status: 400 });
  }

  const admin = createAdminClient();

  const [{ data: ratingsRows, error: ratingsError }, { data: reviewRows, error: reviewsError }] =
    await Promise.all([
      admin
        .from("discipline_reviews")
        .select("rating")
        .eq("discipline_id", disciplineId),
      admin
        .from("discipline_reviews")
        .select("id, rating, comment, created_at, profiles(user_name)")
        .eq("discipline_id", disciplineId)
        .eq("is_public", true)
        .not("comment", "is", null)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  if (ratingsError || reviewsError) {
    console.error("[disciplines-reviews] fetch error", ratingsError ?? reviewsError);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }

  const ratings = (ratingsRows ?? [])
    .map((row) => Number(row.rating))
    .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);
  const count = ratings.length;
  const avgRating = count > 0 ? ratings.reduce((sum, value) => sum + value, 0) / count : null;

  const reviews = (reviewRows ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      rating: Number(row.rating),
      comment: row.comment,
      created_at: row.created_at,
      user_name:
        typeof profile?.user_name === "string" && profile.user_name.trim()
          ? profile.user_name.trim()
          : "Utente disciplinaFIT",
    };
  });

  return NextResponse.json({
    summary: { count, avgRating },
    reviews,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as ReviewBody | null;
  const linkId = typeof body?.linkId === "number" ? body.linkId : null;
  const rating = typeof body?.rating === "number" ? body.rating : null;
  const rawComment = typeof body?.comment === "string" ? body.comment.trim() : "";
  const isPublic = body?.isPublic === true;

  if (!linkId || !rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }
  if (rawComment.length > 500) {
    return NextResponse.json({ error: "Commento troppo lungo (max 500 caratteri)" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: link, error: linkError } = await admin
    .from("link_user_disciplines")
    .select("id, user_id, discipline_id, status")
    .eq("id", linkId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (linkError || !link) {
    return NextResponse.json({ error: "Link non trovato" }, { status: 404 });
  }
  if (link.status !== "completed") {
    return NextResponse.json({ error: "Review consentita solo a percorso completato" }, { status: 400 });
  }

  const comment = rawComment.length > 0 ? rawComment : null;
  const { error: upsertError } = await admin.from("discipline_reviews").upsert(
    {
      link_user_discipline_id: link.id,
      user_id: user.id,
      discipline_id: link.discipline_id,
      rating,
      comment,
      is_public: comment ? isPublic : false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "link_user_discipline_id" }
  );

  if (upsertError) {
    console.error("[disciplines-reviews] upsert error", upsertError);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
