// app/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import JSON translations
import common_en from "./locales/en/common.json";
import common_es from "./locales/es/common.json";
import home_en from "./locales/en/home.json";
import home_es from "./locales/es/home.json";
import qa_en from "./locales/en/qa.json";
import qa_es from "./locales/es/qa.json";
import schedule_en from "./locales/en/schedule.json";
import schedule_es from "./locales/es/schedule.json";
import rsvp_en from "./locales/en/rsvp.json";
import rsvp_es from "./locales/es/rsvp.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "es",
    supportedLngs: ["en", "es"],
    ns: ["common", "home", "qa", "schedule", "rsvp"], // added "rsvp"
    defaultNS: "common",
    resources: {
      en: {
        common: common_en,
        home: home_en,
        qa: qa_en,
        schedule: schedule_en,
        rsvp: rsvp_en,
      },
      es: {
        common: common_es,
        home: home_es,
        qa: qa_es,
        schedule: schedule_es,
        rsvp: rsvp_es,
      },
    },
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "preferred-language",
    },
  });

export default i18n;
