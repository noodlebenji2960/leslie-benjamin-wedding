// steps/StepReview.tsx
import ReCAPTCHA from "react-google-recaptcha";
import { useLanguage } from "@/contexts/LanguageContext";
import { ReviewCard } from "../Reviewcard";
import type { RSVPFormData } from "@/types/types";
import { useTranslation } from "react-i18next";

interface Props {
  form: RSVPFormData;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
  captchaToken: string | null;
  error: string | null;
  recaptchaRef: React.RefObject<any>;
  setCaptchaToken: (token: string | null) => void;
  isDev: boolean;
}

export const StepReview = ({
  form,
  onChange,
  captchaToken,
  error,
  recaptchaRef,
  setCaptchaToken,
  isDev,
}: Props) => {
  const { locale: lang } = useLanguage();
  const { t } = useTranslation(["rsvp"]);

  return (
    <>
      <ReviewCard form={form} />

      <div className="form-group form-group--consent">
        <label className="consent-label">
          <input
            type="checkbox"
            name="termsAccepted"
            checked={!!form.termsAccepted}
            onChange={onChange}
            className="consent-checkbox"
            tabIndex={0}
          />
          <span className="consent-text">
            {t("rsvp:terms.iAgree")}{" "}
            <a
              href={`/${lang}/legal/terms`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("rsvp:terms.termsLinkText")}
            </a>{" "}
            {t("rsvp:terms.and")}{" "}
            <a
              href={`/${lang}/legal/privacy`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("rsvp:terms.privacyLinkText")}
            </a>
            .
          </span>
        </label>
      </div>

      {!isDev && (
        <ReCAPTCHA
          sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
          onChange={(token) => setCaptchaToken(token)}
          ref={recaptchaRef}
          style={{
            display: "inline-block",
            width: "100%",
            marginTop: "1rem",
          }}
        />
      )}
      {!isDev && !captchaToken && error && (
        <div className="field-error">{t("rsvp:errors.captchaRequired")}</div>
      )}
    </>
  );
};
