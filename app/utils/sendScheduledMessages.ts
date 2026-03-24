import { createAdminClient } from '@/app/utils/supabase/admin';
import { getWhatsAppClient } from '@/app/utils/whatsapp';

type ScheduledMessageRow = {
  id: string;
  send_time_utc: string | null;
  link_user_discipline_id: number | null;
  metadata: { message?: string } | null;
};

type LinkRow = {
  id: number;
  user_id: string | null;
  stopped_at: string | null;
};

type ProfileRow = {
  id: string;
  phone: string | null;
};

export async function sendDueScheduledMessages(nowUtc: Date = new Date()) {
  const supabaseAdmin = createAdminClient();
  const whatsapp = getWhatsAppClient();
  const nowIso = nowUtc.toISOString();

  const { data: dueMessages, error: dueError } = await supabaseAdmin
    .from('message_schedule')
    .select('id, send_time_utc, link_user_discipline_id, metadata')
    .eq('is_sent', false)
    .not('send_time_utc', 'is', null)
    .lte('send_time_utc', nowIso)
    .order('send_time_utc', { ascending: true })
    .limit(500);

  if (dueError) {
    throw new Error(`Query due messages failed: ${dueError.message}`);
  }

  const messages = (dueMessages ?? []) as ScheduledMessageRow[];
  if (messages.length === 0) {
    return {
      scanned: 0,
      sent: 0,
      failed: 0,
      markedSent: 0,
      message: 'No pending scheduled messages',
    };
  }

  const linkIds = Array.from(
    new Set(
      messages
        .map((m) => m.link_user_discipline_id)
        .filter((id): id is number => typeof id === 'number')
    )
  );

  const { data: linkRows, error: linkError } = await supabaseAdmin
    .from('link_user_disciplines')
    .select('id, user_id, stopped_at')
    .in('id', linkIds);

  if (linkError) {
    throw new Error(`Query link_user_disciplines failed: ${linkError.message}`);
  }

  const links = (linkRows ?? []) as LinkRow[];
  const linkById = new Map<number, LinkRow>(links.map((l) => [l.id, l]));

  const userIds = Array.from(
    new Set(
      links
        .map((l) => l.user_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  );

  const { data: profileRows, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, phone')
    .in('id', userIds);

  if (profileError) {
    throw new Error(`Query profiles failed: ${profileError.message}`);
  }

  const profiles = (profileRows ?? []) as ProfileRow[];
  const profileByUserId = new Map<string, ProfileRow>(profiles.map((p) => [p.id, p]));

  const successfullySentIds: string[] = [];
  let failed = 0;

  for (const msg of messages) {
    const linkId = msg.link_user_discipline_id;
    const body = msg.metadata?.message?.trim();
    if (!linkId || !body) {
      failed += 1;
      continue;
    }

    const link = linkById.get(linkId);
    if (!link || !link.user_id || link.stopped_at) {
      failed += 1;
      continue;
    }

    const profile = profileByUserId.get(link.user_id);
    const phone = profile?.phone?.trim();
    if (!phone) {
      failed += 1;
      continue;
    }

    try {
      await whatsapp.sendTextMessage(phone, body);
      successfullySentIds.push(msg.id);
    } catch (err) {
      failed += 1;
      console.error(`Failed sending message ${msg.id}:`, err);
    }
  }

  let markedSent = 0;
  if (successfullySentIds.length > 0) {
    const { error: markError } = await supabaseAdmin
      .from('message_schedule')
      .update({ is_sent: true })
      .in('id', successfullySentIds)
      .eq('is_sent', false);

    if (markError) {
      throw new Error(`Mark is_sent failed: ${markError.message}`);
    }

    markedSent = successfullySentIds.length;
  }

  return {
    scanned: messages.length,
    sent: successfullySentIds.length,
    failed,
    markedSent,
    nowUtc: nowIso,
  };
}
