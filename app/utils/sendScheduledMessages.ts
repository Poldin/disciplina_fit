import { createAdminClient } from '@/app/utils/supabase/admin';
import { sendPushToExternalUser } from '@/app/utils/onesignalPush';
import { getPublicSiteUrl } from '@/app/utils/publicSiteUrl';
import { sendDisciplineReminderEmail } from '@/app/utils/sendDisciplineReminderEmail';
import { sendDisciplineCompletionEmail } from '@/app/utils/sendDisciplineCompletionEmail';
import {
  appendScheduleDeliveryLog,
  type ScheduleDeliveryLogEntry,
} from '@/app/utils/scheduleDeliveryLog';

type ScheduledMessageRow = {
  id: string;
  send_time_utc: string | null;
  link_user_discipline_id: number | null;
  day_number: number | null;
  metadata: Record<string, unknown> | null;
};

type DisciplineEmbed = {
  slug: string;
  title: string | null;
  img_url: string | null;
};

type LinkRowRaw = {
  id: number;
  user_id: string | null;
  stopped_at: string | null;
  status?: string | null;
  disciplines: DisciplineEmbed | DisciplineEmbed[] | null;
};

function disciplineFromLink(link: LinkRowRaw): {
  slug: string | null;
  title: string | null;
  imgUrl: string | null;
} {
  const d = link.disciplines;
  if (!d) return { slug: null, title: null, imgUrl: null };
  const row = Array.isArray(d) ? d[0] : d;
  return {
    slug: row?.slug?.trim() ?? null,
    title: row?.title?.trim() ?? null,
    imgUrl: row?.img_url?.trim() ?? null,
  };
}

/**
 * URL assoluto HTTPS per OneSignal (chrome_web_image richiede HTTPS).
 * In produzione `disciplines.img_url` è di solito già un URL pubblico Storage Supabase
 * (es. https://....supabase.co/storage/v1/object/public/.../file%20name.png);
 * in quel caso resta invariato.
 */
function resolveHttpsImageUrl(baseUrl: string, imgUrl: string | null): string | undefined {
  if (!imgUrl) return;
  const t = imgUrl.trim();
  if (!t) return;
  if (t.startsWith('https://')) return t;
  if (t.startsWith('//')) return `https:${t}`;
  if (t.startsWith('/')) return `${baseUrl}${t}`;
  return `${baseUrl}/${t}`;
}

function isAfterUtcDayEnd(iso: string | null | undefined, now: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const endOfUtcDay = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    23,
    59,
    59,
    999
  );
  return now.getTime() >= endOfUtcDay;
}

async function persistMessageScheduleDeliveryLog(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  messageId: string,
  fallbackMetadata: unknown,
  entries: ScheduleDeliveryLogEntry[]
) {
  if (entries.length === 0) return;
  const { data: fresh, error: fetchErr } = await supabaseAdmin
    .from('message_schedule')
    .select('metadata')
    .eq('id', messageId)
    .maybeSingle();
  if (fetchErr) {
    console.error(
      `[sendScheduledMessages] metadata fetch failed message=${messageId}`,
      fetchErr
    );
    return;
  }
  const merged = appendScheduleDeliveryLog(fresh?.metadata ?? fallbackMetadata, entries);
  const { error: updateErr } = await supabaseAdmin
    .from('message_schedule')
    .update({ metadata: merged })
    .eq('id', messageId);
  if (updateErr) {
    console.error(
      `[sendScheduledMessages] metadata update failed message=${messageId}`,
      updateErr
    );
  }
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
      emailsSent: 0,
      emailSendErrors: 0,
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
    .select('id, user_id, stopped_at, disciplines(slug, title, img_url)')
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
  let emailsSent = 0;
  let emailSendErrors = 0;

  for (const msg of messages) {
    const linkId = msg.link_user_discipline_id;
    const body =
      typeof msg.metadata?.message === 'string'
        ? msg.metadata.message.trim()
        : '';
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
    const { slug, title: disciplineTitle, imgUrl: disciplineImgUrl } = disciplineFromLink(link);
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

    const pushTitle = disciplineTitle || undefined;
    const chromeWebImage = resolveHttpsImageUrl(baseUrl, disciplineImgUrl);

    const logEntries: ScheduleDeliveryLogEntry[] = [];
    const stamp = () => new Date().toISOString();

    let pushOk = false;
    try {
      console.log(
        `[sendScheduledMessages] push message=${msg.id} userId=${userId} linkId=${linkId} sendTimeUtc=${msg.send_time_utc} url=${openUrl ?? 'none'} title=${pushTitle ?? 'default'} image=${chromeWebImage ?? 'none'}`
      );
      const result = await sendPushToExternalUser(userId, body, pushTitle, {
        url: openUrl,
        ...(chromeWebImage ? { chromeWebImage } : {}),
        ...(openUrl
          ? {
              webButtons: [{ id: 'open_content', text: 'Apri', url: openUrl }],
            }
          : {}),
      });
      if (result.ok) {
        pushOk = true;
        logEntries.push({
          channel: 'push',
          status: 'success',
          at: stamp(),
          onesignal_id: result.messageId,
        });
        console.log(`[sendScheduledMessages] push ok message=${msg.id} onesignalId=${result.messageId}`);
      } else {
        logEntries.push({
          channel: 'push',
          status: 'error',
          at: stamp(),
          note: result.reason,
        });
        console.warn(`[sendScheduledMessages] push failed message=${msg.id} userId=${userId}: ${result.reason}`);
      }
    } catch (err) {
      const note = err instanceof Error ? err.message : String(err);
      logEntries.push({
        channel: 'push',
        status: 'error',
        at: stamp(),
        note,
      });
      console.error(`[sendScheduledMessages] push exception message=${msg.id} userId=${userId}`, err);
    }

    let emailOk = false;
    try {
      const { data: authData, error: authErr } =
        await supabaseAdmin.auth.admin.getUserById(userId);
      const userEmail = authData?.user?.email?.trim();
      if (authErr || !userEmail) {
        const skipNote = authErr?.message ?? 'no email on account';
        logEntries.push({
          channel: 'email',
          status: 'skipped',
          at: stamp(),
          note: skipNote,
        });
        console.warn(
          `[sendScheduledMessages] email skipped message=${msg.id} userId=${userId} reason=${skipNote}`
        );
      } else {
        const dayLabel =
          Number.isFinite(dayNum) && dayNum >= 1 ? ` · giorno ${dayNum}` : '';
        const subjectBase = disciplineTitle?.trim() || 'disciplinaFIT';
        const emailResult = await sendDisciplineReminderEmail({
          to: userEmail,
          subject: `${subjectBase}${dayLabel}`,
          disciplineTitle: disciplineTitle || 'disciplinaFIT',
          bodyText: body,
          openUrl,
          heroImageUrl: chromeWebImage,
        });
        if (emailResult.ok) {
          emailOk = true;
          emailsSent += 1;
          logEntries.push({
            channel: 'email',
            status: 'success',
            at: stamp(),
          });
          console.log(`[sendScheduledMessages] email sent message=${msg.id} to=${userEmail}`);
        } else {
          emailSendErrors += 1;
          logEntries.push({
            channel: 'email',
            status: 'error',
            at: stamp(),
            note: emailResult.reason,
          });
          console.warn(
            `[sendScheduledMessages] email failed message=${msg.id}: ${emailResult.reason}`
          );
        }
      }
    } catch (emailErr) {
      emailSendErrors += 1;
      const note = emailErr instanceof Error ? emailErr.message : String(emailErr);
      logEntries.push({
        channel: 'email',
        status: 'error',
        at: stamp(),
        note,
      });
      console.warn(
        `[sendScheduledMessages] email exception message=${msg.id}`,
        emailErr
      );
    }

    await persistMessageScheduleDeliveryLog(
      supabaseAdmin,
      msg.id,
      msg.metadata,
      logEntries
    );

    if (pushOk || emailOk) {
      successfullySentIds.push(msg.id);
    } else {
      failed += 1;
      console.warn(
        `[sendScheduledMessages] no channel succeeded message=${msg.id} userId=${userId} pushOk=${pushOk} emailOk=${emailOk}`
      );
    }
  }

  let markedSent = 0;
  const successfullySentLinkIds = new Set<number>();
  for (const msg of messages) {
    if (!successfullySentIds.includes(msg.id)) continue;
    if (typeof msg.link_user_discipline_id === 'number') {
      successfullySentLinkIds.add(msg.link_user_discipline_id);
    }
  }

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

  // Se per un link non restano messaggi pendenti, il percorso è completato.
  if (successfullySentLinkIds.size > 0) {
    const candidateLinkIds = Array.from(successfullySentLinkIds);
    const { data: pendingRows, error: pendingError } = await supabaseAdmin
      .from('message_schedule')
      .select('link_user_discipline_id')
      .in('link_user_discipline_id', candidateLinkIds)
      .eq('is_sent', false);

    if (pendingError) {
      console.error('[sendScheduledMessages] pending schedule query error:', pendingError);
    } else {
      const linksWithPending = new Set<number>();
      for (const row of pendingRows ?? []) {
        const linkId = row.link_user_discipline_id;
        if (typeof linkId === 'number') linksWithPending.add(linkId);
      }

      const noPendingLinkIds = candidateLinkIds.filter((id) => !linksWithPending.has(id));
      if (noPendingLinkIds.length > 0) {
        const { data: lastScheduleRows, error: lastScheduleError } = await supabaseAdmin
          .from('message_schedule')
          .select('link_user_discipline_id, send_time_utc')
          .in('link_user_discipline_id', noPendingLinkIds)
          .not('send_time_utc', 'is', null)
          .order('send_time_utc', { ascending: false });

        if (lastScheduleError) {
          console.error('[sendScheduledMessages] last schedule query error:', lastScheduleError);
          return {
            scanned: messages.length,
            sent: successfullySentIds.length,
            failed,
            markedSent,
            emailsSent,
            emailSendErrors,
            nowUtc: nowIso,
          };
        }

        const maxSendByLink = new Map<number, string>();
        for (const row of lastScheduleRows ?? []) {
          const linkId = row.link_user_discipline_id;
          const iso = row.send_time_utc;
          if (typeof linkId !== 'number' || typeof iso !== 'string') continue;
          if (!maxSendByLink.has(linkId)) maxSendByLink.set(linkId, iso);
        }

        const completedLinkIds = noPendingLinkIds.filter((id) =>
          isAfterUtcDayEnd(maxSendByLink.get(id), nowUtc)
        );
        if (completedLinkIds.length === 0) {
          // Nessun link ha ancora superato la fine della giornata UTC dell'ultimo invio.
          const result = {
            scanned: messages.length,
            sent: successfullySentIds.length,
            failed,
            markedSent,
            emailsSent,
            emailSendErrors,
            nowUtc: nowIso,
          };
          console.log('[sendScheduledMessages] completed:', result);
          return result;
        }

        const { data: completedRows, error: completeError } = await supabaseAdmin
          .from('link_user_disciplines')
          .update({
            status: 'completed',
            completed_at: nowIso,
          })
          .in('id', completedLinkIds)
          .eq('status', 'active')
          .select('id, user_id, disciplines(title)');

        if (completeError) {
          console.error('[sendScheduledMessages] complete link update error:', completeError);
        } else {
          for (const row of completedRows ?? []) {
            const completedUserId = (row as { user_id?: string | null }).user_id;
            if (!completedUserId) continue;
            const disciplinesRaw = (row as { disciplines?: unknown }).disciplines;
            const firstDiscipline = Array.isArray(disciplinesRaw)
              ? (disciplinesRaw[0] as { title?: string | null } | undefined)
              : (disciplinesRaw as { title?: string | null } | null | undefined);
            const disciplineTitle = firstDiscipline?.title ?? 'disciplinaFIT';
            try {
              const { data: authData, error: authErr } =
                await supabaseAdmin.auth.admin.getUserById(completedUserId);
              const userEmail = authData?.user?.email?.trim();
              if (authErr || !userEmail) {
                console.warn(
                  `[sendScheduledMessages] completion email skipped link=${(row as { id?: number }).id ?? 'n/a'} reason=${authErr?.message ?? 'no email on account'}`
                );
                continue;
              }
              const mail = await sendDisciplineCompletionEmail({
                to: userEmail,
                disciplineTitle,
              });
              if (!mail.ok) {
                console.warn(
                  `[sendScheduledMessages] completion email failed link=${(row as { id?: number }).id ?? 'n/a'} reason=${mail.reason}`
                );
              }
            } catch (err) {
              console.warn(
                `[sendScheduledMessages] completion email exception link=${(row as { id?: number }).id ?? 'n/a'}`,
                err
              );
            }
          }
        }
      }
    }
  }

  const result = {
    scanned: messages.length,
    sent: successfullySentIds.length,
    failed,
    markedSent,
    emailsSent,
    emailSendErrors,
    nowUtc: nowIso,
  };

  console.log('[sendScheduledMessages] completed:', result);
  return result;
}
