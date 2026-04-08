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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setActiveDiscipline(null);
      setActiveDisciplineId(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let cancelled = false;
    const supabase = createClient();

    const utcDayStart = new Date();
    utcDayStart.setUTCHours(0, 0, 0, 0);

    void supabase
      .from("link_user_disciplines")
      .select(
        "discipline_id, disciplines(id, title, slug, img_url, short_desc, lenght_days, notification_plan)"
      )
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .single()
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          setActiveDisciplineId(data.discipline_id);
          const disc = data.disciplines as unknown as Discipline;
          setActiveDiscipline(disc ?? null);
          setIsLoading(false);
          return;
        }

        // Fallback: se oggi e` l'ultimo giorno e il link e` stato marcato completed troppo presto,
        // lo manteniamo visibile in home fino a fine giornata UTC.
        const completedToday = await supabase
          .from("link_user_disciplines")
          .select(
            "discipline_id, completed_at, disciplines(id, title, slug, img_url, short_desc, lenght_days, notification_plan)"
          )
          .eq("user_id", userId)
          .eq("status", "completed")
          .gte("completed_at", utcDayStart.toISOString())
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;
        if (completedToday.error || !completedToday.data) {
          setActiveDiscipline(null);
          setActiveDisciplineId(null);
          setIsLoading(false);
          return;
        }

        setActiveDisciplineId(completedToday.data.discipline_id);
        const disc = completedToday.data.disciplines as unknown as Discipline;
        setActiveDiscipline(disc ?? null);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setActiveDiscipline(null);
        setActiveDisciplineId(null);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { activeDiscipline, activeDisciplineId, isLoading };
}
