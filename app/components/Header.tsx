"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "./AuthProvider";

const BRAND_CYCLE_MS = 7000;

interface HeaderProps {
  onLoginClick: () => void;
}

export default function Header({ onLoginClick }: HeaderProps) {
  const { user, loading, userName } = useAuth();
  const [brandPhase, setBrandPhase] = useState<"logo" | "greeting">("logo");
  const [typedLength, setTypedLength] = useState(0);

  const greetingText = useMemo(() => {
    const n = userName?.trim();
    return n ? `Ciao, ${n}!` : "Ciao!";
  }, [userName]);

  useEffect(() => {
    if (!user || loading) {
      setBrandPhase("logo");
      setTypedLength(0);
      return;
    }

    const id = window.setInterval(() => {
      setBrandPhase((p) => (p === "logo" ? "greeting" : "logo"));
    }, BRAND_CYCLE_MS);
    return () => clearInterval(id);
  }, [user, loading]);

  useEffect(() => {
    if (brandPhase !== "greeting") {
      setTypedLength(0);
      return;
    }

    setTypedLength(0);
    let cancelled = false;

    const run = async () => {
      for (let i = 1; i <= greetingText.length; i++) {
        if (cancelled) return;
        const delay = 28 + Math.random() * 95;
        await new Promise((r) => setTimeout(r, delay));
        if (cancelled) return;
        setTypedLength(i);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [brandPhase, greetingText]);

  const showAlternateBrand = Boolean(user && !loading);

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link
            href="/"
            className="min-w-0 flex-1 mr-4 hover:opacity-80 transition-opacity"
          >
            {showAlternateBrand && brandPhase === "greeting" ? (
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 min-h-8 flex items-baseline flex-wrap gap-x-0 max-w-[min(100%,20rem)] sm:max-w-md">
                <span className="break-words">{greetingText.slice(0, typedLength)}</span>
                <span
                  className={`inline-block w-0.5 h-6 shrink-0 translate-y-0.5 ml-0.5 rounded-sm ${
                    typedLength < greetingText.length
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-zinc-400/70 dark:bg-zinc-500 animate-pulse"
                  }`}
                  aria-hidden
                />
              </h1>
            ) : (
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                disciplinaFIT
              </h1>
            )}
          </Link>

          {!loading && (
            user ? (
              <Link
                href="/profile"
                className="px-6 py-1 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium rounded-lg transition-colors duration-200 shrink-0"
              >
                profilo
              </Link>
            ) : (
              <button
                type="button"
                onClick={onLoginClick}
                className="px-6 py-1 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md shrink-0"
              >
                accedi
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
