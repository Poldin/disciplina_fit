"use client";

import { useState } from "react";

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

export default function YouTubeBlock({ url }: { url: string }) {
  const [expanded, setExpanded] = useState(false);
  const videoId = extractYouTubeId(url);

  if (!videoId) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 underline dark:text-blue-400"
      >
        {url}
      </a>
    );
  }

  const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
      {expanded ? (
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            className="absolute inset-0 h-full w-full"
            src={embedUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video YouTube"
          />
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="group relative block w-full overflow-hidden focus:outline-none"
          aria-label="Riproduci video"
        >
          {/* Thumbnail */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnail}
            alt="Anteprima video"
            className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Overlay + play button */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors duration-200 group-hover:bg-black/40">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 shadow-lg transition-transform duration-200 group-hover:scale-110 sm:h-16 sm:w-16">
              <svg
                className="ml-1 h-6 w-6 text-white sm:h-7 sm:w-7"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
