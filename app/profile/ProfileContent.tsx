"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/app/components/Header";
import LoginDialog from "@/app/components/LoginDialog";
import { useAuth } from "@/app/components/AuthProvider";
import { createClient } from "@/app/utils/supabase/client";
import PushNotificationToggle from "@/app/components/PushNotificationToggle";

const oneSignalEnabled = Boolean(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID);

type CompletionBadge = {
  id: number;
  completed_at: string | null;
  disciplines:
    | {
        title: string | null;
        slug: string;
        img_url: string | null;
      }
    | {
        title: string | null;
        slug: string;
        img_url: string | null;
      }[]
    | null;
};

function formatActivationDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ProfileContent() {
  const router = useRouter();
  const { user, loading, userName, signOut } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [completionBadges, setCompletionBadges] = useState<CompletionBadge[]>([]);
  const [completionBadgesLoading, setCompletionBadgesLoading] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<CompletionBadge | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) {
      setCompletionBadges([]);
      setCompletionBadgesLoading(false);
      return;
    }
    let cancelled = false;
    setCompletionBadgesLoading(true);
    void fetch("/api/user/completions")
      .then((res) => res.json())
      .then((data: { completions?: CompletionBadge[] }) => {
        if (cancelled) return;
        setCompletionBadges(data.completions ?? []);
        setCompletionBadgesLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setCompletionBadges([]);
          setCompletionBadgesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const email = user?.email || "—";

  const handleLogout = async () => {
    setLogoutOpen(false);
    await signOut();
    router.push("/");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "delete") return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/user/delete-account", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Eliminazione non riuscita");
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Errore imprevisto");
    } finally {
      setDeleteLoading(false);
    }
  };

  const closeDeleteDialog = () => {
    setDeleteOpen(false);
    setDeleteConfirmText("");
    setDeleteError(null);
  };

  const handleShareBadge = async (badge: CompletionBadge) => {
    const disciplineTitle = Array.isArray(badge.disciplines)
      ? badge.disciplines[0]?.title ?? "Percorso completato"
      : badge.disciplines?.title ?? "Percorso completato";
    const text = `Ho completato "${disciplineTitle}" su disciplinaFIT.`;
    const url = typeof window !== "undefined" ? window.location.origin : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Badge ottenuto", text, url });
      } else {
        await navigator.clipboard?.writeText(`${text} ${url}`.trim());
        alert("Messaggio copiato negli appunti!");
      }
    } catch {
      // no-op
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm">
        Caricamento…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header onLoginClick={() => setIsLoginOpen(true)} />

      <main className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/"
          className="inline-block text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 mb-8"
        >
          ← indietro
        </Link>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-8">Profilo</h1>

        <div className="space-y-6 mb-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Nome</p>
            <p className="text-lg text-zinc-900 dark:text-zinc-50">{userName?.trim() || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Email</p>
            <p className="text-lg text-zinc-900 dark:text-zinc-50">{email}</p>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Account attivo dal {formatActivationDate(user.created_at)}
          </p>
        </div>

        {oneSignalEnabled && (
          <div className="mb-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/40 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
              Notifiche
            </h2>
            <PushNotificationToggle oneSignalEnabled={oneSignalEnabled} />
          </div>
        )}

        <div className="mb-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
            I miei completamenti
          </h2>
          {completionBadgesLoading ? (
            <div className="space-y-3" aria-hidden>
              <div className="animate-pulse flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/40 px-3 py-2">
                <div className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                <div className="min-w-0 flex-1">
                  <div className="h-3 w-40 rounded bg-zinc-200 dark:bg-zinc-700 mb-2" />
                  <div className="h-3 w-28 rounded bg-zinc-200 dark:bg-zinc-700" />
                </div>
              </div>
              <div className="animate-pulse flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/40 px-3 py-2">
                <div className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                <div className="min-w-0 flex-1">
                  <div className="h-3 w-36 rounded bg-zinc-200 dark:bg-zinc-700 mb-2" />
                  <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
                </div>
              </div>
            </div>
          ) : completionBadges.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Nessun badge ancora. Completa il tuo primo percorso e comparira` qui.
            </p>
          ) : (
            <div className="space-y-3">
              {completionBadges.map((badge) => {
                const disc = Array.isArray(badge.disciplines)
                  ? badge.disciplines[0]
                  : badge.disciplines;
                return (
                  <div
                    key={badge.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedBadge(badge)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedBadge(badge);
                      }
                    }}
                    className="flex items-center gap-3 rounded-lg border border-emerald-200/80 dark:border-emerald-700/60 bg-emerald-50/70 dark:bg-emerald-950/30 px-3 py-2"
                  >
                    <div className="h-9 w-9 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center font-bold">
                      ✓
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                        {disc?.title ?? "Percorso completato"}
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        Completato il{" "}
                        {badge.completed_at
                          ? new Date(badge.completed_at).toLocaleDateString("it-IT")
                          : "—"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            className="px-6 py-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium rounded-lg transition-colors"
          >
            Esci
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="px-6 py-2 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium rounded-lg transition-colors"
          >
            Elimina account
          </button>
        </div>
      </main>

      <LoginDialog isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      {logoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Chiudi" onClick={() => setLogoutOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md p-6 border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Uscire?</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">Dovrai accedere di nuovo per usare disciplinaFIT.</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setLogoutOpen(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:opacity-90 transition-opacity"
              >
                Esci
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Chiudi" onClick={closeDeleteDialog} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md p-6 border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Eliminare l&apos;account?</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Questa azione è irreversibile. Per confermare, scrivi <span className="font-mono text-zinc-900 dark:text-zinc-100">delete</span> nel campo sotto.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="delete"
              autoComplete="off"
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 text-sm mb-3"
            />
            {deleteError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{deleteError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteDialog}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== "delete" || deleteLoading}
                onClick={handleDeleteAccount}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {deleteLoading ? "Eliminazione…" : "Conferma eliminazione"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedBadge && (
        <div className="fixed inset-0 z-70 bg-zinc-950/95 text-white">
          <div className="min-h-full flex flex-col items-center px-6 py-10 text-center">
            <div className="flex-1 w-full flex flex-col items-center justify-center">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300 mb-4">
              Badge ottenuto
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold leading-tight max-w-3xl">
              Ce l&apos;hai fatta!
            </h2>
            {(Array.isArray(selectedBadge.disciplines)
              ? selectedBadge.disciplines[0]?.img_url
              : selectedBadge.disciplines?.img_url) ? (
              <div className="mt-6 w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden border border-emerald-500/30">
                <img
                  src={
                    Array.isArray(selectedBadge.disciplines)
                      ? selectedBadge.disciplines[0]?.img_url ?? ""
                      : selectedBadge.disciplines?.img_url ?? ""
                  }
                  alt={
                    (Array.isArray(selectedBadge.disciplines)
                      ? selectedBadge.disciplines[0]?.title
                      : selectedBadge.disciplines?.title) ?? "Disciplina"
                  }
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null}
            <p className="mt-5 text-base sm:text-lg text-zinc-200 max-w-2xl">
              {Array.isArray(selectedBadge.disciplines)
                ? selectedBadge.disciplines[0]?.title ?? "Percorso completato"
                : selectedBadge.disciplines?.title ?? "Percorso completato"}
            </p>
            <p className="mt-2 text-sm text-zinc-300">
              Badge vinto il{" "}
              {selectedBadge.completed_at
                ? new Date(selectedBadge.completed_at).toLocaleDateString("it-IT")
                : "—"}
            </p>
            </div>
            <div className="mt-8 w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleShareBadge(selectedBadge)}
                className="px-6 py-3 rounded-lg border border-zinc-500 hover:border-zinc-300 text-zinc-100 font-semibold transition-colors"
              >
                Condividi
              </button>
              <button
                type="button"
                onClick={() => setSelectedBadge(null)}
                className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
