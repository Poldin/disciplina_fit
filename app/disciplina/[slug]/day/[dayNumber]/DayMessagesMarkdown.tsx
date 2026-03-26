"use client";

import ReactMarkdown from "react-markdown";

export default function DayMessagesMarkdown({ source }: { source: string }) {
  return (
    <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200">
      <ReactMarkdown>{source}</ReactMarkdown>
    </div>
  );
}
