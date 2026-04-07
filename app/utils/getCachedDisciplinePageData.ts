import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/app/utils/supabase/admin";
import { fetchParticipantCountsByDisciplineIds } from "@/app/utils/disciplineParticipantCounts";
import type { Discipline } from "@/app/utils/types";

/**
 * Dati pubblici della pagina disciplina (contenuto + conteggio iscritti).
 * Cache ISR lato server: evita query Supabase ripetute a ogni navigazione (es. ritorno dal giorno singolo).
 * Il conteggio partecipanti può essere leggermente ritardato rispetto al DB entro la finestra di revalidate.
 */
export async function getCachedDisciplinePageData(
  slug: string
): Promise<Discipline | null> {
  const cachedRead = unstable_cache(
    async () => {
      const admin = createAdminClient();
      const { data: discipline, error } = await admin
        .from("disciplines")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error || !discipline) {
        return null;
      }

      const counts = await fetchParticipantCountsByDisciplineIds([discipline.id]);
      const row = discipline as Omit<Discipline, "subscribers">;
      return {
        ...row,
        subscribers: counts.get(discipline.id) ?? 0,
      } satisfies Discipline;
    },
    ["discipline-page", slug],
    { revalidate: 3600 }
  );

  return cachedRead();
}
