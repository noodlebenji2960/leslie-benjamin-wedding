// app/routes/qa.tsx
import { useTranslation, Trans } from "react-i18next";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/Icon";
import { TabNav } from "@/components/TabNav";
import { PageTitle } from "@/components/PageTitle";
import { useWeddingData } from "@/hooks/useWeddingData";
import { useIsWeddingOver } from "@/hooks/useIsToday";
import WeatherForecast from "@/components/WeatherForecast";
import Map from "@/components/Map";
import DonateButton from "@/components/DonateButton";
import { useSiteConfig } from "@/contexts/ConfigContext";
import { Link, useSearchParams } from "react-router";
import { useBuildLink } from "@/hooks/useBuildLink";
import type { Route } from "./+types/qa";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Q&A - Leslie & Benjamin" },
    {
      name: "description",
      content: "Frequently asked questions about Leslie & Benjamin's wedding.",
    },
  ];
}

type Category =
  | "all"
  | "essentials"
  | "weather"
  | "style"
  | "family"
  | "gifts"
  | "travel";

interface FAQItem {
  question: string;
  answer: string;
  category: Exclude<Category, "all">;
  id: string;
}

interface CategoryConfig {
  name: Category;
  icon: React.ReactNode;
}

const VALID_CATEGORIES: Category[] = [
  "all",
  "essentials",
  "weather",
  "style",
  "family",
  "gifts",
  "travel",
];

const QA = () => {
  const config = useSiteConfig();
  const { t, ready } = useTranslation("qa");
  const weddingData = useWeddingData();

  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const questionParam = searchParams.get("q");

  const [activeCategory, setActiveCategory] = useState<Category>(
    VALID_CATEGORIES.includes(categoryParam as Category)
      ? (categoryParam as Category)
      : "essentials",
  );
  const [openId, setOpenId] = useState<string | null>(questionParam);

  const { buildLink } = useBuildLink();
  const [isPast] = useIsWeddingOver(weddingData.wedding.date);

  if (!ready)
    return <div className="loading">{t("loading", "Loading...")}</div>;

  if (isPast) {
    return (
      <div className="qa-page">
        <PageTitle className="qa-title">{t("closedTitle")}</PageTitle>
        <p className="qa-closed-message">{t("closedMessage")}</p>
      </div>
    );
  }

  // Separate TO/FROM venue bus handling — schedule IDs are "bus" (outbound),
  // "busReturn" (earlier return) and "busReturnLate" (later return).
  const dynamicValues = useMemo(() => {
    const busToVenue = weddingData.schedule.find((s: any) => s.id === "bus");
    const busFromVenue = weddingData.schedule.find(
      (s: any) => s.id === "busReturn",
    );
    const busFromVenueLate = weddingData.schedule.find(
      (s: any) => s.id === "busReturnLate",
    );

    const busToVenueMap = busToVenue?.maps?.[0];
    const busFromVenueMap = busFromVenue?.maps?.[0];

    const brideContact = weddingData.contact.find((c: any) =>
      c.name.includes(weddingData.bride.firstName),
    );
    const groomContact = weddingData.contact.find((c: any) =>
      c.name.includes(weddingData.groom.firstName),
    );

    return {
      // Separate bus objects for TO/FROM venue
      busToVenue: {
        time: busToVenue?.time,
        mainCoords: busToVenueMap?.coordinates || null,
        extraCoords: (busToVenueMap?.extraCoordinates || []).map((c: any) => ({
          lat: c.lat,
          lng: c.lng,
          label: c.label || "",
          showMarker: true,
        })),
        mapUrl: busToVenueMap?.mapUrl || "",
        showRoute: busToVenueMap?.showRoute || false,
        label: busToVenueMap?.label || t("busToVenueMapLabel"),
      },
      busFromVenue: {
        time: busFromVenue?.time,
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
        label: busFromVenueMap?.label || t("busFromVenueMapLabel"),
      },
      busFromVenueLateTime: busFromVenueLate?.time,
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
        season: t(
          `season.${{ 0: "winter", 1: "winter", 2: "spring", 3: "spring", 4: "spring", 5: "summer", 6: "summer", 7: "summer", 8: "fall", 9: "fall", 10: "fall", 11: "winter" }[new Date(weddingData.wedding.date).getMonth()]}`,
        ),
      },
      brideFirstName: weddingData.bride.firstName,
      bridePhone: brideContact?.phone || "",
      groomFirstName: weddingData.groom.firstName,
      groomPhone: groomContact?.phone || "",
      airports: weddingData.travel?.nearestAirport || [],
      hotels: weddingData.travel?.hotels || [],
    };
  }, [weddingData, t]);

  const allItems = useMemo(
    () =>
      (t("items", { returnObjects: true, ...dynamicValues }) as FAQItem[]) ||
      [],
    [t, dynamicValues],
  );

  // Deep-link support: if ?q=<id> points to a question outside the active
  // category, switch to that question's own category so the link works
  // without also requiring a matching ?category= param.
  const reconciledRef = useRef(false);
  useEffect(() => {
    if (reconciledRef.current || !questionParam || !allItems.length) return;
    const target = allItems.find((i) => i.id === questionParam);
    if (target && target.category !== activeCategory) {
      setActiveCategory(target.category);
    }
    reconciledRef.current = true;
  }, [questionParam, allItems, activeCategory]);

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

  const toggleItem = useCallback(
    (id: string) => {
      setOpenId((prev) => {
        const next = prev === id ? null : id;
        setSearchParams(
          (params) => {
            if (next) {
              params.set("q", next);
            } else {
              params.delete("q");
            }
            return params;
          },
          { replace: true },
        );
        return next;
      });
    },
    [setSearchParams],
  );

  const toggleCategory = useCallback(
    (category: Category) => {
      setActiveCategory(category);
      setOpenId(null);
      setSearchParams(
        (params) => {
          if (category === "essentials") {
            params.delete("category");
          } else {
            params.set("category", category);
          }
          params.delete("q");
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

const allCategories: CategoryConfig[] = [
  { name: "essentials", icon: <Icon.Checklist /> },
  { name: "weather", icon: <Icon.Sun /> },
  { name: "style", icon: <Icon.Tie /> },
  { name: "family", icon: <Icon.Family /> },
  { name: "gifts", icon: <Icon.Gift /> },
  { name: "travel", icon: <Icon.Plane /> },
  { name: "all", icon: <Icon.All /> },
];

  const categories = useMemo(
    () =>
      config.weather.enabled
        ? allCategories
        : allCategories.filter((c) => c.name !== "weather"),
    [config.weather.enabled],
  );

  return (
    <div className="qa-page">
      <PageTitle className="qa-title">{t("title")}</PageTitle>

      <TabNav
        className="qa-categories"
        itemClassName="category-tab"
        items={categories.map((category) => ({
          id: category.name,
          active: activeCategory === category.name,
          onClick: () => toggleCategory(category.name),
          content: (
            <>
              {category.icon && (
                <>
                  {category.icon}
                  <br />
                </>
              )}
              {t(category.name)}
            </>
          ),
        }))}
      />

      {activeCategory === "weather" ? (
        <div className="qa-weather">
          <WeatherForecast variant="full" />
        </div>
      ) : (
      <div className="qa-list">
        <AnimatePresence mode="popLayout">
          {visibleItems.map((item, displayIndex) => {
            const originalIndex = allItems.findIndex(
              (i) => i.question === item.question,
            );
            const isOpen = openId === item.id;

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
                  onClick={() => toggleItem(item.id)}
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
                                <br />
                                <br />
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
                                        transport: a.transportOptions
                                          .map((opt: string) =>
                                            t(`transport_options.${opt}`),
                                          )
                                          .join(", "),
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
      )}
    </div>
  );
};

export default QA;
