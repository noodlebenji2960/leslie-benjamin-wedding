import { useState, useCallback } from "react";
import { useSession } from "@/contexts/SessionContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

export const EMOJIS = ["❤️", "😂", "😮", "👏", "😢"] as const;
export type Emoji = (typeof EMOJIS)[number];

interface ReactionBarProps {
  imageId: string;
  reactions: Record<string, number>;
  /** IDs of emojis this visitor has already reacted with */
  myReactions: Set<string>;
  onReacted: (emoji: string, reactions: Record<string, number>) => void;
}

export function ReactionBar({ imageId, reactions, myReactions, onReacted }: ReactionBarProps) {
  const { visitor } = useSession();
  const [pending, setPending] = useState<string | null>(null);

  const handleReact = useCallback(async (emoji: string) => {
    if (!visitor?.visitorId || pending || myReactions.has(emoji)) return;
    setPending(emoji);
    try {
      const res = await fetch(`${API_BASE}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, visitorId: visitor.visitorId, emoji }),
      });
      if (res.ok) {
        const data = await res.json() as { reactions: Record<string, number> };
        onReacted(emoji, data.reactions);
      }
    } finally {
      setPending(null);
    }
  }, [imageId, visitor, pending, myReactions, onReacted]);

  return (
    <div className="reaction-bar">
      {EMOJIS.map((emoji) => {
        const count = reactions[emoji] ?? 0;
        const mine = myReactions.has(emoji);
        return (
          <button
            key={emoji}
            className={`reaction-bar__btn${mine ? " reaction-bar__btn--mine" : ""}`}
            onClick={() => void handleReact(emoji)}
            disabled={!!pending || mine}
            aria-label={`React with ${emoji}${count ? `, ${count}` : ""}`}
          >
            <span className="reaction-bar__emoji">{emoji}</span>
            {count > 0 && <span className="reaction-bar__count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
