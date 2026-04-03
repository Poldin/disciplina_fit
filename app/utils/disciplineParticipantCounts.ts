import { createAdminClient } from "@/app/utils/supabase/admin";

/**
 * Numero di righe in link_user_disciplines per ciascuna disciplina (tutti i record, attivi e bloccati).
 * Usa il client admin lato server per essere leggibile anche senza sessione utente.
 */
export async function fetchParticipantCountsByDisciplineIds(
  disciplineIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const unique = [...new Set(disciplineIds)].filter(Boolean);
  for (const id of unique) {
    map.set(id, 0);
  }
  if (unique.length === 0) return map;

  const admin = createAdminClient();
  const results = await Promise.all(
    unique.map(async (disciplineId) => {
      const { count, error } = await admin
        .from("link_user_disciplines")
        .select("*", { count: "exact", head: true })
        .eq("discipline_id", disciplineId);

      if (error) {
        console.error("[disciplineParticipantCounts]", disciplineId, error);
        return { disciplineId, count: 0 };
      }
      return { disciplineId, count: count ?? 0 };
    })
  );

  for (const { disciplineId, count } of results) {
    map.set(disciplineId, count);
  }
  return map;
}
