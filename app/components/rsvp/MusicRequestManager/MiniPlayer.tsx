import { useLayout } from "@/contexts/LayoutContext";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";
import type { PlayerState } from "./MusicRequestManager";
import { motion } from "framer-motion";
import type { MusicRequestItem } from "./MusicRequestManager";

interface MiniPlayerProps {
  player: PlayerState;
  onStop: () => void;
  onAdd: (song: MusicRequestItem) => void;
  isAdded: boolean;
  canAddMore: boolean;
  formatTime: (seconds: number) => string;
  progressPercent: number;
  t: (key: string, options?: any) => string;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({
  player,
  onStop,
  onAdd,
  isAdded,
  canAddMore,
  formatTime,
  progressPercent,
  t,
}) => {
  const miniplayerRef = useRef<HTMLDivElement>(null);
  const {
    state: { fixedOffsetY },
    actions: { setFixedOffset, resetFixedOffset },
  } = useLayout();
  if (!player.song) return null;

  useEffect(() => {
    if (player.song) {
      const height = miniplayerRef.current?.getBoundingClientRect().height;
      setFixedOffset(height * -1);
    } else {
      resetFixedOffset();
    }

    return () => {
      resetFixedOffset();
    };
  }, [player, miniplayerRef]);

  return (
    <motion.div
      ref={miniplayerRef}
      key={player.url}
      className="mini-player"
      role="region"
      aria-label={t("rsvp:musicRequest.nowPlayingAriaLabel")}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <motion.img
        key={player.song.artworkUrl100}
        src={player.song.artworkUrl100}
        alt={`${player.song.trackName} album art`}
        className="mini-player__artwork"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        loading="lazy"
      />
      <div className="mini-player__info">
        <motion.span
          key={`track-${player.song.trackName}`}
          className="mini-player__track"
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.15 }}
        >
          {player.song.trackName}
        </motion.span>
        <motion.span
          key={`artist-${player.song.artistName}`}
          className="mini-player__artist"
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.15, delay: 0.03 }}
        >
          {player.song.artistName}
        </motion.span>
        <div
          className="mini-player__progress-bar"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="mini-player__progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
      <span className="mini-player__time">
        {formatTime(player.currentTime)} / {formatTime(player.duration)}
      </span>
      <div className="mini-player__actions">
        <button
          className="mini-player__add"
          onClick={() => onAdd(player.song!)}
          disabled={isAdded || !canAddMore}
          aria-label={
            isAdded
              ? `${player.song.trackName} already added`
              : t("rsvp:musicRequest.addAriaLabel", {
                  songName: player.song.trackName,
                })
          }
        >
          {isAdded ? <Icon.Tick /> : <Icon.Add />}
        </button>
        <button
          className="mini-player__stop"
          onClick={onStop}
          aria-label={t("rsvp:musicRequest.stopAriaLabel", {
            songName: player.song.trackName,
          })}
        >
          <Icon.Stop />
        </button>
      </div>
    </motion.div>
  );
};

export default MiniPlayer;