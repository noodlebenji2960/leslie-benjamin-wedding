interface ManualEntryProps {
  showManualEntry: boolean;
  manualTrack: string;
  manualArtist: string;
  onManualTrackChange: (value: string) => void;
  onManualArtistChange: (value: string) => void;
  onAddManual: () => void;
  onCancel: () => void;
  onToggle: () => void;
  t: (key: string) => string;
}

const ManualEntry: React.FC<ManualEntryProps> = ({
  showManualEntry,
  manualTrack,
  manualArtist,
  onManualTrackChange,
  onManualArtistChange,
  onAddManual,
  onCancel,
  onToggle,
  t,
}) => {
  return (
    <div className="manual-entry-form">
      <input
        type="text"
        value={manualTrack}
        onChange={(e) => onManualTrackChange(e.target.value)}
        placeholder={t("rsvp:musicRequest.manualEntry.songPlaceholder")}
        className="form-input"
        aria-label={t("rsvp:musicRequest.manualEntry.songPlaceholder")}
        onKeyDown={(e) => {
          if (e.key === "Enter") onAddManual();
        }}
      />
      <input
        type="text"
        value={manualArtist}
        onChange={(e) => onManualArtistChange(e.target.value)}
        placeholder={t("rsvp:musicRequest.manualEntry.artistPlaceholder")}
        className="form-input"
        aria-label={t("rsvp:musicRequest.manualEntry.artistPlaceholder")}
        onKeyDown={(e) => {
          if (e.key === "Enter") onAddManual();
        }}
      />
      <div className="manual-entry-actions">
        <button type="button" className="button" onClick={onCancel}>
          {t("rsvp:musicRequest.manualEntry.cancelButton")}
        </button>
        <button
          type="button"
          className="button button--primary"
          onClick={onAddManual}
          disabled={!manualTrack.trim() || !manualArtist.trim()}
        >
          {t("rsvp:musicRequest.manualEntry.addButton")}
        </button>
      </div>
    </div>
  );
};

export default ManualEntry;