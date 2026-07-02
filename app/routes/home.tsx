import type { Route } from "./+types/home";
import { Trans, useTranslation } from "react-i18next";
import { useWeddingData } from "@/hooks/useWeddingData";
import { Button } from "@/components/Button";
import { Countdown } from "@/components/Countdown";
import { TodayBanner } from "@/components/TodayBanner";
import { useIsToday, useIsWeddingOver } from "@/hooks/useIsToday";
import { useBuildLink } from "@/hooks/useBuildLink";
import Map from "@/components/Map";
import { Link } from "react-router";
import { FadeInSection } from "@/components/FadeInsection";
import DonateButton from "@/components/DonateButton";
import { PageTitle } from "@/components/PageTitle";
import { ReactComponent as ShoeIllustration } from "../images/shoe.svg";
import { ReactComponent as HeartBoxIllustration } from "../images/heartbox.svg";
import { ReactComponent as HeartSpeechBubbleIllustration } from "../images/heartSpeechBubble.svg";
import { useSiteConfig } from "@/contexts/ConfigContext";
import { Fragment } from "react/jsx-runtime";
import Carousel from "@/components/Carousel";
import { HomeGalleryPreview } from "@/components/gallery/HomeGalleryPreview";
import {
  useGalleryPreviewImages,
  MIN_GALLERY_PREVIEW_PHOTOS,
} from "@/hooks/useGalleryPreviewImages";
import ScrollChevron from "@/components/ScrollDown";
import { useState } from "react";
import { CollapsedTimeline } from "@/components/CollapsedTimeline";

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
  const [isToday, setIsToday] = useIsToday(
    wedding.wedding.date,
    wedding.wedding.ceremony.time,
  );
  const [isPast] = useIsWeddingOver(wedding.wedding.date);
  const galleryImages = useGalleryPreviewImages();
  const showGalleryPreview =
    config.gallery.enabled &&
    !!galleryImages &&
    galleryImages.length >= MIN_GALLERY_PREVIEW_PHOTOS;

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

  const imageModules: Record<string, string> = import.meta.glob(
    "/public/images/carousel/*.{jpg,jpeg,png,webp,avif,svg}",
    { eager: true, query: "?url", import: "default" },
  );

  const photos = Object.values(imageModules) as string[];

  const [showHorizontalLine, setShowHorizontalLine] = useState(false);

  return (
    <div className="home-hero">
      {/* HERO */}
      <div className="hero">
        <PageTitle>{coupleNames}</PageTitle>
        <Countdown
          date={wedding.wedding.date}
          time={wedding.wedding.ceremony.time}
          size="sm"
          onCelebrate={() => setIsToday(true)}
        />
        <span>
          <div className="hero-subtitle">
            {t(isPast ? "subtitlePast" : "subtitle", { ns: "home" })} <br />
          </div>
          <div className="hero-body">
            {t(isPast ? "welcomePast" : "welcome", { ns: "home" })}{" "}
            {isPast && showGalleryPreview && (
              <Trans
                i18nKey="welcomePastGalleryLink"
                ns="home"
                components={{
                  galleryLink: (
                    <Link to={buildLink("/gallery")} className="faq-link" />
                  ),
                }}
              />
            )}
          </div>
        </span>
        {showGalleryPreview && <HomeGalleryPreview images={galleryImages!} />}
        <ScrollChevron />
        <div className="hero-date">
          <span>
            <span className="date-month">{monthName}</span>|
            <span className="date-daynum">{dayNumber}</span>|
            <span className="date-year">{year}</span>
          </span>
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
            dragging={false}
            zoom={14}
          />
        </div>
      </FadeInSection>

      <div className="wavey-wrapper">
        <img src="/images/wavey.svg" alt="wavey" />
        <div className="inner-wavey-wrapper">
          {/* SCHEDULE — collapsed timeline */}
          {config.schedule.enabled && (
            <FadeInSection delay={0.1}>
              <div className="home-schedule-section">
                <TodayBanner show={isToday && !isPast} />
                <h3 className="home-schedule-title">
                  {t("scheduleTitle", { ns: "home", defaultValue: "The Day" })}
                </h3>
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
                <CollapsedTimeline events={wedding.schedule} />
              </div>
            </FadeInSection>
          )}

          {/* GUEST ESSENTIALS */}
          {!isPast && (
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
                          defaultValue: "Formal. No jeans, no flip-flops.",
                        })}
                      </p>
                    </span>
                  </div>
                  <div className="essential-item">
                    <HeartBoxIllustration />
                    <span className="essential-item-body">
                      <strong>
                        {t("giftsLabel", {
                          ns: "home",
                          defaultValue: "Gifts",
                        })}
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
          )}
        </div>
        <img src="/images/wavey.svg" alt="wavey" />
      </div>

      {/* RSVP & CONTACT */}
      {config.rsvp.enabled && (
        <FadeInSection delay={0.1}>
          <div className="rsvp-section">
            {isPast ? (
              <>
                <h2>{t("rsvpClosedTitle", { ns: "home" })}</h2>
                <p className="rsvp-intro">
                  {t("rsvpClosedMessage", { ns: "home" })}
                </p>
              </>
            ) : (
              <>
                <h2>{rsvpDeadline}</h2>
                <p className="rsvp-intro">
                  <Trans i18nKey="rsvpIntro" ns="home" />
                </p>
                <Button size="lg" onClick={handleRSVP}>
                  {t("rsvp", { ns: "home" })}
                </Button>
              </>
            )}
          </div>
        </FadeInSection>
      )}

      {config.ourStory.imageCarousel.enabled && (
        <FadeInSection>
          <div className="our-story-section">
            <h1 className="our-story-header">
              {t("ourStoryTitle", { ns: "home" })}
            </h1>
            <p className="our-story-body">
              {t("ourStoryBody", { ns: "home" })}
            </p>
            <Carousel photos={photos} />
          </div>
        </FadeInSection>
      )}

      {config.qa.enabled && (
        <FadeInSection delay={0.1}>
          <div className="contact-section">
            <HeartSpeechBubbleIllustration />
            {!isPast && (
              <>
                <h4>
                  {t("questionsTitle", {
                    ns: "home",
                    defaultValue: "Questions?",
                  })}
                </h4>
                <p className="questions-body">
                  <Trans
                    i18nKey="questionsBody"
                    ns="home"
                    components={{
                      qaLink: (
                        <Link to={buildLink("/qa")} className="faq-link" />
                      ),
                    }}
                  />
                </p>
              </>
            )}
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

      {isPast && (
        <FadeInSection delay={0.1}>
          <div className="guest-essentials guest-essentials--gifts-only">
            <div className="essentials-grid">
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
      )}

      {config.underConstruction?.homeSection.enabled && !isPast && (
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
                      const mapping: Record<string, string> = {
                        rsvp: t("featureLabels.rsvp", { ns: "home" }),
                        schedule: t("featureLabels.schedule", { ns: "home" }),
                        qa: t("featureLabels.qa", { ns: "home" }),
                        gallery: t("featureLabels.gallery", { ns: "home" }),
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
