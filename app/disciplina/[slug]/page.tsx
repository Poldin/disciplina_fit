import { createClient } from "@/app/utils/supabase/server";
import DisciplinaContent from "./DisciplinaContent";
import { fetchParticipantCountsByDisciplineIds } from "@/app/utils/disciplineParticipantCounts";
import { notFound } from "next/navigation";

export default async function DisciplinaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: discipline } = await supabase
    .from("disciplines")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!discipline) {
    notFound();
  }

  const counts = await fetchParticipantCountsByDisciplineIds([discipline.id]);
  const disciplineWithParticipants = {
    ...discipline,
    subscribers: counts.get(discipline.id) ?? 0,
  };

  return <DisciplinaContent discipline={disciplineWithParticipants} />;
}
