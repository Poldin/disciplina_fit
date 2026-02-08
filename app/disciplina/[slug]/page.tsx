import { createClient } from "@/app/utils/supabase/server";
import DisciplinaContent from "./DisciplinaContent";
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

  return <DisciplinaContent discipline={discipline} />;
}
