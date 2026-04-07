"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Heart,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Check,
  X,
  MoreHorizontal,
  Flag,
  MessageSquare,
} from "lucide-react";
import { createClient } from "@/app/utils/supabase/client";
import { useAuth } from "@/app/components/AuthProvider";

type RawMessage = {
  id: string;
  created_at: string;
  updated_at: string | null;
  user_id: string;
  content: string;
  parent_id: string | null;
};

type ChatMessage = RawMessage & {
  userName: string | null;
  replies: (RawMessage & { userName: string | null })[];
};

type LikeState = { count: number; likedByMe: boolean };

type ReportTarget = { id: string; content: string };

type Props = { disciplineId: string; dayNumber: number };

const iconBtn =
  "flex items-center gap-1.5 transition-colors disabled:opacity-40 py-1 px-1";
const iconBtnGray = `${iconBtn} text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-100`;
const iconBtnRed = `${iconBtn} text-zinc-400 hover:text-red-500 dark:hover:text-red-400`;

function EditBox({
  id,
  rows = 3,
  value,
  onChange,
  onSave,
  onCancel,
}: {
  id: string;
  rows?: number;
  value: string;
  onChange: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-1 space-y-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSave(); }
          if (e.key === "Escape") onCancel();
        }}
        rows={rows}
        autoFocus
        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
      />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className={iconBtnGray}>
          <X size={16} /><span className="text-sm">Annulla</span>
        </button>
        <button
          onClick={onSave}
          disabled={!value.trim()}
          className={`${iconBtn} px-3 py-1 rounded-md bg-zinc-900 dark:bg-zinc-100 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300`}
        >
          <Check size={15} /><span>Salva</span>
        </button>
      </div>
    </div>
  );
}

export default function DayChatSection({ disciplineId, dayNumber }: Props) {
  const { user, userName: currentUserName } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [likes, setLikes] = useState<Record<string, LikeState>>({});
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [submittingNew, setSubmittingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openReplyId, setOpenReplyId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<Record<string, string>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [animatingLikes, setAnimatingLikes] = useState<Record<string, boolean>>({});
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuId]);

  const fetchMessages = useCallback(async () => {
    const supabase = createClient();
    const { data: rows, error: fetchError } = await supabase
      .from("day_chat_messages")
      .select("id, created_at, updated_at, user_id, content, parent_id")
      .eq("discipline_id", disciplineId)
      .eq("day_number", dayNumber)
      .order("created_at", { ascending: true });

    if (fetchError || !rows) { setLoading(false); return; }

    const messageIds = rows.map((r) => r.id as string);

    const [profilesResult, likesResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, user_name")
        .in("id", [...new Set(rows.map((r) => r.user_id as string))]),
      messageIds.length > 0
        ? supabase
            .from("day_chat_likes")
            .select("message_id, user_id")
            .in("message_id", messageIds)
        : Promise.resolve({ data: [] }),
    ]);

    const nameMap: Record<string, string | null> = {};
    for (const p of profilesResult.data ?? []) {
      nameMap[p.id as string] = (p.user_name as string | null) ?? null;
    }

    const likesMap: Record<string, LikeState> = {};
    for (const l of (likesResult.data ?? []) as { message_id: string; user_id: string }[]) {
      if (!likesMap[l.message_id]) likesMap[l.message_id] = { count: 0, likedByMe: false };
      likesMap[l.message_id].count++;
      if (l.user_id === user?.id) likesMap[l.message_id].likedByMe = true;
    }

    const topLevel = rows.filter((r) => r.parent_id === null) as RawMessage[];
    const replies = rows.filter((r) => r.parent_id !== null) as RawMessage[];

    setMessages(
      topLevel.map((m) => ({
        ...m,
        userName: nameMap[m.user_id] ?? null,
        replies: replies
          .filter((r) => r.parent_id === m.id)
          .map((r) => ({ ...r, userName: nameMap[r.user_id] ?? null })),
      }))
    );
    setLikes(likesMap);
    setLoading(false);
  }, [disciplineId, dayNumber, user?.id]);

  useEffect(() => { void fetchMessages(); }, [fetchMessages]);

  const userHasTopLevel = messages.some((m) => m.user_id === user?.id);

  const toggleLike = async (messageId: string) => {
    if (!user) return;
    const current = likes[messageId] ?? { count: 0, likedByMe: false };
    setLikes((prev) => ({
      ...prev,
      [messageId]: {
        count: current.likedByMe ? current.count - 1 : current.count + 1,
        likedByMe: !current.likedByMe,
      },
    }));
    if (!current.likedByMe) {
      setAnimatingLikes((prev) => ({ ...prev, [messageId]: true }));
      setTimeout(
        () => setAnimatingLikes((prev) => ({ ...prev, [messageId]: false })),
        500
      );
    }
    const supabase = createClient();
    if (current.likedByMe) {
      await supabase.from("day_chat_likes").delete().eq("message_id", messageId).eq("user_id", user.id);
    } else {
      await supabase.from("day_chat_likes").insert({ message_id: messageId, user_id: user.id });
    }
  };

  const submitMessage = async () => {
    if (!newContent.trim() || submittingNew || !user) return;
    setSubmittingNew(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("day_chat_messages").insert({
      user_id: user.id,
      discipline_id: disciplineId,
      day_number: dayNumber,
      content: newContent.trim(),
      parent_id: null,
    });
    if (insertError) {
      setError("Impossibile pubblicare il messaggio. Riprova.");
    } else {
      setNewContent("");
      await fetchMessages();
    }
    setSubmittingNew(false);
  };

  const submitReply = async (parentId: string) => {
    const content = replyContent[parentId]?.trim();
    if (!content || submittingReply || !user) return;
    setSubmittingReply(parentId);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("day_chat_messages").insert({
      user_id: user.id,
      discipline_id: disciplineId,
      day_number: dayNumber,
      content,
      parent_id: parentId,
    });
    if (!insertError) {
      setReplyContent((prev) => ({ ...prev, [parentId]: "" }));
      await fetchMessages();
    }
    setSubmittingReply(null);
  };

  const deleteMessage = async (id: string) => {
    if (!window.confirm("Vuoi davvero eliminare il commento?")) return;
    const supabase = createClient();
    await supabase.from("day_chat_messages").delete().eq("id", id);
    await fetchMessages();
  };

  const startEdit = (id: string, currentContent: string) => {
    setEditContent((prev) => ({ ...prev, [id]: currentContent }));
    setEditingId(id);
    setOpenMenuId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    const content = editContent[id]?.trim();
    if (!content) return;
    const supabase = createClient();
    await supabase
      .from("day_chat_messages")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", id);
    setEditingId(null);
    await fetchMessages();
  };

  const openReport = (id: string, content: string) => {
    setReportTarget({ id, content });
    setReportReason("");
    setReportSent(false);
    setOpenMenuId(null);
  };

  const submitReport = async () => {
    if (!reportTarget || submittingReport) return;
    setSubmittingReport(true);
    try {
      await fetch("/api/chat/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: reportTarget.id,
          messageContent: reportTarget.content,
          reporterName: currentUserName,
          reason: reportReason || null,
          pageUrl: window.location.href,
        }),
      });
      setReportSent(true);
    } finally {
      setSubmittingReport(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("it-IT", { day: "numeric", month: "short" }) +
      " · " +
      d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
    );
  };

  const displayName = (userId: string, userName: string | null) => {
    if (userId === user?.id) return currentUserName ?? "Tu";
    return userName ?? "Utente";
  };

  const toggleReply = (id: string) =>
    setOpenReplyId((prev) => (prev === id ? null : id));

  /* ── Sub-components ── */

  const LikeButton = ({ messageId }: { messageId: string }) => {
    const { count, likedByMe } = likes[messageId] ?? { count: 0, likedByMe: false };
    const isAnimating = animatingLikes[messageId] ?? false;
    return (
      <button
        onClick={() => void toggleLike(messageId)}
        title={likedByMe ? "Rimuovi like" : "Metti like"}
        className={`${iconBtn} ${likedByMe ? "text-red-400 hover:text-red-500" : iconBtnGray}`}
      >
        <span
          style={
            isAnimating
              ? { animation: "like-pop 0.45s cubic-bezier(0.36,0.07,0.19,0.97) both" }
              : undefined
          }
          className="inline-flex"
        >
          <Heart
            size={24}
            fill={likedByMe ? "currentColor" : "none"}
            strokeWidth={likedByMe ? 0 : 1.8}
          />
        </span>
        {count > 0 && <span className="text-sm font-medium">{count}</span>}
      </button>
    );
  };

  const ThreeDotsMenu = ({
    msgId,
    msgContent,
    isOwn,
    isEditing,
  }: {
    msgId: string;
    msgContent: string;
    isOwn: boolean;
    isEditing: boolean;
  }) => {
    if (isEditing) return null;
    const isOpen = openMenuId === msgId;
    return (
      <div className="relative" ref={isOpen ? menuRef : undefined}>
        <button
          onClick={() => setOpenMenuId(isOpen ? null : msgId)}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Opzioni"
        >
          <MoreHorizontal size={17} />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-7 z-20 min-w-36 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg py-1 text-sm">
            {isOwn && (
              <>
                <button
                  onClick={() => startEdit(msgId, msgContent)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Pencil size={14} />
                  Modifica
                </button>
                <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                <button
                  onClick={() => { setOpenMenuId(null); void deleteMessage(msgId); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <Trash2 size={14} />
                  Elimina
                </button>
              </>
            )}
            {!isOwn && (
              <button
                onClick={() => openReport(msgId, msgContent)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <Flag size={14} />
                Segnala
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="mt-12">
      <style>{`
        @keyframes like-pop {
          0%   { transform: scale(1) rotate(0deg); }
          20%  { transform: scale(1.55) rotate(-12deg); }
          45%  { transform: scale(0.88) rotate(6deg); }
          65%  { transform: scale(1.2) rotate(-4deg); }
          80%  { transform: scale(0.96) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
      `}</style>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-2">
        <MessageSquare
          className="shrink-0 text-zinc-500 dark:text-zinc-400"
          size={18}
          strokeWidth={1.75}
          aria-hidden
        />
        Commenti
      </h2>
      <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
        condividi con chi arriverà qui dopo di te
      </p>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {loading ? (
          <div className="py-10 text-center text-sm text-zinc-400">Caricamento...</div>
        ) : messages.length === 0 ? (
          <div className="py-10 text-center text-sm text-zinc-400">
            Nessun messaggio ancora — inizia tu!
          </div>
        ) : (
          messages.map((msg) => {
              const isOpen = openReplyId === msg.id;
              const replyCount = msg.replies.length;
              const isOwn = msg.user_id === user?.id;
              const isEditing = editingId === msg.id;

              return (
                <div key={msg.id} className="py-4 space-y-3">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300">
                      {displayName(msg.user_id, msg.userName).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Header row: name + time + ⋮ */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-baseline gap-2 flex-wrap min-w-0">
                          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                            {displayName(msg.user_id, msg.userName)}
                          </span>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                        <ThreeDotsMenu
                          msgId={msg.id}
                          msgContent={msg.content}
                          isOwn={isOwn}
                          isEditing={isEditing}
                        />
                      </div>

                      {/* Content or edit box */}
                      {isEditing ? (
                        <EditBox
                          id={msg.id}
                          rows={3}
                          value={editContent[msg.id] ?? ""}
                          onChange={(val) => setEditContent((prev) => ({ ...prev, [msg.id]: val }))}
                          onSave={() => void saveEdit(msg.id)}
                          onCancel={cancelEdit}
                        />
                      ) : (
                        <>
                          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap wrap-break-word">
                            {msg.content}
                          </p>
                          {msg.updated_at && (
                            <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">modificato</span>
                          )}
                        </>
                      )}

                      {/* Action bar */}
                      <div className="mt-2 flex items-center gap-3">
                        <LikeButton messageId={msg.id} />
                        <button
                          onClick={() => toggleReply(msg.id)}
                          title={isOpen ? "Nascondi risposte" : "Vedi risposte"}
                          className={iconBtnGray}
                        >
                          {isOpen ? <EyeOff size={17} /> : <Eye size={17} />}
                          <span className="text-sm">
                            risposte{replyCount > 0 ? ` ${replyCount}` : ""}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Replies + reply input */}
                  {isOpen && (
                    <div className="ml-11 space-y-3">
                      {msg.replies.map((reply) => {
                        const isReplyOwn = reply.user_id === user?.id;
                        const isReplyEditing = editingId === reply.id;
                        return (
                          <div key={reply.id} className="flex gap-2.5">
                            <div className="w-6 h-6 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300">
                              {displayName(reply.user_id, reply.userName).charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-baseline gap-2 flex-wrap min-w-0">
                                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                                    {displayName(reply.user_id, reply.userName)}
                                  </span>
                                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                                    {formatTime(reply.created_at)}
                                  </span>
                                </div>
                                <ThreeDotsMenu
                                  msgId={reply.id}
                                  msgContent={reply.content}
                                  isOwn={isReplyOwn}
                                  isEditing={isReplyEditing}
                                />
                              </div>

                              {isReplyEditing ? (
                                <EditBox
                                  id={reply.id}
                                  rows={2}
                                  value={editContent[reply.id] ?? ""}
                                  onChange={(val) => setEditContent((prev) => ({ ...prev, [reply.id]: val }))}
                                  onSave={() => void saveEdit(reply.id)}
                                  onCancel={cancelEdit}
                                />
                              ) : (
                                <>
                                  <p className="mt-0.5 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap wrap-break-word">
                                    {reply.content}
                                  </p>
                                  {reply.updated_at && (
                                    <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">modificato</span>
                                  )}
                                </>
                              )}

                              <div className="mt-1.5 flex items-center gap-3">
                                <LikeButton messageId={reply.id} />
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Reply input */}
                      <div className="flex gap-2.5">
                        <div className="w-6 h-6 shrink-0 rounded-full bg-zinc-800 dark:bg-zinc-200 flex items-center justify-center text-xs font-bold text-white dark:text-zinc-900">
                          {(currentUserName ?? "T").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={replyContent[msg.id] ?? ""}
                            onChange={(e) => setReplyContent((prev) => ({ ...prev, [msg.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submitReply(msg.id); }
                            }}
                            placeholder="Scrivi una risposta..."
                            rows={2}
                            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                          />
                          <div className="mt-1.5 flex justify-end">
                            <button
                              onClick={() => void submitReply(msg.id)}
                              disabled={!replyContent[msg.id]?.trim() || submittingReply === msg.id}
                              className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors disabled:opacity-40"
                            >
                              {submittingReply === msg.id ? "..." : "Rispondi"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
        )}

        {/* New message input */}
        {!userHasTopLevel && (
          <div className="pt-6 space-y-2">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submitMessage(); }
              }}
              placeholder="scrivi qui"
              rows={4}
              className="w-full min-h-30 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-4 py-3 text-base text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 resize-y focus:outline-none focus:ring-2 focus:ring-zinc-400/80 dark:focus:ring-zinc-600/80 sm:text-sm"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex justify-end">
              <button
                onClick={() => void submitMessage()}
                disabled={!newContent.trim() || submittingNew}
                className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors disabled:opacity-40"
              >
                {submittingNew ? "Pubblicazione..." : "Pubblica"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Report dialog */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-5 space-y-4">
            {reportSent ? (
              <>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  Segnalazione inviata ✓
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Grazie. Verificheremo il commento al più presto.
                </p>
                <div className="flex justify-end">
                  <button
                    onClick={() => setReportTarget(null)}
                    className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
                  >
                    Chiudi
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      Segnala commento
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                      Perché vuoi segnalare questo commento? (opzionale)
                    </p>
                  </div>
                  <button
                    onClick={() => setReportTarget(null)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 px-3 py-2">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-3">
                    {reportTarget.content}
                  </p>
                </div>

                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Descrivi il problema (facoltativo)..."
                  rows={3}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                />

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setReportTarget(null)}
                    className={iconBtnGray}
                  >
                    <span className="text-sm">Annulla</span>
                  </button>
                  <button
                    onClick={() => void submitReport()}
                    disabled={submittingReport}
                    className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors disabled:opacity-40"
                  >
                    {submittingReport ? "Invio..." : "Invia segnalazione"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
