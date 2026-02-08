"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

interface HeaderProps {
  onLoginClick: () => void;
}

export default function Header({ onLoginClick }: HeaderProps) {
  const { user, loading, signOut } = useAuth();

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link href="/">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 cursor-pointer hover:opacity-80 transition-opacity">
              disciplinaFit
            </h1>
          </Link>
          
          {/* Auth Button */}
          {!loading && (
            user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-600 dark:text-zinc-400 hidden sm:inline">
                  {user.user_metadata?.phone || user.phone}
                </span>
                <button 
                  onClick={signOut}
                  className="px-6 py-1 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium rounded-lg transition-colors duration-200"
                >
                  esci
                </button>
              </div>
            ) : (
              <button 
                onClick={onLoginClick}
                className="px-6 py-1 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
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
