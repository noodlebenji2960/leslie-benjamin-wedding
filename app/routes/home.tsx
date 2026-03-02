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
import { ReactComponent as FlowersIllustration } from "../images/flowers.svg";
import { ReactComponent as ChampagneIllustration } from "../images/champagne.svg";
import { ReactComponent as BirdyIllustration } from "../images/birdy.svg";
import { ReactComponent as HeartSpeechBubbleIllustration } from "../images/heartSpeechBubble.svg";
import { ReactComponent as HeartArrow1Illustration } from "../images/heartArrow1.svg";

import { ReactComponent as Plants1Illustration } from "../images/plants.svg";
import { ReactComponent as Plants2Illustration } from "../images/plants2.svg";
import { ReactComponent as Plants3Illustration } from "../images/plants3.svg";
import { ReactComponent as Plants4Illustration } from "../images/plants4.svg";

import { useSiteConfig } from "@/contexts/ConfigContext";
import { Fragment } from "react/jsx-runtime";
import Heart from "@/components/Heart";
import Carousel from "@/components/Carousel";
import ScrollChevron from "@/components/ScrollDown";
import { useState } from "react";
import { Icon } from "@/components/Icon";

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
  const config = useSiteConfig();
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
      {wedding.bride.firstName} <i>&</i> <br /> {wedding.groom.firstName}
    </>
  );

  const imageModules = import.meta.glob(
    "/public/images/carousel/*.{jpg,jpeg,png,webp,avif,svg}",
    { eager: true, as: "url" },
  );
  const photos = Object.values(imageModules) as string[];

  const [showHorizontalLine, setShowHorizontalLine] = useState(false);

  return (
    <div className="home-hero">
      {/* HERO — no fade-in, visible immediately */}
      <div className="hero">
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
        <span>
          <div className="hero-subtitle">
            {t("subtitle", { ns: "home" })} <br />
          </div>
          <div className="hero-body">{t("welcome", { ns: "home" })}</div>
        </span>
        <ScrollChevron />
        <div className="hero-date">
          <span
            className={`horizontal-line ${showHorizontalLine ? "show" : ""}`}
          />
          <span className="date-month">{monthName}</span>|
          <span className="date-daynum">{dayNumber}</span>|
          <span className="date-year">{year}</span>
          <span
            className={`horizontal-line ${showHorizontalLine ? "show" : ""}`}
          />
        </div>
      </div>

      {/* LOCATION & MAP */}
      <FadeInSection
        onInView={() => setShowHorizontalLine(true)}
        onOutView={() => setShowHorizontalLine(false)}
      >
        <div className="venue-card">
          <Link
            to={wedding.wedding.ceremony.venue.website}
            className="hero-location"
          >
            {wedding.wedding.ceremony.venue.longName}
          </Link>

          <Map
            coordinates={wedding.wedding.ceremony.venue.coordinates}
            label={wedding.wedding.ceremony.venue.name}
            mapUrl={wedding.wedding.ceremony.venue.mapLink}
            width="100%"
            height="250px"
            interactive={true}
            zoom={14}
          />
        </div>
      </FadeInSection>
      <div className="wavey-wrapper">
        <img src="/images/wavey.svg" alt="wavey" />
        <div className="inner-wavey-wrapper">
          {/* SCHEDULE HIGHLIGHTS */}
          {config.schedule.enabled && (
            <FadeInSection delay={0.1}>
              <div className="schedule-preview">
                <div className="schedule-header">
                  <h3>
                    {t("scheduleTitle", {
                      ns: "home",
                      defaultValue: "The Day",
                    })}
                  </h3>
                  <p className="schedule-body">
                    <Trans
                      i18nKey="scheduleBody"
                      ns="home"
                      components={{
                        scheduleLink: (
                          <Link
                            to={buildLink("/schedule")}
                            className="faq-link"
                          />
                        ),
                      }}
                    />
                  </p>
                  <Countdown
                    date={wedding.wedding.date}
                    time={wedding.wedding.ceremony.time}
                    size="sm"
                    
                  />
                </div>
                <div className="timeline">
                  <div className="timeline-bg-plants">
                    <Plants1Illustration />
                  </div>
                  <div className="timeline-bg-plants">
                    <Plants2Illustration />
                  </div>
                  {wedding.schedule.map((event, index) => (
                    <div key={`${event.id}-${index}`} className="timeline-item">
                      <div className="timeline-content">
                        {event.icon && (
                          // event.icon is a string like "Add" or "Heart.full"
                          <span className="timeline-icon">
                            {event.icon
                              .split(".") // support nested icons like "Heart.full"
                              .reduce(
                                (acc, key) => acc[key],
                                Icon,
                              )({ size: 24, className: "timeline-icon" })}
                          </span>
                        )}
                        <span className="timeline-time">{event.time}</span>
                        <span className="timeline-label">
                          <Trans
                            i18nKey={`events.${event.id}.label`}
                            ns="schedule"
                            values={{
                              venueName: wedding.wedding.ceremony.venue.name,
                              busReturnLocation:
                                event.id === "busReturn"
                                  ? event?.maps[0]?.extraCoordinates[0]?.label
                                  : "",
                              location: event.location,
                            }}
                          />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeInSection>
          )}
          {/* GUEST ESSENTIALS */}
          <FadeInSection delay={0.1}>
            <div className="guest-essentials">
              <div className="essentials-grid">
                <div className="essential-item">
                  <ShoeIllustration />
                  <span className="essential-item-body">
                    <strong>
                      {t("dressCode", {
                        ns: "home",
                        defaultValue: "Dress Code",
                      })}
                    </strong>
                    <p>
                      {t("dressCodeHint", {
                        ns: "home",
                        defaultValue: "Semi-formal. No jeans, no flip-flops.",
                      })}
                    </p>
                  </span>
                </div>
                <div className="vertical-separator" />
                <div className="essential-item">
                  <HeartBoxIllustration />
                  <span className="essential-item-body">
                    <strong>
                      {t("giftsLabel", { ns: "home", defaultValue: "Gifts" })}
                    </strong>
                    <p>
                      <Trans
                        i18nKey="giftsHint"
                        ns="home"
                        components={{
                          DonateButton: <DonateButton />,
                        }}
                      />
                    </p>
                  </span>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
        <img src="/images/wavey.svg" alt="wavey" />
      </div>
      {/* RSVP & CONTACT */}
      {config.rsvp.enabled && (
        <FadeInSection delay={0.1}>
          <div className="rsvp-section">
            <h2>{rsvpDeadline}</h2>
            <p className="rsvp-intro">
              <Trans i18nKey="rsvpIntro" ns="home" />
            </p>
            <button onClick={handleRSVP} className="cta-btn">
              {t("rsvp", { ns: "home" })}
            </button>
          </div>
        </FadeInSection>
      )}
      {config.ourStory.imageCarousel.enabled && (
        <FadeInSection>
          <div className="our-story-section">
            <h1 className="our-story-header">Our Story</h1>
            <p className="our-story-body">
              Love at first sight is the quiet miracle of a single moment, when
              one glance ignites a feeling too deep for words. Time seems to
              pause, hearts lean closer, and the soul recognizes something it
              has been waiting for all along.
            </p>
            <Carousel photos={photos} />
          </div>
        </FadeInSection>
      )}
      {config.qa.enabled && (
        <FadeInSection delay={0.1}>
          <div className="contact-section">
            <HeartSpeechBubbleIllustration />
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
                  <Fragment key={`${index} ${c.email}`}>
                    <div
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
                  </Fragment>
                );
              })}
            </div>
          </div>
        </FadeInSection>
      )}
      {config.underConstruction?.homeSection.enabled && (
        <FadeInSection delay={0.1}>
          <div className="under-construction">
            <h4>
              {t("underConstruction.title", {
                ns: "home",
                defaultValue: "Under Construction",
              })}
            </h4>
            <p>
              <Trans
                i18nKey="underConstruction.message"
                ns="home"
                values={{
                  featureList: Object.entries(config)
                    .filter(([_, value]) => {
                      // Some features are nested, so normalize to object
                      const feature =
                        typeof value === "object"
                          ? value
                          : { enabled: value, isInFeatureList: false };
                      return (
                        feature.enabled === false &&
                        feature.isInFeatureList === true
                      );
                    })
                    .map(([key]) => {
                      // Map raw config keys to friendly labels
                      const mapping: Record<string, string> = {
                        rsvp: t("rsvp", "RSVP"),
                        schedule: t("title", "schedule"),
                        qa: t("qa", "Q&A"),
                      };
                      return mapping[key] ?? key;
                    })
                    .join(", "),
                }}
              />
            </p>
          </div>
        </FadeInSection>
      )}
    </div>
  );
}
