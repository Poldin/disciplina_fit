"use client";

import { useState, useEffect, useCallback } from "react";
import { Heart, Eye, EyeOff, Pencil, Trash2, Check, X } from "lucide-react";
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

type LikeState = {
  count: number;
  likedByMe: boolean;
};

type Props = {
  disciplineId: string;
  dayNumber: number;
};

const iconBtn =
  "flex items-center gap-1 transition-colors disabled:opacity-40";
const iconBtnGray =
  `${iconBtn} text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-100`;
const iconBtnRed =
  `${iconBtn} text-zinc-400 hover:text-red-500 dark:hover:text-red-400`;

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

  const fetchMessages = useCallback(async () => {
    const supabase = createClient();

    const { data: rows, error: fetchError } = await supabase
      .from("day_chat_messages")
      .select("id, created_at, updated_at, user_id, content, parent_id")
      .eq("discipline_id", disciplineId)
      .eq("day_number", dayNumber)
      .order("created_at", { ascending: true });

    if (fetchError || !rows) {
      setLoading(false);
      return;
    }

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
    for (const l of (likesResult.data ?? []) as {
      message_id: string;
      user_id: string;
    }[]) {
      if (!likesMap[l.message_id])
        likesMap[l.message_id] = { count: 0, likedByMe: false };
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

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

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
    const supabase = createClient();
    if (current.likedByMe) {
      await supabase
        .from("day_chat_likes")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("day_chat_likes")
        .insert({ message_id: messageId, user_id: user.id });
    }
  };

  const submitMessage = async () => {
    if (!newContent.trim() || submittingNew || !user) return;
    setSubmittingNew(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("day_chat_messages")
      .insert({
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
    const { error: insertError } = await supabase
      .from("day_chat_messages")
      .insert({
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
    if (!window.confirm("Eliminare questo messaggio?")) return;
    const supabase = createClient();
    await supabase.from("day_chat_messages").delete().eq("id", id);
    await fetchMessages();
  };

  const startEdit = (id: string, currentContent: string) => {
    setEditContent((prev) => ({ ...prev, [id]: currentContent }));
    setEditingId(id);
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

  /* ── Inline edit UI ── */
  const EditBox = ({
    id,
    rows = 3,
  }: {
    id: string;
    rows?: number;
  }) => (
    <div className="mt-1 space-y-2">
      <textarea
        value={editContent[id] ?? ""}
        onChange={(e) =>
          setEditContent((prev) => ({ ...prev, [id]: e.target.value }))
        }
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void saveEdit(id);
          }
          if (e.key === "Escape") cancelEdit();
        }}
        rows={rows}
        autoFocus
        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
      />
      <div className="flex gap-2 justify-end">
        <button
          onClick={cancelEdit}
          title="Annulla"
          className={iconBtnGray}
        >
          <X size={14} />
          <span className="text-xs">Annulla</span>
        </button>
        <button
          onClick={() => void saveEdit(id)}
          disabled={!editContent[id]?.trim()}
          title="Salva"
          className={`${iconBtn} px-3 py-1 rounded-md bg-zinc-900 dark:bg-zinc-100 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300`}
        >
          <Check size={13} />
          <span>Salva</span>
        </button>
      </div>
    </div>
  );

  /* ── Like button ── */
  const LikeButton = ({ messageId }: { messageId: string }) => {
    const { count, likedByMe } = likes[messageId] ?? {
      count: 0,
      likedByMe: false,
    };
    return (
      <button
        onClick={() => void toggleLike(messageId)}
        title={likedByMe ? "Rimuovi like" : "Metti like"}
        className={`${iconBtn} ${likedByMe ? "text-red-400 hover:text-red-500" : iconBtnGray}`}
      >
        <Heart
          size={13}
          fill={likedByMe ? "currentColor" : "none"}
          strokeWidth={likedByMe ? 0 : 1.8}
        />
        {count > 0 && <span className="text-xs">{count}</span>}
      </button>
    );
  };

  return (
    <section className="mt-12">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
        Commenti
      </h2>
      <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
        condividi con chi arriverà qui dopo di te
      </p>

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/80 shadow-sm overflow-hidden">
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-zinc-400">
              Caricamento...
            </div>
          ) : messages.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-zinc-400">
              Nessun messaggio ancora — inizia tu!
            </div>
          ) : (
            messages.map((msg) => {
              const isOpen = openReplyId === msg.id;
              const replyCount = msg.replies.length;
              const isOwn = msg.user_id === user?.id;
              const isEditing = editingId === msg.id;

              return (
                <div key={msg.id} className="px-5 py-4 space-y-3">
                  {/* Top-level message */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300">
                      {displayName(msg.user_id, msg.userName)
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                          {displayName(msg.user_id, msg.userName)}
                        </span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>

                      {isEditing ? (
                        <EditBox id={msg.id} rows={3} />
                      ) : (
                        <>
                          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap wrap-break-word">
                            {msg.content}
                          </p>
                          {msg.updated_at && (
                            <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                              modificato
                            </span>
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
                          {isOpen ? (
                            <EyeOff size={13} />
                          ) : (
                            <Eye size={13} />
                          )}
                          {!isOpen && replyCount > 0 && (
                            <span className="text-xs">{replyCount}</span>
                          )}
                        </button>

                        {isOwn && !isEditing && (
                          <>
                            <button
                              onClick={() => startEdit(msg.id, msg.content)}
                              title="Modifica"
                              className={iconBtnGray}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => void deleteMessage(msg.id)}
                              title="Elimina"
                              className={iconBtnRed}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Replies + reply input (collapsible) */}
                  {isOpen && (
                    <div className="ml-11 space-y-3">
                      {msg.replies.map((reply) => {
                        const isReplyOwn = reply.user_id === user?.id;
                        const isReplyEditing = editingId === reply.id;
                        return (
                          <div key={reply.id} className="flex gap-2.5">
                            <div className="w-6 h-6 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300">
                              {displayName(reply.user_id, reply.userName)
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                                  {displayName(reply.user_id, reply.userName)}
                                </span>
                                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                                  {formatTime(reply.created_at)}
                                </span>
                              </div>

                              {isReplyEditing ? (
                                <EditBox id={reply.id} rows={2} />
                              ) : (
                                <>
                                  <p className="mt-0.5 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap wrap-break-word">
                                    {reply.content}
                                  </p>
                                  {reply.updated_at && (
                                    <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                                      modificato
                                    </span>
                                  )}
                                </>
                              )}

                              <div className="mt-1.5 flex items-center gap-3">
                                <LikeButton messageId={reply.id} />
                                {isReplyOwn && !isReplyEditing && (
                                  <>
                                    <button
                                      onClick={() =>
                                        startEdit(reply.id, reply.content)
                                      }
                                      title="Modifica"
                                      className={iconBtnGray}
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button
                                      onClick={() =>
                                        void deleteMessage(reply.id)
                                      }
                                      title="Elimina"
                                      className={iconBtnRed}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </>
                                )}
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
                            onChange={(e) =>
                              setReplyContent((prev) => ({
                                ...prev,
                                [msg.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                void submitReply(msg.id);
                              }
                            }}
                            placeholder="Scrivi una risposta..."
                            rows={2}
                            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                          />
                          <div className="mt-1.5 flex justify-end">
                            <button
                              onClick={() => void submitReply(msg.id)}
                              disabled={
                                !replyContent[msg.id]?.trim() ||
                                submittingReply === msg.id
                              }
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
        </div>

        {/* New top-level message input */}
        {!userHasTopLevel && (
          <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
            <div className="space-y-2">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void submitMessage();
                  }
                }}
                placeholder="scrivi qui"
                rows={3}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
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
          </div>
        )}
      </div>

      {userHasTopLevel && (
        <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
          Hai già lasciato il tuo commento ✓
        </p>
      )}
    </section>
  );
}
