"use client";

import { useState } from "react";

const MAX_NAME_LENGTH = 15;

interface NameDialogProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export default function NameDialog({ isOpen, onSuccess }: NameDialogProps) {
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = userName.trim();

    if (!trimmed) {
      setError("Inserisci il tuo nome");
      return;
    }

    if (trimmed.length > MAX_NAME_LENGTH) {
      setError(`Il nome non può superare ${MAX_NAME_LENGTH} caratteri`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_name: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore nel salvataggio");
      }

      setUserName("");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden
      />
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 py-8 px-4 border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Come ti chiami?
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Inserisci il tuo nome per personalizzare la tua esperienza.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="userName"
              className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2"
            >
              Il tuo nome
            </label>
            <input
              type="text"
              id="userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value.slice(0, MAX_NAME_LENGTH))}
              placeholder="Jennifer"
              maxLength={MAX_NAME_LENGTH}
              required
              className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {userName.length}/{MAX_NAME_LENGTH}
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || !userName.trim()}
            className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Salvataggio..." : "Salva"}
          </button>
        </form>
      </div>
    </div>
  );
}
