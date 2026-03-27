"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  // ── Headings ──────────────────────────────────────────────────────────────
  h1: ({ children }) => (
    <h1 className="mb-3 mt-6 text-2xl font-bold leading-tight text-zinc-900 first:mt-0 dark:text-zinc-50">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-5 text-xl font-bold leading-tight text-zinc-900 first:mt-0 dark:text-zinc-50">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-widest text-zinc-500 first:mt-0 dark:text-zinc-400">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-1 mt-3 text-sm font-semibold text-zinc-700 first:mt-0 dark:text-zinc-300">
      {children}
    </h4>
  ),
  h5: ({ children }) => (
    <h5 className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 first:mt-0 dark:text-zinc-400">
      {children}
    </h5>
  ),
  h6: ({ children }) => (
    <h6 className="mb-1 mt-2 text-xs font-medium text-zinc-400 first:mt-0 dark:text-zinc-500">
      {children}
    </h6>
  ),

  // ── Paragraphs & inline ───────────────────────────────────────────────────
  p: ({ children }) => (
    <p className="mb-3 leading-relaxed text-zinc-800 last:mb-0 dark:text-zinc-200">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
      {children}
    </strong>
  ),
  em: ({ children }) => (
    <em className="italic text-zinc-700 dark:text-zinc-300">{children}</em>
  ),
  del: ({ children }) => (
    <del className="text-zinc-400 line-through dark:text-zinc-500">{children}</del>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
    >
      {children}
    </a>
  ),

  // ── Lists ─────────────────────────────────────────────────────────────────
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-zinc-800 last:mb-0 dark:text-zinc-200">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-zinc-800 last:mb-0 dark:text-zinc-200">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,

  // ── Blockquote & hr ───────────────────────────────────────────────────────
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 border-zinc-300 pl-4 italic text-zinc-600 dark:border-zinc-600 dark:text-zinc-400">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-zinc-200 dark:border-zinc-700" />,

  // ── Code ──────────────────────────────────────────────────────────────────
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-lg bg-zinc-900 p-4 dark:bg-zinc-950">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const isBlock = !!className || String(children).includes("\n");
    if (isBlock) {
      return (
        <code className={`font-mono text-sm text-emerald-300 ${className ?? ""}`}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
        {children}
      </code>
    );
  },

  // ── Table (GFM) ───────────────────────────────────────────────────────────
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-zinc-100 dark:bg-zinc-800">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">{children}</tbody>
  ),
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-zinc-800 dark:text-zinc-200">{children}</td>
  ),

  // ── Image ─────────────────────────────────────────────────────────────────
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? ""}
      className="my-3 max-w-full rounded-lg"
    />
  ),
};

export default function DayMessagesMarkdown({ source }: { source: string }) {
  return (
    <div className="text-zinc-800 dark:text-zinc-200">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
