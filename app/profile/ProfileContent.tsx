"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/app/components/Header";
import LoginDialog from "@/app/components/LoginDialog";
import SubscriptionSection from "@/app/components/SubscriptionSection";
import { useAuth } from "@/app/components/AuthProvider";
import { createClient } from "@/app/utils/supabase/client";

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

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

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
          ← Torna alla home
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

        <div className="mb-10">
          <SubscriptionSection />
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
    </div>
  );
}
