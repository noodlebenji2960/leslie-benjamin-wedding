// steps/ReviewCard.tsx
import type { RSVPFormData } from "@/types/types";
import type { MusicRequestItem } from "../MusicRequestManager/MusicRequestManager";
import { useTranslation } from "react-i18next";

interface Props {
  form: RSVPFormData;
}

export const ReviewCard = ({ form }: Props) => {
  const { t } = useTranslation(["rsvp"]);

  return (
    <div className="review-card">
      <div className="review-card__inner">
        <div className="review-card__field">
          <span className="review-card__field-label">{t("rsvp:email")}</span>
          <span className="review-card__field-value">{form.email}</span>
        </div>

        {form.attending === "yes" && form.guests.length > 0 && (
          <div className="review-card__field">
            <span className="review-card__field-label">
              {t("rsvp:review.numberAttending")} ({form.guests.length})
            </span>
            <ul className="review-card__guests">
              {form.guests.map((guest, i) => (
                <li key={i} className="review-card__field-value">
                  {guest.firstName} {guest.lastName}
                  {guest.dietary && (
                    <span className="review-card__dietary">
                      {" "}
                      ({guest.dietary})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {form.attending === "no" && (
          <div className="review-card__field">
            <span className="review-card__field-label">{t("rsvp:name")}</span>
            <span className="review-card__field-value">
              {form.nonAttendingName}
            </span>
          </div>
        )}

        {form.notes && (
          <div className="review-card__field">
            <span className="review-card__field-label">
              {t("rsvp:messageToBrideGroom")}
            </span>
            <p className="review-card__note review-card__field-value">
              "{form.notes}"
            </p>
          </div>
        )}

        {form.attending === "yes" &&
          form.musicRequest &&
          (form.musicRequest as MusicRequestItem[]).length > 0 && (
            <div className="review-card__field">
              <span className="review-card__field-label">
                {t("rsvp:musicRequest")}
              </span>
              <ul className="review-card__songs">
                {(form.musicRequest as MusicRequestItem[]).map((song, i) => (
                  <li key={i} className="review-card__song">
                    <img
                      src={song.artworkUrl100}
                      alt={song.trackName}
                      className="review-card__song-art"
                    />
                    <span className="review-card__field-value">
                      {song.trackName} — {song.artistName}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
      </div>
    </div>
  );
};
