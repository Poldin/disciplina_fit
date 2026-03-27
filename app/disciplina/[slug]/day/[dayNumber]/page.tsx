import { notFound, redirect } from "next/navigation";
import { createClient } from "@/app/utils/supabase/server";
import { loadDisciplineDayContent } from "@/app/utils/disciplineDayContent";
import DisciplinaDayPageClient from "./DisciplinaDayPageClient";
import DisciplinaDayUnavailable from "./DisciplinaDayUnavailable";

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

  const result = await loadDisciplineDayContent(supabase, user.id, slug, dayNum);

  if (!result.ok) {
    if (result.kind === "not_found") {
      return <DisciplinaDayUnavailable slug={slug} dayNumber={dayNum} />;
    }
    throw new Error(`[disciplina day] ${result.message}`);
  }

  return (
    <DisciplinaDayPageClient
      slug={slug}
      dayNumber={dayNum}
      disciplineTitle={result.disciplineTitle}
      segments={result.segments}
      pathProgress={result.pathProgress}
    />
  );
}
