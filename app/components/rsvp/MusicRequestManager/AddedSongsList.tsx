import { Icon } from "@/components/Icon";
import { MAX_SONGS, type MusicRequestItem } from "./MusicRequestManager";

interface AddedSongsListProps {
  songs: MusicRequestItem[];
  playerUrl: string | null;
  onPlayToggle: (song: MusicRequestItem) => void;
  onRemove: (index: number) => void;
  t: (key: string, options?: any) => string;
}

const AddedSongsList: React.FC<AddedSongsListProps> = ({
  songs,
  playerUrl,
  onPlayToggle,
  onRemove,
  t,
}) => {
  return (
    <div className="added-songs-section">
      <div className="added-songs-header">
        <span className="song-count">
          {t("rsvp:musicRequest.addedSongsHeader", {
            count: songs.length,
            max: MAX_SONGS,
          })}
        </span>
      </div>
      <ul className="added-songs-list">
        {songs.map((song) => (
          <li key={song.id} className="added-song-item">
            <div className="song-info">
              <img
                src={song.artworkUrl100}
                alt={`${song.trackName} album art`}
                className="song-artwork-small"
                loading="lazy"
              />
              <div className="song-text">
                <span className="song-name">{song.trackName}</span>
                <span className="artist-name">{song.artistName}</span>
              </div>
            </div>
            <div className="song-actions">
              <button
                onClick={() => onRemove(songs.indexOf(song))}
                className="remove-btn"
                aria-label={t("rsvp:musicRequest.removeAriaLabel", {
                  songName: song.trackName,
                })}
              >
                <Icon.Delete />
              </button>
              {song.previewUrl && (
                <button
                  onClick={() => onPlayToggle(song)}
                  className="play-btn-small"
                  aria-label={
                    playerUrl === song.previewUrl
                      ? t("rsvp:musicRequest.stopAriaLabel", {
                          songName: song.trackName,
                        })
                      : t("rsvp:musicRequest.playAriaLabel", {
                          songName: song.trackName,
                        })
                  }
                >
                  {playerUrl === song.previewUrl ? (
                    <Icon.Stop />
                  ) : (
                    <Icon.Play />
                  )}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AddedSongsList;