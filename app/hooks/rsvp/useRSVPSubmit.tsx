import { useEffect, useState } from "react";
import emailjs from "@emailjs/browser";
import type { RSVPFormData } from "@/types/types";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import type { MusicRequestItem } from "@/components/rsvp/MusicRequestManager/MusicRequestManager";

const EMAILJS_KEY = import.meta.env.VITE_EMAILJS_KEY;
const EMAILJS_SERVICE = "service_vvuhisc";
const TEMPLATE_NOTIFICATION = "template_4m25aki";
const TEMPLATE_AUTOREPLY_EN = import.meta.env.VITE_EMAILJS_AUTOREPLY_EN;
const TEMPLATE_AUTOREPLY_ES = import.meta.env.VITE_EMAILJS_AUTOREPLY_ES;

// ─────────────────────────────────────────────
// ENV CHECK — log missing EmailJS env variables
// ─────────────────────────────────────────────
const REQUIRED_ENV_VARS = {
  VITE_EMAILJS_KEY: import.meta.env.VITE_EMAILJS_KEY,
  VITE_EMAILJS_AUTOREPLY_EN: import.meta.env.VITE_EMAILJS_AUTOREPLY_EN,
  VITE_EMAILJS_AUTOREPLY_ES: import.meta.env.VITE_EMAILJS_AUTOREPLY_ES,
};


const isDev = import.meta.env.DEV;

// Initialize EmailJS once
emailjs.init(EMAILJS_KEY);

export function useRSVPSubmit(
  form: RSVPFormData,
  captchaToken: string | null,
  currentStep: number = 0,
) {
  const analytics = useAnalytics();
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    console.log("Submitting RSVP...", { form, captchaToken });

    // --- Validation ---
    if (!form.termsAccepted) {
      const errorMsg =
        "Please accept the Terms & Conditions and Privacy Policy.";
      setError(errorMsg);
      analytics.event("rsvp_submit_error", {
        event_label: "validation_error",
        error_message: errorMsg,
        error_type: "validation_error",
        current_step: currentStep,
        attending_status: form.attending,
        has_captcha_token: !!captchaToken,
      });
      return;
    }

    if (!isDev && !captchaToken) {
      const errorMsg = "Please complete reCAPTCHA.";
      setError(errorMsg);
      analytics.event("rsvp_submit_error", {
        event_label: "validation_error",
        error_message: errorMsg,
        error_type: "validation_error",
        current_step: currentStep,
        attending_status: form.attending,
        has_captcha_token: false,
      });
      return;
    }

    if (!form.email) {
      const errorMsg = "Email is required.";
      setError(errorMsg);
      analytics.event("rsvp_submit_error", {
        event_label: "validation_error",
        error_message: errorMsg,
        error_type: "validation_error",
        current_step: currentStep,
        attending_status: form.attending,
        has_captcha_token: !!captchaToken,
      });
      return;
    }

    if (!form.attending) {
      const errorMsg = "Please indicate if you're attending.";
      setError(errorMsg);
      analytics.event("rsvp_submit_error", {
        event_label: "validation_error",
        error_message: errorMsg,
        error_type: "validation_error",
        current_step: currentStep,
        has_captcha_token: !!captchaToken,
      });
      return;
    }

    if (form.attending === "yes" && form.guests.length === 0) {
      const errorMsg = "Please add at least one guest.";
      setError(errorMsg);
      analytics.event("rsvp_submit_error", {
        event_label: "validation_error",
        error_message: errorMsg,
        error_type: "validation_error",
        current_step: currentStep,
        attending_status: form.attending,
        has_captcha_token: !!captchaToken,
      });
      return;
    }

    if (form.attending === "no" && !form.nonAttendingName) {
      const errorMsg = "Please provide your name.";
      setError(errorMsg);
      analytics.event("rsvp_submit_error", {
        event_label: "validation_error",
        error_message: errorMsg,
        error_type: "validation_error",
        current_step: currentStep,
        attending_status: form.attending,
        has_captcha_token: !!captchaToken,
      });
      return;
    }

    setSending(true);
    setError(null);

    try {
      // --- Prepare email content ---
      const guestsText =
        form.attending === "yes"
          ? form.guests
              .map(
                (g, i) =>
                  `${i + 1}. ${g.firstName} ${g.lastName}` +
                  (g.dietary ? ` - Dietary: ${g.dietary}` : "") +
                  (g.note ? ` - Note: ${g.note}` : ""),
              )
              .join("\n")
          : `Not attending: ${form.nonAttendingName}`;

      const musicRequestText = (() => {
        if (!form.musicRequest) return "None";
        const items = form.musicRequest as MusicRequestItem[];
        if (!Array.isArray(items) || items.length === 0) return "None";
        return items
          .map((song, i) => `${i + 1}. ${song.trackName} — ${song.artistName}`)
          .join("\n");
      })();

      const templateParams = {
        email: form.email,
        attending: form.attending,
        guestsCount: form.attending === "yes" ? form.guests.length : 1,
        guests: guestsText,
        notes: form.notes || "None",
        musicRequest: musicRequestText,
        termsAccepted: form.termsAccepted
          ? "Yes — Terms & Conditions and Privacy Policy accepted"
          : "No",
        recaptchaToken: captchaToken,
      };

      console.log("Sending email with params:", templateParams);

      // --- 1. Send notification to couple ---
      const response = await emailjs.send(
        EMAILJS_SERVICE,
        TEMPLATE_NOTIFICATION,
        templateParams,
      );
      console.log("Notification sent:", response);

      // --- 2. Send auto-reply to guest ---
      const locale = document.documentElement.lang ?? "es";
      const autoReplyTemplate =
        locale === "en" ? TEMPLATE_AUTOREPLY_EN : TEMPLATE_AUTOREPLY_ES;

      const autoReplyResponse = await emailjs.send(
        EMAILJS_SERVICE,
        autoReplyTemplate,
        templateParams,
      );
      console.log("Auto-reply sent:", autoReplyResponse);

      // --- Analytics tracking ---
      analytics.event("rsvp_submit_success", {
        event_label: `RSVP ${form.attending === "yes" ? "Accepted" : "Declined"}`,
        attending: form.attending,
        guest_count: form.attending === "yes" ? form.guests.length : 1,
        dietary_requirements: form.guests[0]?.dietary || "none",
        music_request: musicRequestText,
        terms_accepted: true,
        locale: document.documentElement.lang,
      });

      analytics.event("conversion", {
        event_label: "RSVP Completed",
        send_to: "AW-CONVERSION-ID",
      });

      analytics.event("rsvp_confirmation_view", {
        event_label: "Viewed confirmation page",
      });

      analytics.event("page_view", {
        page_title: "RSVP Confirmation",
        page_location: window.location.href,
        page_path: "/rsvp/confirmation",
      });

      setSubmitted(true);
    } catch (err: any) {
      console.error("Submission error:", err);

      const errorMessage =
        err?.text || err?.message || "Failed to submit RSVP. Please try again.";
      const errorType = err?.text ? "emailjs_error" : "network_error";

      setError(errorMessage);

      analytics.event("rsvp_submit_error", {
        event_label: errorType,
        error_message: errorMessage,
        error_type: errorType,
        current_step: currentStep,
        attending_status: form.attending,
        has_captcha_token: !!captchaToken,
      });

      analytics.event("exception", {
        description: `RSVP Error: ${errorType} - ${errorMessage}`,
        fatal: false,
      });
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (error) {
      console.error("RSVP Error:", error);
    }
  }, [error]);

  return { submit, sending, submitted, error, setError, setSubmitted };
}
