import { createAdminClient } from '@/app/utils/supabase/admin';
import { sendPushToExternalUser } from '@/app/utils/onesignalPush';
import { getPublicSiteUrl } from '@/app/utils/publicSiteUrl';

type ScheduledMessageRow = {
  id: string;
  send_time_utc: string | null;
  link_user_discipline_id: number | null;
  day_number: number | null;
  metadata: { message?: string } | null;
};

type LinkRowRaw = {
  id: number;
  user_id: string | null;
  stopped_at: string | null;
  disciplines: { slug: string } | { slug: string }[] | null;
};

function disciplineSlugFromLink(link: LinkRowRaw): string | null {
  const d = link.disciplines;
  if (!d) return null;
  if (Array.isArray(d)) return d[0]?.slug?.trim() ?? null;
  return d.slug?.trim() ?? null;
}

export async function sendDueScheduledMessages(nowUtc: Date = new Date()) {
  const supabaseAdmin = createAdminClient();
  const nowIso = nowUtc.toISOString();
  console.log(`[sendScheduledMessages] start nowUtc=${nowIso}`);

  const { data: dueMessages, error: dueError } = await supabaseAdmin
    .from('message_schedule')
    .select('id, send_time_utc, link_user_discipline_id, day_number, metadata')
    .eq('is_sent', false)
    .not('send_time_utc', 'is', null)
    .lte('send_time_utc', nowIso)
    .order('send_time_utc', { ascending: true })
    .limit(500);

  if (dueError) {
    console.error('[sendScheduledMessages] due query error:', dueError);
    throw new Error(`Query due messages failed: ${dueError.message}`);
  }

  const messages = (dueMessages ?? []) as ScheduledMessageRow[];
  console.log(`[sendScheduledMessages] due messages found=${messages.length}`);
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
    .select('id, user_id, stopped_at, disciplines(slug)')
    .in('id', linkIds);

  if (linkError) {
    console.error('[sendScheduledMessages] links query error:', linkError);
    throw new Error(`Query link_user_disciplines failed: ${linkError.message}`);
  }

  const links = (linkRows ?? []) as LinkRowRaw[];
  const linkById = new Map<number, LinkRowRaw>(links.map((l) => [l.id, l]));
  const baseUrl = getPublicSiteUrl();

  const successfullySentIds: string[] = [];
  let failed = 0;

  for (const msg of messages) {
    const linkId = msg.link_user_discipline_id;
    const body = msg.metadata?.message?.trim();
    if (!linkId || !body) {
      console.warn(`[sendScheduledMessages] skip message=${msg.id} reason=missing_link_or_body linkId=${String(linkId)} hasBody=${Boolean(body)}`);
      failed += 1;
      continue;
    }

    const link = linkById.get(linkId);
    if (!link || !link.user_id || link.stopped_at) {
      console.warn(
        `[sendScheduledMessages] skip message=${msg.id} reason=invalid_or_stopped_link linkId=${linkId} hasLink=${Boolean(link)} hasUser=${Boolean(link?.user_id)} stoppedAt=${link?.stopped_at ?? 'null'}`
      );
      failed += 1;
      continue;
    }

    const userId = link.user_id;
    const slug = disciplineSlugFromLink(link);
    const dayNum =
      msg.day_number != null ? Number(msg.day_number) : NaN;
    const openUrl =
      slug && Number.isFinite(dayNum) && dayNum >= 1
        ? `${baseUrl}/disciplina/${encodeURIComponent(slug)}/day/${dayNum}`
        : slug
          ? `${baseUrl}/disciplina/${encodeURIComponent(slug)}`
          : undefined;
    if (!slug) {
      console.warn(`[sendScheduledMessages] skip message=${msg.id} reason=missing_discipline_slug linkId=${linkId}`);
      failed += 1;
      continue;
    }

    try {
      console.log(
        `[sendScheduledMessages] push message=${msg.id} userId=${userId} linkId=${linkId} sendTimeUtc=${msg.send_time_utc} url=${openUrl ?? 'none'}`
      );
      const result = await sendPushToExternalUser(userId, body, undefined, { url: openUrl });
      if (!result.ok) {
        failed += 1;
        console.warn(`[sendScheduledMessages] push failed message=${msg.id} userId=${userId}: ${result.reason}`);
        continue;
      }
      console.log(`[sendScheduledMessages] sent message=${msg.id} onesignalId=${result.messageId}`);
      successfullySentIds.push(msg.id);
    } catch (err) {
      failed += 1;
      console.error(`[sendScheduledMessages] failed message=${msg.id} userId=${userId}`, err);
    }
  }

  let markedSent = 0;
  if (successfullySentIds.length > 0) {
    console.log(`[sendScheduledMessages] marking is_sent=true count=${successfullySentIds.length}`);
    const { error: markError } = await supabaseAdmin
      .from('message_schedule')
      .update({ is_sent: true, sent_at: nowIso })
      .in('id', successfullySentIds)
      .eq('is_sent', false);

    if (markError) {
      console.error('[sendScheduledMessages] mark sent error:', markError);
      throw new Error(`Mark is_sent failed: ${markError.message}`);
    }

    markedSent = successfullySentIds.length;
  }

  const result = {
    scanned: messages.length,
    sent: successfullySentIds.length,
    failed,
    markedSent,
    nowUtc: nowIso,
  };

  console.log('[sendScheduledMessages] completed:', result);
  return result;
}
