import DisciplinaContent from "./DisciplinaContent";
import { getCachedDisciplinePageData } from "@/app/utils/getCachedDisciplinePageData";
import { notFound } from "next/navigation";

export default async function DisciplinaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const discipline = await getCachedDisciplinePageData(slug);

  if (!discipline) {
    notFound();
  }

  return <DisciplinaContent discipline={discipline} />;
}
