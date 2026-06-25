import { useCallback, useMemo, useState } from "react";
import { useServer } from "@/contexts/ServerContext";
import { useSession } from "@/contexts/SessionContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;
const UPLOADER_NAME_KEY = "wedding_uploader_name";

interface InlineReactionPickerProps {
  imageId: string;
  myReaction: string | null;
  onReacted: (emoji: string, reactions: Record<string, number>) => void;
  onClose: () => void;
}

const ALL_GROUP_KEY = "all";

export function InlineReactionPicker({
  imageId,
  myReaction,
  onReacted,
  onClose,
}: InlineReactionPickerProps) {
  const [openMore, setOpenMore] = useState(false);
  const [activeGroup, setActiveGroup] = useState(ALL_GROUP_KEY);
  const [pending, setPending] = useState<string | null>(null);
  const server = useServer();
  const { visitor } = useSession();

  const groups = server.config?.REACTION_GROUPS ?? [];
  const allEmojis = groups.flatMap((g) => g.emojis);

  const activeEmojis = useMemo(
    () =>
      activeGroup === ALL_GROUP_KEY
        ? allEmojis
        : groups.find((g) => g.key === activeGroup)?.emojis ?? [],
    [groups, activeGroup, allEmojis],
  );

  const handleReact = useCallback(
    async (emoji: string) => {
      const uploaderName = localStorage.getItem(UPLOADER_NAME_KEY)?.trim() ?? "";
      if (!visitor?.visitorId || !uploaderName || pending) return;
      if (emoji === myReaction) { onClose(); return; }

      setPending(emoji);

      try {
        const res = await fetch(`${API_BASE}/react`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageId,
            visitorId: visitor.visitorId,
            uploaderName,
            emoji,
          }),
        });

        if (!res.ok) { console.error("Reaction failed"); return; }

        const data = (await res.json()) as {
          reactions: Record<string, number>;
          previousEmoji: string | null;
        };

        onReacted(emoji, data.reactions);
      } catch (err) {
        console.error("Reaction error", err);
      } finally {
        setPending(null);
        onClose();
      }
    },
    [imageId, visitor, myReaction, pending, onReacted, onClose],
  );

  return (
    <>
      {/* ─────────── MAIN PILL ─────────── */}
      <div className="reaction-picker" onClick={(e) => e.stopPropagation()}>
        <div className="reaction-picker__row">
          {allEmojis.slice(0, 4).map((emoji) => (
            <button
              key={emoji}
              className={`reaction-picker__emoji-btn${myReaction === emoji ? " reaction-picker__emoji-btn--mine" : ""}`}
              onClick={() => void handleReact(emoji)}
              disabled={!!pending}
            >
              <span className="reaction-picker__emoji">{emoji}</span>
            </button>
          ))}

          <button
            type="button"
            className="reaction-picker__more"
            onClick={() => setOpenMore(true)}
            aria-label="More reactions"
          >
            +
          </button>
        </div>
      </div>

      {/* ─────────── OVERLAY ─────────── */}
      {openMore && (
        <div className="reaction-overlay" onClick={() => setOpenMore(false)}>
          <div
            className="reaction-overlay__panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tabs */}
            <div className="reaction-overlay__tabs">
              <button
                type="button"
                className={`reaction-overlay__tab ${
                  activeGroup === ALL_GROUP_KEY ? "is-active" : ""
                }`}
                onClick={() => setActiveGroup(ALL_GROUP_KEY)}
              >
                <span>✨</span>
                <span>All</span>
              </button>
              {groups.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  className={`reaction-overlay__tab ${
                    activeGroup === g.key ? "is-active" : ""
                  }`}
                  onClick={() => setActiveGroup(g.key)}
                >
                  <span>{g.icon}</span>
                  <span>{g.label}</span>
                </button>
              ))}
            </div>

            {/* Emoji grid */}
            <div className="reaction-overlay__grid">
              {activeEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`reaction-overlay__emoji-btn${myReaction === emoji ? " reaction-overlay__emoji-btn--mine" : ""}`}
                  onClick={() => void handleReact(emoji)}
                  disabled={!!pending}
                >
                  <span className="reaction-picker__emoji">{emoji}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
