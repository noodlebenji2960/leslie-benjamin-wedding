import type { Route } from "./+types/home";
import { Trans, useTranslation } from "react-i18next";
import { useWeddingData } from "@/hooks/useWeddingData";
import { Countdown } from "@/components/Countdown";
import { AnimatePresence, motion } from "framer-motion";
import { useBuildLink } from "@/hooks/useBuildLink";
import Map from "@/components/Map";
import { Link } from "react-router";
import { FadeInSection } from "@/components/FadeInsection";
import DonateButton from "@/components/DonateButton";
import { ReactComponent as ShoeIllustration } from "../images/shoe.svg";
import { ReactComponent as HeartBoxIllustration } from "../images/heartbox.svg";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Leslie & Benjamin - Boda 2026" },
    {
      name: "description",
      content: "¡Leslie y Benjamin se casan! 11 Julio 2026 - Logroño, La Rioja",
    },
  ];
}

export default function Home() {
  const wedding = useWeddingData();
  const { t, i18n, ready } = useTranslation(["home", "common"]);
  const { navigateTo, buildLink } = useBuildLink();

  const weddingDate = new Date(wedding.wedding.date);
  const dayNumber = weddingDate.toLocaleDateString(i18n.language, {
    day: "numeric",
  });
  const monthName = weddingDate.toLocaleDateString(i18n.language, {
    month: "long",
  });
  const year = weddingDate.getFullYear();
  const rsvpDeadline = new Date(wedding.rsvp.deadline).toLocaleDateString(
    i18n.language,
  );

  const handleRSVP = () => {
    navigateTo("/rsvp");
  };

  if (!ready) {
    return (
      <div className="home-hero text-center py-20">
        <div className="loading fade-in-up">
          {t("common:loading", "Cargando...")}
        </div>
      </div>
    );
  }

  const coupleNames = (
    <>
      {wedding.bride.firstName} & <br /> {wedding.groom.firstName}
    </>
  );

  return (
    <div className="home-hero">
      {/* HERO — no fade-in, visible immediately */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <h1>{coupleNames}</h1>
        </motion.div>
      </AnimatePresence>

      <div className="hero-subtitle">
        {t("subtitle", { ns: "home" })} <br />
      </div>
      <div className="hero-body">{t("welcome", { ns: "home" })}</div>

      <div className="hero-date">
        <span className="date-month">{monthName}</span>|
        <span className="date-daynum">{dayNumber}</span>|
        <span className="date-year">{year}</span>
      </div>

      {/* LOCATION & MAP */}
      <FadeInSection>
        <div className="venue-card">
          <p className="hero-location">
            <Link to={wedding.wedding.ceremony.venue.website}>
              <strong>
                 {wedding.wedding.ceremony.venue.longName}
                 </strong>
            </Link>
            <br />
            {wedding.wedding.ceremony.venue.address}
            <br />
            {wedding.wedding.ceremony.venue.city},
            <br />
            {wedding.wedding.ceremony.venue.region},
            <br />
            {wedding.wedding.ceremony.venue.country}
          </p>

          <Map
            coordinates={wedding.wedding.ceremony.venue.coordinates}
            label={wedding.wedding.ceremony.venue.name}
            mapUrl={wedding.wedding.ceremony.venue.mapLink}
            width="100%"
            height="250px"
            interactive={false}
            zoom={14}
          />
        </div>
      </FadeInSection>

      {/* SCHEDULE HIGHLIGHTS */}
      <FadeInSection delay={0.1}>
        <div className="schedule-preview">
          <h3>{t("scheduleTitle", { ns: "home", defaultValue: "The Day" })}</h3>
          <div className="timeline">
            {wedding.schedule.map((event, index) => (
              <div key={`${index} ${event.id}`} className="timeline-item">
                <div className="timeline-dot" />
                <div className="timeline-content">
                  <span className="timeline-time">{event.time}</span>
                  <span className="timeline-label">
                    {(() => {
                      switch (event.id) {
                        case "bus":
                          return `Bus from ${event.location}`;
                        case "ceremony":
                          return `Ceremony @ ${wedding.wedding.ceremony.venue.name}`;
                        case "cocktails":
                          return `Cocktails on the terrace`;
                        case "dinner":
                          return `Dinner @ ${event.location}`;
                        case "bus-return":
                          return `Return bus to Logroño`;
                        case "afterparty":
                          return `Afterparty @ ${event.location}`;
                        default:
                          return event.location;
                      }
                    })()}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="schedule-body">
            <Trans
              i18nKey="scheduleBody"
              ns="home"
              components={{
                scheduleLink: (
                  <Link to={buildLink("/schedule")} className="faq-link" />
                ),
              }}
            />
          </p>
        </div>
      </FadeInSection>

      {/* GUEST ESSENTIALS */}
      <FadeInSection delay={0.1}>
        <div className="guest-essentials">
          <div className="essentials-grid">
            <div className="essential-item">
              <ShoeIllustration height={200} width={200} />
              <strong>
                {t("dressCode", { ns: "home", defaultValue: "Dress Code" })}
              </strong>
              <br />
              {t("dressCodeHint", {
                ns: "home",
                defaultValue: "Semi-formal. No jeans, no flip-flops.",
              })}
            </div>
            <div className="vertical-separator" />
            <div className="essential-item">
              <HeartBoxIllustration height={200} width={200} />
              <strong>
                {t("giftsLabel", { ns: "home", defaultValue: "Gifts" })}
              </strong>
              <br />
              <Trans
                i18nKey="giftsHint"
                ns="home"
                components={{
                  DonateButton: <DonateButton />,
                }}
              />
            </div>
          </div>
        </div>
      </FadeInSection>

      {/* RSVP & CONTACT */}
      <FadeInSection delay={0.1}>
        <div className="rsvp-section">
          <Countdown
            date={wedding.wedding.date}
            time={wedding.wedding.ceremony.time}
          />
          <p className="rsvp-intro">
            <Trans
              i18nKey="rsvpIntro"
              ns="home"
              values={{ deadline: rsvpDeadline }}
              components={{ strong: <strong /> }}
            />
          </p>
          <button onClick={handleRSVP} className="cta-btn">
            {t("rsvp", { ns: "home" })}
          </button>
        </div>
      </FadeInSection>

      <FadeInSection delay={0.1}>
        <div className="contact-section">
          <h4>
            {t("questionsTitle", { ns: "home", defaultValue: "Questions?" })}
          </h4>

          <p className="questions-body">
            <Trans
              i18nKey="questionsBody"
              ns="home"
              components={{
                qaLink: <Link to={buildLink("/qa")} className="faq-link" />,
              }}
            />
          </p>
          <div className="contacts-row">
            {wedding.contact.map((c, index) => {
              const isFirst = index === 0;
              const isLast = index === wedding.contact.length - 1;

              return (
                <>
                  <div
                    key={`${index} ${c.email}`}
                    className={`contact-item ${isFirst ? "first" : ""} ${isLast ? "last" : ""}`}
                  >
                    <strong>{c.name}</strong>
                    <br />
                    <a href={`mailto:${c.email}`}>{c.email}</a>

                    <br />
                    {c.phone && <a href={`tel:${c.phone}`}>{c.phone}</a>}
                  </div>
                  {index !== wedding.contact.length - 1 && (
                    <div className="vertical-separator" />
                  )}
                </>
              );
            })}
          </div>
        </div>
      </FadeInSection>
    </div>
  );
}
