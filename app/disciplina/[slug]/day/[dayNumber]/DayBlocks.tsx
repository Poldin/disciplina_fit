"use client";

import { useState, useCallback } from "react";
import type { DayBlock, BlockResponses } from "@/app/utils/dayBlockTypes";
import YouTubeBlock from "./YouTubeBlock";
import RatingBlock from "./RatingBlock";
import TextInputBlock from "./TextInputBlock";
import DayMessagesMarkdown from "./DayMessagesMarkdown";
import LinkPreviewBlock from "./LinkPreviewBlock";

type Props = {
  messageScheduleId: string;
  blocks: DayBlock[];
  initialResponses: BlockResponses;
};

export default function DayBlocks({
  messageScheduleId,
  blocks,
  initialResponses,
}: Props) {
  const [responses, setResponses] = useState<BlockResponses>(initialResponses);
  // Track which block ids are currently saving
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const saveResponse = useCallback(
    async (partial: BlockResponses) => {
      const ids = Object.keys(partial);
      setSavingIds((prev) => new Set([...prev, ...ids]));
      try {
        await fetch("/api/disciplines/day-response", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageScheduleId, responses: partial }),
        });
      } catch (err) {
        console.error("[DayBlocks] saveResponse error", err);
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
      }
    },
    [messageScheduleId]
  );

  if (blocks.length === 0) return null;

  return (
    <div className="space-y-4 px-1 sm:px-0">
      {blocks.map((block, i) => {
        if (block.type === "youtube") {
          return <YouTubeBlock key={i} url={block.url} />;
        }

        if (block.type === "markdown") {
          return <DayMessagesMarkdown key={i} source={block.content} />;
        }

        if (block.type === "link_preview") {
          return <LinkPreviewBlock key={i} url={block.url} />;
        }

        if (block.type === "rating") {
          const currentValue =
            typeof responses[block.id] === "number"
              ? (responses[block.id] as number)
              : null;

          return (
            <RatingBlock
              key={block.id}
              label={block.label}
              value={currentValue}
              saving={savingIds.has(block.id)}
              onChange={(val) => {
                setResponses((prev) => ({ ...prev, [block.id]: val }));
                saveResponse({ [block.id]: val });
              }}
            />
          );
        }

        if (block.type === "text_input") {
          const currentValue =
            typeof responses[block.id] === "string"
              ? (responses[block.id] as string)
              : "";

          return (
            <TextInputBlock
              key={block.id}
              label={block.label}
              placeholder={block.placeholder}
              value={currentValue}
              saving={savingIds.has(block.id)}
              onChange={(val) =>
                setResponses((prev) => ({ ...prev, [block.id]: val }))
              }
              onSave={() => saveResponse({ [block.id]: currentValue })}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
