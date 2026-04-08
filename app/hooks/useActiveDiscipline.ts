"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/utils/supabase/client";
import type { Discipline } from "@/app/utils/types";

/**
 * Percorso attivo dell'utente (al massimo uno con status = active).
 */
export function useActiveDiscipline(userId: string | null | undefined) {
  const [activeDiscipline, setActiveDiscipline] = useState<Discipline | null>(null);
  const [activeDisciplineId, setActiveDisciplineId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setActiveDiscipline(null);
      setActiveDisciplineId(null);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    void supabase
      .from("link_user_disciplines")
      .select(
        "discipline_id, disciplines(id, title, slug, img_url, short_desc, lenght_days, notification_plan)"
      )
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setActiveDiscipline(null);
          setActiveDisciplineId(null);
          return;
        }
        setActiveDisciplineId(data.discipline_id);
        const disc = data.disciplines as unknown as Discipline;
        setActiveDiscipline(disc ?? null);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { activeDiscipline, activeDisciplineId };
}
