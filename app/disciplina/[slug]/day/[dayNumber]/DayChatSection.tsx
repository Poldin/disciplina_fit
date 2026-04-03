"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { useAuth } from "@/app/components/AuthProvider";

type RawMessage = {
  id: string;
  created_at: string;
  user_id: string;
  content: string;
  parent_id: string | null;
};

type ChatMessage = RawMessage & {
  userName: string | null;
  replies: (RawMessage & { userName: string | null })[];
};

type Props = {
  disciplineId: string;
  dayNumber: number;
};

export default function DayChatSection({ disciplineId, dayNumber }: Props) {
  const { user, userName: currentUserName } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [submittingNew, setSubmittingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openReplyId, setOpenReplyId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    const supabase = createClient();
    const { data: rows, error: fetchError } = await supabase
      .from("day_chat_messages")
      .select("id, created_at, user_id, content, parent_id")
      .eq("discipline_id", disciplineId)
      .eq("day_number", dayNumber)
      .order("created_at", { ascending: true });

    if (fetchError || !rows) {
      setLoading(false);
      return;
    }

    const userIds = [...new Set(rows.map((r) => r.user_id as string))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, user_name")
      .in("id", userIds);

    const nameMap: Record<string, string | null> = {};
    for (const p of profiles ?? []) {
      nameMap[p.id as string] = (p.user_name as string | null) ?? null;
    }

    const topLevel = rows.filter((r) => r.parent_id === null) as RawMessage[];
    const replies = rows.filter((r) => r.parent_id !== null) as RawMessage[];

    const built: ChatMessage[] = topLevel.map((m) => ({
      ...m,
      userName: nameMap[m.user_id] ?? null,
      replies: replies
        .filter((r) => r.parent_id === m.id)
        .map((r) => ({ ...r, userName: nameMap[r.user_id] ?? null })),
    }));

    setMessages(built);
    setLoading(false);
  }, [disciplineId, dayNumber]);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  const userHasTopLevel = messages.some((m) => m.user_id === user?.id);

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

  return (
    <section className="mt-12">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
        Commenti
      </h2>
      <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
        condividi con chi arriverà qui dopo di te
      </p>

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/80 shadow-sm overflow-hidden">
        {/* Messages list */}
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
                      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap wrap-break-word">
                          {msg.content}
                      </p>
                      <div className="mt-2 flex items-center gap-4">
                        <button
                          onClick={() => toggleReply(msg.id)}
                          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                        >
                          {isOpen
                            ? "Nascondi"
                            : replyCount > 0
                              ? `↳ ${replyCount} rispost${replyCount === 1 ? "a" : "e"}`
                              : "Rispondi"}
                        </button>
                        {replyCount > 0 && !isOpen && (
                          <button
                            onClick={() => toggleReply(msg.id)}
                            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                          >
                            Rispondi
                          </button>
                        )}
                        {msg.user_id === user?.id && (
                          <button
                            onClick={() => void deleteMessage(msg.id)}
                            className="text-xs text-red-400 hover:text-red-500 transition-colors"
                          >
                            Elimina
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Replies + reply input (collapsible) */}
                  {isOpen && (
                    <div className="ml-11 space-y-3">
                      {msg.replies.map((reply) => (
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
                            <p className="mt-0.5 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap wrap-break-word">
                              {reply.content}
                            </p>
                            {reply.user_id === user?.id && (
                              <button
                                onClick={() => void deleteMessage(reply.id)}
                                className="mt-1 text-xs text-red-400 hover:text-red-500 transition-colors"
                              >
                                Elimina
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

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
              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}
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
