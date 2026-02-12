// app/routes/qa.tsx
import { useTranslation, Trans } from "react-i18next";
import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/Icon";
import { useWeddingData } from "@/hooks/useWeddingData";
import "@/styles/qa.scss";
import WeatherForecast from "@/components/WeatherForecast";
import Map from "@/components/Map";
import DonateButton from "@/components/DonateButton";

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
  alwaysShow?: boolean;
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
  const { t, ready } = useTranslation("qa");
  const weddingData = useWeddingData();

  const [activeCategory, setActiveCategory] = useState<Category>("essentials");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!ready)
    return <div className="loading">{t("loading", "Loading...")}</div>;

  const dynamicValues = useMemo(() => {
    const busEvent = weddingData.schedule.find((s) => s.id === "bus");
    const brideContact = weddingData.contact.find((c) =>
      c.name.includes(weddingData.bride.firstName),
    );
    const groomContact = weddingData.contact.find((c) =>
      c.name.includes(weddingData.groom.firstName),
    );

    const busSchedule = weddingData.schedule.find((s: any) => s.id === "bus");

    const mainCoords = busSchedule?.maps[1]?.coordinates || null;
    const extraCoords = busSchedule?.maps[1]?.extraCoordinates || [];
    const busMapUrl = busSchedule?.maps[1]?.mapUrl || "";
    const showRoute = busSchedule?.maps[1]?.showRoute || false;
    const interactive = busSchedule?.maps[1]?.interactive || false;
    const busLabel = busSchedule?.maps[1]?.label || "Bus Route";

    return {
      bus: {
        mainCoords,
        extraCoords: extraCoords.map((c: any) => ({
          lat: c.lat,
          lng: c.lng,
          label: c.label || "",
          showMarker: true,
        })),
        mapUrl: busMapUrl,
        showRoute,
        interactive,
        label: busLabel,
      },
      venueCoordinates: weddingData.wedding.ceremony.venue.coordinates,
      rsvpDeadline: weddingData.rsvp.deadline,
      ceremonyTime: weddingData.wedding.ceremony.time,
      ceremonyVenue: weddingData.wedding.ceremony.venue.longName,
      venueMapLink: weddingData.wedding.ceremony.venue.mapLink,
      venueWebsite: weddingData.wedding.ceremony.venue.website,
      busTime: busEvent?.time || "13:00",
      weddingDate: new Date(weddingData.wedding.date).toLocaleDateString(
        undefined,
        { year: "numeric", month: "long", day: "numeric" },
      ),
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

  const visibleItems = useMemo(() => {
    return allItems.filter((item) =>
      activeCategory === "all" ? true : item.category === activeCategory,
    );
  }, [allItems, activeCategory]);

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
            className={`category-tab ${
              activeCategory === category ? "active" : ""
            }`}
            onClick={() => toggleCategory(category)}
            whileHover={{}}
            whileTap={{}}
          >
            {t(category)}
          </motion.button>
        ))}
      </div>

      <div className="qa-list">
        <AnimatePresence mode="popLayout">
          {visibleItems.map((item) => {
            const originalIndex = allItems.findIndex(
              (i) => i.question === item.question,
            );
            const isOpen = openIndex === originalIndex;

            return (
              <motion.div
                key={item.question}
                className="qa-item"
                layout
                initial={{ opacity: 0}}
                animate={{ opacity: 1}}
                exit={{ opacity: 0}}
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
                                interactive
                                zoom={12}
                              />
                            ),
                            MapBus: (
                              <Map
                                label={dynamicValues.bus.label}
                                coordinates={dynamicValues.bus.mainCoords}
                                extraCoordinates={dynamicValues.bus.extraCoords}
                                mapUrl={dynamicValues.bus.mapUrl}
                                showRoute={dynamicValues.bus.showRoute}
                                interactive={dynamicValues.bus.interactive}
                                width="100%"
                                height="400px"
                              />
                            ),
                            DonateButton: <DonateButton />,
                            WeatherForecast: <WeatherForecast />,
                            SkyscannerLink: (
                              <a
                                href="https://www.skyscanner.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {t("links.skyscanner", "Skyscanner")}
                              </a>
                            ),
                            AirBnbLink: (
                              <a
                                href="https://www.airbnb.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {t("links.airbnb", "AirBnB")}
                              </a>
                            ),
                            AirportsList: (
                              <ul>
                                {dynamicValues.airports.map((a, i) => (
                                  <li key={i}>
                                    <strong>
                                      {a.name} ({a.code})
                                    </strong>{" "}
                                    – {t("distance", { distance: a.distance })},{" "}
                                    {t("transport", {
                                      transport: a.transportOptions.join(", "),
                                    })}
                                  </li>
                                ))}
                              </ul>
                            ),
                            HotelLinks: (
                              <ul>
                                {dynamicValues.hotels.map((h, i) => (
                                  <li key={i}>
                                    <a
                                      href={h.website}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {h.name} – {h.address}
                                    </a>
                                  </li>
                                ))}
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
