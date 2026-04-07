"use client";

import { useParams } from "next/navigation";
import DayPageSkeleton from "./DayPageSkeleton";
import { peekDayPageShellPrefill } from "@/app/utils/dayPageShellMemory";

/** Mostrato durante la navigazione finché il Server Component non ha finito (auth + contenuto giorno). */
export default function DisciplinaDayLoading() {
  const params = useParams();
  const slugRaw = params.slug;
  const slug =
    typeof slugRaw === "string" ? slugRaw : Array.isArray(slugRaw) ? slugRaw[0] ?? "" : "";
  const dayRaw = params.dayNumber;
  const dayStr =
    typeof dayRaw === "string" ? dayRaw : Array.isArray(dayRaw) ? dayRaw[0] : "";
  const parsed = Number.parseInt(dayStr, 10);
  const dayNumber = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;

  const shell =
    slug && dayNumber >= 1 ? peekDayPageShellPrefill(slug, dayNumber) : null;

  return (
    <DayPageSkeleton slug={slug || "—"} dayNumber={dayNumber} shell={shell} />
  );
}
