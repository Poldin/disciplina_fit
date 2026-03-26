import { createAdminClient } from '@/app/utils/supabase/admin';

/**
 * Marca come aperti i messaggi schedulati del giorno per il link, dopo che l’utente
 * apre la pagina /disciplina/[slug]/day/[n]. Verifica che il link appartenga all’utente.
 */
export async function markDayNotificationOpened(
  userId: string,
  linkUserDisciplineId: number,
  dayNumber: number
): Promise<void> {
  const admin = createAdminClient();
  const { data: link, error: linkErr } = await admin
    .from('link_user_disciplines')
    .select('id, user_id')
    .eq('id', linkUserDisciplineId)
    .maybeSingle();

  if (linkErr || !link || link.user_id !== userId) return;

  await admin
    .from('message_schedule')
    .update({ is_notification_clicked: true })
    .eq('link_user_discipline_id', linkUserDisciplineId)
    .eq('day_number', dayNumber);
}
