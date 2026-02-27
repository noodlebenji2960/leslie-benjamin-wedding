// app/routes/qa.tsx
import { useTranslation, Trans } from "react-i18next";
import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/Icon";
import { useWeddingData } from "@/hooks/useWeddingData";
import WeatherForecast from "@/components/WeatherForecast";
import Map from "@/components/Map";
import DonateButton from "@/components/DonateButton";
import { useSiteConfig } from "@/contexts/ConfigContext";
import RSVP from "./rsvp";
import { Link } from "react-router";
import { useBuildLink } from "@/hooks/useBuildLink";

interface FAQItem {
  question: string;
  answer: string;
  category:
    | "essentials"
    | "logistics"
    | "style"
    | "family"
    | "gifts"
    | "travel";
  id: string;
}

type Category =
  | "all"
  | "essentials"
  | "logistics"
  | "style"
  | "family"
  | "gifts"
  | "travel";

const QA = () => {
  const config = useSiteConfig();
  const { t, ready } = useTranslation("qa");
  const weddingData = useWeddingData();

  const [activeCategory, setActiveCategory] = useState<Category>("essentials");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const { buildLink } = useBuildLink();

  if (!ready)
    return <div className="loading">{t("loading", "Loading...")}</div>;

  // IMPROVED: Separate TO/FROM venue bus handling
  const dynamicValues = useMemo(() => {
    // Find bus schedule events (separate TO/FROM venue)
    const busToVenue = weddingData.schedule.find(
      (s: any) => s.id === "bus-to-venue" || s.type === "bus-to-venue",
    );
    const busFromVenue = weddingData.schedule.find(
      (s: any) => s.id === "bus-from-venue" || s.type === "bus-from-venue",
    );

    // Bus TO venue map data
    const busToVenueSchedule = weddingData.schedule.find(
      (s: any) => s.id === "bus-to-venue" || s.maps?.[0]?.label?.includes("to"),
    );
    const busToVenueMap = busToVenueSchedule?.maps?.[0];

    // Bus FROM venue map data
    const busFromVenueSchedule = weddingData.schedule.find(
      (s: any) =>
        s.id === "bus-from-venue" || s.maps?.[0]?.label?.includes("from"),
    );
    const busFromVenueMap = busFromVenueSchedule?.maps?.[0];

    const brideContact = weddingData.contact.find((c: any) =>
      c.name.includes(weddingData.bride.firstName),
    );
    const groomContact = weddingData.contact.find((c: any) =>
      c.name.includes(weddingData.groom.firstName),
    );

    return {
      // Separate bus objects for TO/FROM venue
      busToVenue: {
        time: busToVenue?.time || "18:00",
        mainCoords: busToVenueMap?.coordinates || null,
        extraCoords: (busToVenueMap?.extraCoordinates || []).map((c: any) => ({
          lat: c.lat,
          lng: c.lng,
          label: c.label || "",
          showMarker: true,
        })),
        mapUrl: busToVenueMap?.mapUrl || "",
        showRoute: busToVenueMap?.showRoute || false,
        label: busToVenueMap?.label || "Bus to Venue",
      },
      busFromVenue: {
        time: busFromVenue?.time || "00:00",
        mainCoords: busFromVenueMap?.coordinates || null,
        extraCoords: (busFromVenueMap?.extraCoordinates || []).map(
          (c: any) => ({
            lat: c.lat,
            lng: c.lng,
            label: c.label || "",
            showMarker: true,
          }),
        ),
        mapUrl: busFromVenueMap?.mapUrl || "",
        showRoute: busFromVenueMap?.showRoute || false,
        label: busFromVenueMap?.label || "Bus from Venue",
      },
      venueCoordinates: weddingData.wedding.ceremony.venue.coordinates,
      rsvpDeadline: weddingData.rsvp.deadline,
      ceremonyTime: weddingData.wedding.ceremony.time,
      ceremonyVenue: weddingData.wedding.ceremony.venue.longName,
      venueMapLink: weddingData.wedding.ceremony.venue.mapLink,
      venueWebsite: weddingData.wedding.ceremony.venue.website,
      weddingDate: {
        full: new Date(weddingData.wedding.date).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        month: new Date(weddingData.wedding.date).toLocaleDateString(
          undefined,
          { month: "long" },
        ),
      },
      brideFirstName: weddingData.bride.firstName,
      bridePhone: brideContact?.phone || "",
      groomFirstName: weddingData.groom.firstName,
      groomPhone: groomContact?.phone || "",
      airports: weddingData.travel?.nearestAirport || [],
      hotels: weddingData.travel?.hotels || [],
    };
  }, [weddingData]);

  const allItems = useMemo(
    () =>
      (t("items", { returnObjects: true, ...dynamicValues }) as FAQItem[]) ||
      [],
    [t, dynamicValues],
  );

  const enabledQAIds = useMemo(() => {
    if (!config.qa?.questions) return [];
    return config.qa.questions
      .filter(([id, enabled]: [string, boolean]) => enabled)
      .map(([id]) => id);
  }, [config.qa?.questions]);

  const visibleItems = useMemo(() => {
    return allItems.filter(
      (item) =>
        enabledQAIds.includes(item.id) &&
        (activeCategory === "all" ? true : item.category === activeCategory),
    );
  }, [allItems, activeCategory, enabledQAIds]);

  const toggleItem = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  const toggleCategory = useCallback((category: Category) => {
    setActiveCategory(category);
    setOpenIndex(null);
  }, []);

  const categories: Category[] = [
    "essentials",
    "logistics",
    "style",
    "family",
    "gifts",
    "travel",
    "all",
  ];

  return (
    <div className="qa-page container">
      <motion.h1
        className="qa-title"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {t("title")}
      </motion.h1>

      <div className="qa-categories">
        {categories.map((category) => (
          <motion.button
            key={category}
            className={`category-tab ${activeCategory === category ? "active" : ""}`}
            onClick={() => toggleCategory(category)}
          >
            {t(category)}
          </motion.button>
        ))}
      </div>

      <div className="qa-list">
        <AnimatePresence mode="popLayout">
          {visibleItems.map((item, displayIndex) => {
            const originalIndex = allItems.findIndex(
              (i) => i.question === item.question,
            );
            const isOpen = openIndex === originalIndex;

            return (
              <motion.div
                key={`${item.id}-${displayIndex}`}
                className="qa-item"
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  className={`qa-question ${isOpen ? "open" : ""}`}
                  onClick={() => toggleItem(originalIndex)}
                >
                  <span>{item.question}</span>
                  <Icon.Down
                    className={`chevron ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      className="qa-answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="answer-content">
                        <Trans
                          i18nKey={`items.${originalIndex}.answer`}
                          t={t}
                          values={dynamicValues}
                          components={{
                            RSVPLink: config.rsvp.enabled ? (
                              <>
                                <br />
                                <br />
                                <Link to={buildLink("/rsvp")}>
                                  {t("links.goToRSVP")}
                                </Link>
                              </>
                            ) : (
                              <>
                              <br/>
                              <br/>
                              {t(`items.${originalIndex}.notEnabled`)}
                              </>
                            ),
                            VenueLink: (
                              <a
                                href={dynamicValues.venueWebsite}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontWeight: "bold",
                                  textDecoration: "none",
                                  color: "inherit",
                                }}
                              >
                                {dynamicValues.ceremonyVenue}
                              </a>
                            ),
                            MapVenue: (
                              <Map
                                coordinates={dynamicValues.venueCoordinates}
                                label={dynamicValues.ceremonyVenue}
                                mapUrl={dynamicValues.venueMapLink}
                                interactive={false}
                                zoom={12}
                              />
                            ),
                            // UPDATED: Use busToVenue for bus question
                            MapBus: (
                              <Map
                                label={dynamicValues.busToVenue.label}
                                coordinates={
                                  dynamicValues.busToVenue.mainCoords
                                }
                                extraCoordinates={
                                  dynamicValues.busToVenue.extraCoords
                                }
                                mapUrl={dynamicValues.busToVenue.mapUrl}
                                showRoute={dynamicValues.busToVenue.showRoute}
                                interactive={false}
                                width="100%"
                                height="400px"
                              />
                            ),
                            DonateButton: <DonateButton />,
                            WeatherForecast: config.weather.enabled ? (
                              <WeatherForecast />
                            ) : null,
                            SkyscannerLink: (
                              <a
                                href="https://www.skyscanner.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {t("links.skyscanner")}
                              </a>
                            ),
                            AirBnbLink: (
                              <a
                                href="https://www.airbnb.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {t("links.airbnb")}
                              </a>
                            ),
                            AirportsList: (
                              <ul>
                                {dynamicValues.airports.map(
                                  (a: any, i: number) => (
                                    <li key={i}>
                                      <strong>
                                        {a.name} ({a.code})
                                      </strong>{" "}
                                      –{" "}
                                      {t("distance", { distance: a.distance })},{" "}
                                      {t("transport", {
                                        transport:
                                          a.transportOptions.join(", "),
                                      })}
                                    </li>
                                  ),
                                )}
                              </ul>
                            ),
                            HotelLinks: (
                              <ul>
                                {dynamicValues.hotels.map(
                                  (h: any, i: number) => (
                                    <li key={i}>
                                      <a
                                        href={h.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        {h.name} – {h.address}
                                      </a>
                                    </li>
                                  ),
                                )}
                              </ul>
                            ),
                            strong: <strong />,
                            p: <p />,
                            br: <br />,
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QA;
