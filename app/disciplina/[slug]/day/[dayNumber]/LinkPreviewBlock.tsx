"use client";

import { useEffect, useState } from "react";
import type { LinkPreviewData } from "@/app/api/link-preview/route";

type State =
  | { status: "loading" }
  | { status: "ok"; data: LinkPreviewData }
  | { status: "error" };

export default function LinkPreviewBlock({ url }: { url: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: LinkPreviewData) => {
        if (!cancelled) setState({ status: "ok", data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (state.status === "loading") {
    return (
      <div className="animate-pulse overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex gap-3 p-4">
          <div className="flex flex-col justify-center gap-2 flex-1 min-w-0">
            <div className="h-3.5 w-1/3 rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
          <div className="h-20 w-24 shrink-0 rounded-lg bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block truncate text-sm text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
      >
        {url}
      </a>
    );
  }

  const { data } = state;

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:shadow-zinc-800/40"
    >
      {/* Immagine OG in cima se disponibile */}
      {data.image ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={data.image}
          alt={data.title ?? ""}
          className="h-40 w-full object-cover sm:h-48"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : null}

      <div className="flex items-start gap-3 p-4">
        {/* Favicon */}
        {data.favicon ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={data.favicon}
            alt=""
            className="mt-0.5 h-4 w-4 shrink-0 rounded-sm object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}

        <div className="min-w-0 flex-1">
          {/* Site name */}
          {data.siteName ? (
            <p className="mb-0.5 truncate text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              {data.siteName}
            </p>
          ) : null}

          {/* Titolo */}
          {data.title ? (
            <p className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 group-hover:underline group-hover:underline-offset-2 dark:text-zinc-100">
              {data.title}
            </p>
          ) : (
            <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
              {data.url}
            </p>
          )}

          {/* Descrizione */}
          {data.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {data.description}
            </p>
          ) : null}
        </div>
      </div>
    </a>
  );
}
