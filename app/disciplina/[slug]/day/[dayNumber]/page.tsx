import { notFound, redirect } from "next/navigation";
import { createClient } from "@/app/utils/supabase/server";
import DisciplinaDayPageClient from "./DisciplinaDayPageClient";

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

  return <DisciplinaDayPageClient slug={slug} dayNumber={dayNum} />;
}
