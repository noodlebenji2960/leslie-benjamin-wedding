import { useTranslation, Trans } from "react-i18next";
import { useWeddingData } from "@/hooks/useWeddingData";
import Map from "@/components/Map";
import { Icon } from "@/components/Icon";
import { FadeInSection } from "@/components/FadeInsection";
import { useRef, useCallback, useEffect } from "react";
import ScrollChevron from "@/components/ScrollDown";

const Schedule = () => {
  const { t } = useTranslation(["schedule", "common"]);
  const wedding = useWeddingData();
  const events = wedding.schedule || [];

  const timelineRef = useRef<HTMLDivElement>(null); // points at schedule-timeline-wrapper
  const dotRef = useRef<HTMLDivElement>(null);
  const dotLabelRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const nodeStateRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastClientY = useRef<number>(0);

  // Convert "HH:MM" to total minutes, treating post-midnight as next day
  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return (h < 6 ? h + 24 : h) * 60 + m;
  };

  const minutesToTime = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = Math.floor(mins % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const updateDot = useCallback(
    (clientY: number) => {
      const timeline = timelineRef.current;
      const dot = dotRef.current;
      const label = dotLabelRef.current;
      if (!timeline || !dot) return;

      const { top, height } = timeline.getBoundingClientRect();
      const y = Math.min(Math.max(clientY - top, 0), height);
      dot.style.setProperty("--dot-y", `${y}px`);

      if (!label || events.length < 2) return;

      // Get the Y centre of each node relative to the timeline
      const nodePositions = nodeRefs.current
        .map((el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return r.top + r.height / 2 - top;
        })
        .filter((v): v is number => v !== null);

      if (nodePositions.length < 2) return;

      // Pin the timeline line to first and last node centres
      timeline.style.setProperty("--timeline-start", `${nodePositions[0]}px`);
      timeline.style.setProperty(
        "--timeline-end",
        `${nodePositions[nodePositions.length - 1]}px`,
      );

      const times = events.map((e) => timeToMinutes(e.time));

      const firstY = nodePositions[0];
      const lastY = nodePositions[nodePositions.length - 1];

      // Split the line at the cursor, clamped to the node range
      const splitY = Math.min(Math.max(y, firstY), lastY);
      timeline.style.setProperty("--split-y", `${splitY - 18}px`);

      // Update past/active/upcoming states on node inner elements only —
      // keeping state classes isolated from FadeInSection cards.
      // A node is "active" while the cursor is within its card's bounds,
      // "past" once the cursor has passed the card bottom, and "upcoming" before.
      const updateRowStates = (activeY: number) => {
        nodeStateRefs.current.forEach((node, i) => {
          if (!node) return;
          node.classList.remove(
            "schedule-event--past",
            "schedule-event--active",
            "schedule-event--upcoming",
          );
          const card = cardRefs.current[i];
          if (card) {
            const r = card.getBoundingClientRect();
            const cardTop = r.top - top;
            const cardBottom = r.bottom - top;
            if (activeY > cardBottom) {
              node.classList.add("schedule-event--past");
            } else if (activeY >= cardTop) {
              node.classList.add("schedule-event--active");
            } else {
              node.classList.add("schedule-event--upcoming");
            }
          } else {
            const nodeY = nodePositions[i];
            if (nodeY < activeY) {
              node.classList.add("schedule-event--past");
            } else {
              node.classList.add("schedule-event--upcoming");
            }
          }
        });
      };

      updateRowStates(y);

      // Hide dot + label outside the node range
      if (y < firstY || y > lastY) {
        dot.style.opacity = "0";
        label.style.opacity = "0";
        return;
      }

      dot.style.opacity = "1";
      label.style.opacity = "1";

      // Find which segment the dot sits in and interpolate
      let interpolated = times[0];
      for (let i = 0; i < nodePositions.length - 1; i++) {
        const y0 = nodePositions[i];
        const y1 = nodePositions[i + 1];
        if (y >= y0 && y <= y1) {
          const t = (y - y0) / (y1 - y0);
          interpolated = times[i] + t * (times[i + 1] - times[i]);
          break;
        }
      }


      label.textContent = minutesToTime(interpolated);
    },
    [events],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      lastClientY.current = e.clientY;
      updateDot(e.clientY);
    },
    [updateDot],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const y = e.touches[0].clientY;
      lastClientY.current = y;
      updateDot(y);
    },
    [updateDot],
  );

  const handleMouseLeave = useCallback(() => {
    if (dotRef.current) dotRef.current.style.opacity = "0";
    if (dotLabelRef.current) dotLabelRef.current.style.opacity = "0";
    timelineRef.current?.style.removeProperty("--split-y");
    nodeStateRefs.current.forEach((node) => {
      if (!node) return;
      node.classList.remove(
        "schedule-event--past",
        "schedule-event--active",
        "schedule-event--upcoming",
      );
    });
  }, []);

  // On touch/no-cursor devices, use viewport centre as the reference Y.
  // On desktop, use the last known cursor position.
  const referenceY = useCallback(
    () =>
      window.matchMedia("(hover: none) and (pointer: coarse)").matches
        ? window.innerHeight / 2
        : lastClientY.current,
    [],
  );

  // Initialize CSS vars on mount so the full future line renders before mouse interaction
  useEffect(() => {
    updateDot(referenceY());
  }, [updateDot, referenceY]);

  useEffect(() => {
    const onScroll = () => updateDot(referenceY());
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [updateDot, referenceY]);

  return (
    <div className="schedule-page">
      {/* Page Header */}
      <div className="schedule-hero">
        <p className="schedule-eyebrow">
          {t("schedule:eyebrow", "Saturday · July 11, 2026")}
        </p>
        <h1 className="schedule-title">{t("schedule:title", "The Day")}</h1>
        <p className="schedule-subtitle">
          {t(
            "schedule:subtitle",
            "Everything you need to know about our wedding day, from start to finish.",
          )}
        </p>
        <ScrollChevron />
      </div>

      {/* Timeline */}
      <div
        className="schedule-timeline-wrapper"
        ref={timelineRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
      >
        {/* Vertical line — two segments split at cursor position */}
        <div className="schedule-nodes-line-past" />
        <div className="schedule-nodes-line-future" />

        {/* Tracking dot */}
        <div
          ref={dotRef}
          className="schedule-timeline-dot"
          style={{ "--dot-y": "0px", opacity: 0 } as React.CSSProperties}
        >
          <div
            ref={dotLabelRef}
            className="schedule-timeline-dot-label"
            style={{ opacity: 0 }}
          />
        </div>

        {/* Unified timeline rows — node and card are siblings in the same grid row */}
        <div className="schedule-timeline">
          {events.map((event, index) => {
            const isEven = index % 2 === 0;
            const hasMaps = event.maps && event.maps.length > 0;

            return (
              <div key={event.id} className="schedule-event-row">
                {/* Node — center column */}
                <div
                  className="schedule-event-node-inner"
                  ref={(el) => {
                    nodeRefs.current[index] = el;
                    nodeStateRefs.current[index] = el;
                  }}
                >
                  {event.icon && (
                    <span className="schedule-event-icon">
                      {event.icon
                        .split(".")
                        .reduce((acc: any, key: string) => acc[key], Icon)({
                        size: 42,
                      })}
                    </span>
                  )}
                  <div className="schedule-event-time">{event.time}</div>
                </div>

                {/* Opposite-side slot — any content keyed by event id */}
                {event.images && event.images.length>0 && (
                  <FadeInSection
                    delay={index * 0.08 + 0.05}
                    className={`schedule-event-opposite ${isEven ? "schedule-event-opposite--right" : "schedule-event-opposite--left"}`}
                  >
                    {event.images.map((image, i) => (
                      <div
                        className="schedule-event-opposite-img"
                        key={`${event.id}-${i}`}
                      >
                        <img src={image} alt={event.id} />
                      </div>
                    ))}
                  </FadeInSection>
                )}

                {/* Card — left or right column */}
                <FadeInSection
                  delay={index * 0.08}
                  className={`schedule-event-card ${isEven ? "schedule-event-card--left" : "schedule-event-card--right"}`}
                >
                  <div
                    className="schedule-event-card-inner"
                    ref={(el) => {
                      cardRefs.current[index] = el;
                    }}
                  >
                    <div className="schedule-event-header">
                      <h2 className="schedule-event-title">
                        {t(`schedule:events.${event.id}.title`, event.id)}
                      </h2>
                      {event.location && (
                        <span className="schedule-event-location">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            style={{ marginRight: "4px", flexShrink: 0 }}
                          >
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                          </svg>
                          {event.location}
                        </span>
                      )}
                    </div>

                    <p className="schedule-event-desc">
                      <Trans
                        i18nKey={`schedule:events.${event.id}.description`}
                        defaults=""
                      />
                    </p>

                    {hasMaps && (
                      <div className="schedule-maps">
                        {event.maps?.map((mapConfig, mapIndex) => (
                          <div key={mapIndex} className="schedule-map-wrap">
                            <Map
                              label={(mapConfig as any).label}
                              coordinates={(mapConfig as any).coordinates}
                              extraCoordinates={
                                (mapConfig as any).extraCoordinates
                              }
                              mapUrl={(mapConfig as any).mapUrl}
                              showRoute={(mapConfig as any).showRoute}
                              interactive={(mapConfig as any).interactive}
                              width="100%"
                              height="220px"
                              zoom={(mapConfig as any).zoom ?? 14}
                            />
                            {(mapConfig as any).mapUrl && (
                              <a
                                href={(mapConfig as any).mapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="schedule-map-directions"
                              >
                                {t("common:getDirections", "Get directions")} →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </FadeInSection>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer note */}
      <FadeInSection delay={0.1}>
        <div className="schedule-footer-note">
          <p>
            <Trans
              i18nKey="schedule:footerNote"
              defaults="Times are approximate. We'll send final details closer to the date."
            />
          </p>
        </div>
      </FadeInSection>
    </div>
  );
};

export default Schedule;
