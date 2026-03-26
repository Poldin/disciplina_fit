"use client";

import { useAuth } from "./AuthProvider";

/** Saluto sotto l'header per utenti loggati */
export default function UserInfoBanner() {
  const { user, loading, userName } = useAuth();

  if (loading || !user) return null;

  const greeting = userName?.trim() ? `Ciao ${userName.trim()}!` : "Ciao!";

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{greeting}</span>
      </div>
    </div>
  );
}
