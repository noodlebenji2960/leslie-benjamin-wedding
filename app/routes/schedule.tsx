import { useTranslation, Trans } from "react-i18next";
import { useWeddingData } from "@/hooks/useWeddingData";
import Map from "@/components/Map";
import { Icon } from "@/components/Icon";
import { FadeInSection } from "@/components/FadeInsection";
import { PageTitle } from "@/components/PageTitle";
import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFixedSlot } from "@/contexts/LayoutContext";
import { useLenis } from "lenis/react";
import ScrollChevron from "@/components/ScrollDown";
import type { Route } from "./+types/schedule";
import { Countdown } from "@/components/Countdown";
import { TodayBanner } from "@/components/TodayBanner";
import { useIsToday, useIsWeddingOver } from "@/hooks/useIsToday";
import { CollapsedTimeline } from "@/components/CollapsedTimeline";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "The Day - Leslie & Benjamin" },
    {
      name: "description",
      content: "Schedule for Leslie & Benjamin's wedding day.",
    },
  ];
}

const Schedule = () => {
  const { t, i18n } = useTranslation(["schedule", "common"]);
  const wedding = useWeddingData();
  const events = wedding.schedule || [];
  const [isToday, setIsToday] = useIsToday(
    wedding.wedding.date,
    wedding.wedding.ceremony.time,
  );
  const [isPast] = useIsWeddingOver(wedding.wedding.date);

  const weddingDate = new Date(wedding.wedding.date);
  const weekday = weddingDate.toLocaleDateString(i18n.language, { weekday: "long" });
  const fullDate = weddingDate.toLocaleDateString(i18n.language, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const eyebrowDate = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} · ${fullDate}`;

  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const allCollapsed = events.length > 0 && openIds.size === 0;
  const isHorizontal = allCollapsed;
  const lenis = useLenis();

  const toggleAll = useCallback((scrollToTop = true) => {
    setOpenIds(allCollapsed ? new Set(events.map((e) => e.id)) : new Set());
    if (scrollToTop) lenis?.scrollTo(0, { duration: 1 });
  }, [allCollapsed, events, lenis]);

  const collapseSlot = useMemo(
    () => (
      <button className="schedule-collapse-btn" onClick={() => toggleAll()}>
        {allCollapsed
          ? t("schedule:expandAll", "Expand all")
          : t("schedule:collapseAll", "Collapse all")}
        <div className="border" />
      </button>
    ),
    [toggleAll, allCollapsed, t],
  );

  useFixedSlot(collapseSlot);

  // ── Refs ──────────────────────────────────────────────────────
  const timelineRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const dotLabelRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const nodeStateRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastClientY = useRef<number>(0);
  const lastClientX = useRef<number>(0);
  const isHorizontalRef = useRef(isHorizontal);
  const pendingScrollId = useRef<string | null>(null);

  useEffect(() => {
    isHorizontalRef.current = isHorizontal;
  }, [isHorizontal]);

  // ── Time helpers ──────────────────────────────────────────────
  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return (h < 6 ? h + 24 : h) * 60 + m;
  };

  const minutesToTime = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = Math.floor(mins % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  // ── Vertical tracker ──────────────────────────────────────────
  const updateDotVertical = useCallback(
    (clientY: number) => {
      const timeline = timelineRef.current;
      const dot = dotRef.current;
      const label = dotLabelRef.current;
      if (!timeline || !dot) return;

      const { top, height } = timeline.getBoundingClientRect();
      const y = Math.min(Math.max(clientY - top, 0), height);
      dot.style.setProperty("--dot-y", `${y}px`);

      if (!label || events.length < 2) return;

      const nodePositions = nodeRefs.current
        .map((el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return r.top + r.height / 2 - top;
        })
        .filter((v): v is number => v !== null);

      if (nodePositions.length < 2) return;

      timeline.style.setProperty("--timeline-start", `${nodePositions[0]}px`);
      timeline.style.setProperty("--timeline-end", `${nodePositions[nodePositions.length - 1]}px`);

      const times = events.map((e) => timeToMinutes(e.time));
      const firstY = nodePositions[0];
      const lastY = nodePositions[nodePositions.length - 1];
      const splitY = Math.min(Math.max(y, firstY), lastY);
      timeline.style.setProperty("--split-y", `${splitY - 18}px`);

      nodeStateRefs.current.forEach((node, i) => {
        if (!node) return;
        node.classList.remove("schedule-event--past", "schedule-event--active", "schedule-event--upcoming");
        const card = cardRefs.current[i];
        if (card) {
          const r = card.getBoundingClientRect();
          const cardTop = r.top - top;
          const cardBottom = r.bottom - top;
          if (y > cardBottom) node.classList.add("schedule-event--past");
          else if (y >= cardTop) node.classList.add("schedule-event--active");
          else node.classList.add("schedule-event--upcoming");
        } else {
          nodePositions[i] < y
            ? node.classList.add("schedule-event--past")
            : node.classList.add("schedule-event--upcoming");
        }
      });

      if (y < firstY || y > lastY) {
        dot.style.opacity = "0";
        label.style.opacity = "0";
        return;
      }

      dot.style.opacity = "1";
      label.style.opacity = "1";

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

  const isMobileCollapsed = () =>
    isHorizontalRef.current && window.matchMedia("(max-width: 680px)").matches;

  // ── Collapsed horizontal tracker ──────────────────────────────
  const updateDotHorizontal = useCallback(
    (clientX: number) => {
      const timeline = timelineRef.current;
      const dot = dotRef.current;
      const label = dotLabelRef.current;
      if (!timeline || !dot) return;

      const { left, width } = timeline.getBoundingClientRect();
      const x = Math.min(Math.max(clientX - left, 0), width);
      dot.style.setProperty("--dot-x", `${x}px`);

      if (!label || events.length < 2) return;

      const nodePositions = nodeRefs.current
        .map((el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return r.left + r.width / 2 - left;
        })
        .filter((v): v is number => v !== null);

      if (nodePositions.length < 2) return;

      timeline.style.setProperty("--timeline-start-x", `${nodePositions[0]}px`);
      timeline.style.setProperty("--timeline-end-x", `${nodePositions[nodePositions.length - 1]}px`);

      const firstX = nodePositions[0];
      const lastX = nodePositions[nodePositions.length - 1];
      const splitX = Math.min(Math.max(x, firstX), lastX);
      timeline.style.setProperty("--split-x", `${splitX}px`);

      nodeStateRefs.current.forEach((node, i) => {
        if (!node) return;
        node.classList.remove("schedule-event--past", "schedule-event--active", "schedule-event--upcoming");
        const nodeX = nodePositions[i];
        if (nodeX < splitX) node.classList.add("schedule-event--past");
        else if (Math.abs(nodeX - splitX) < 30) node.classList.add("schedule-event--active");
        else node.classList.add("schedule-event--upcoming");
      });
    },
    [events],
  );

  // ── Collapsed vertical tracker (mobile) ───────────────────────
  const updateDotVerticalCollapsed = useCallback(
    (clientY: number) => {
      const timeline = timelineRef.current;
      if (!timeline || events.length < 2) return;

      const { top } = timeline.getBoundingClientRect();
      const y = Math.min(Math.max(clientY - top, 0), timeline.offsetHeight);

      const nodeRects = nodeRefs.current
        .map((el) => el ? el.getBoundingClientRect() : null)
        .filter((r): r is DOMRect => r !== null);

      if (nodeRects.length < 2) return;

      const nodeCentres = nodeRects.map((r) => r.top + r.height / 2 - top);
      const lineStart = nodeRects[0].bottom - top;
      const lineEnd = nodeRects[nodeRects.length - 1].top - top;

      timeline.style.setProperty("--timeline-start-y", `${lineStart}px`);
      timeline.style.setProperty("--timeline-end-y", `${lineEnd}px`);

      const splitY = Math.min(Math.max(y, lineStart), lineEnd);
      timeline.style.setProperty("--split-y", `${splitY}px`);

      nodeStateRefs.current.forEach((node, i) => {
        if (!node) return;
        node.classList.remove("schedule-event--past", "schedule-event--active", "schedule-event--upcoming");
        const nodeY = nodeCentres[i];
        if (nodeY < splitY) node.classList.add("schedule-event--past");
        else if (Math.abs(nodeY - splitY) < 30) node.classList.add("schedule-event--active");
        else node.classList.add("schedule-event--upcoming");
      });
    },
    [events],
  );

  const updateTracker = useCallback(
    (clientX: number, clientY: number) => {
      if (!isHorizontalRef.current) { updateDotVertical(clientY); return; }
      if (isMobileCollapsed()) updateDotVerticalCollapsed(clientY);
      else updateDotHorizontal(clientX);
    },
    [updateDotHorizontal, updateDotVertical, updateDotVerticalCollapsed],
  );

  // ── Event handlers ────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      lastClientY.current = e.clientY;
      lastClientX.current = e.clientX;
      updateTracker(e.clientX, e.clientY);
    },
    [updateTracker],
  );

  const handleTouchMove = useCallback(() => {
    if (isHorizontalRef.current) {
      // horizontal touch: use viewport centre horizontally
      const timeline = timelineRef.current;
      if (timeline) {
        const { left, width } = timeline.getBoundingClientRect();
        updateDotHorizontal(left + width / 2);
      }
    } else {
      updateDotVertical(window.innerHeight / 2);
    }
  }, [updateDotHorizontal, updateDotVertical]);

  const handleMouseLeave = useCallback(() => {
    if (dotRef.current) dotRef.current.style.opacity = "0";
    if (dotLabelRef.current) dotLabelRef.current.style.opacity = "0";
    timelineRef.current?.style.removeProperty("--split-y");
    timelineRef.current?.style.removeProperty("--split-x");
    nodeStateRefs.current.forEach((node) => {
      if (!node) return;
      node.classList.remove("schedule-event--past", "schedule-event--active", "schedule-event--upcoming");
    });
  }, []);

  const referencePosition = useCallback(() => {
    const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    const timeline = timelineRef.current;
    if (isHorizontalRef.current) {
      if (isMobileCollapsed()) {
        return { x: 0, y: isTouch && timeline ? timeline.getBoundingClientRect().top + timeline.offsetHeight / 2 : lastClientY.current };
      }
      if (!timeline) return { x: 0, y: 0 };
      const { left, width } = timeline.getBoundingClientRect();
      return { x: isTouch ? left + width / 2 : lastClientX.current, y: 0 };
    }
    return { x: lastClientX.current, y: isTouch ? window.innerHeight / 2 : lastClientY.current };
  }, []);

  useEffect(() => {
    const pos = referencePosition();
    updateTracker(pos.x, pos.y);
  }, [updateTracker, referencePosition]);

  // Recalculate after expand/collapse animations settle
  useEffect(() => {
    const timer = setTimeout(() => {
      const pos = referencePosition();
      updateTracker(pos.x, pos.y);
    }, 350);
    return () => clearTimeout(timer);
  }, [openIds, updateTracker, referencePosition]);

  // After switching to horizontal, scroll so the timeline is centred in the viewport
  useEffect(() => {
    if (!isHorizontal) return;
    const timer = setTimeout(() => {
      const el = timelineRef.current;
      if (el && lenis) {
        const offset = -(window.innerHeight / 2 - el.offsetHeight / 2);
        lenis.scrollTo(el, { offset, lerp: 0.1 });
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [isHorizontal, lenis]);

  // After switching from horizontal → vertical, scroll to the opened node.
  // Needs 900ms: AnimatePresence runs exit (400ms) then enter (400ms) before
  // the vertical refs are in the DOM and measurable.
  useEffect(() => {
    if (isHorizontal || !pendingScrollId.current) return;
    const id = pendingScrollId.current;
    pendingScrollId.current = null;
    const timer = setTimeout(() => {
      const index = events.findIndex((e) => e.id === id);
      const el = nodeRefs.current[index];
      if (el && lenis) {
        const offset = -(window.innerHeight / 2 - el.offsetHeight / 2);
        lenis.scrollTo(el, { offset, lerp: 0.1 });
      }
    }, 900); // wait for AnimatePresence fade + layout to settle
    return () => clearTimeout(timer);
  }, [isHorizontal, events, lenis]);

  useEffect(() => {
    const onScroll = () => {
      const pos = referencePosition();
      updateTracker(pos.x, pos.y);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [updateTracker, referencePosition]);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="schedule-page">
      <div className="schedule-hero">
        <TodayBanner show={isToday && !isPast} />
        <PageTitle>{t("schedule:title", "The Day")}</PageTitle>
        <Countdown
          date={wedding.wedding.date}
          time={wedding.wedding.ceremony.time}
          size="lg"
          onCelebrate={() => setIsToday(true)}
        />
        <p className="schedule-eyebrow">
          <span>{eyebrowDate}</span>
        </p>
        <p className="schedule-subtitle">
          {isPast
            ? t("schedule:subtitlePast", "Here's how our wedding day went, from start to finish.")
            : t("schedule:subtitle", "Everything you need to know about our wedding day, from start to finish.")}
        </p>
        <ScrollChevron />
      </div>

      <AnimatePresence mode="wait">
        {isHorizontal ? (
          /* ── COLLAPSED MODE ── */
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <CollapsedTimeline
              events={events}
              onNodeClick={(id) => {
                pendingScrollId.current = id;
                toggleAll(false);
              }}
              timelineRef={timelineRef}
              nodeRefs={nodeRefs}
              nodeStateRefs={nodeStateRefs}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onTouchMove={handleTouchMove}
            />
          </motion.div>
        ) : (
          /* ── VERTICAL MODE ── */
          <motion.div
            key="vertical"
            className="schedule-timeline-wrapper"
            ref={timelineRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchMove={handleTouchMove}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="schedule-nodes-line-past" />
            <div className="schedule-nodes-line-future" />

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

            <div className="schedule-timeline">
              {events.map((event, index) => {
                const isEven = index % 2 === 0;
                const hasMaps = event.maps && event.maps.length > 0;
                const isOpen = openIds.has(event.id);

                return (
                  <div key={event.id} className={`schedule-event-row${isOpen ? "" : " schedule-event-row--collapsed"}`}>
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
                            .reduce((acc: any, key: string) => acc[key], Icon)({ size: 42 })}
                        </span>
                      )}
                      <div className="schedule-event-time">{event.time}</div>
                    </div>

                    {event.images && event.images.length > 0 && (
                      <FadeInSection
                        delay={index * 0.08 + 0.05}
                        className={`schedule-event-opposite ${isEven ? "schedule-event-opposite--right" : "schedule-event-opposite--left"}`}
                      >
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              style={{ display: "contents" }}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.25 }}
                            >
                              {event.images.map((image, i) => (
                                <div className="schedule-event-opposite-img" key={`${event.id}-${i}`}>
                                  <img
                                    src={`${import.meta.env.BASE_URL}${image.replace(/^\//, "")}`}
                                    alt={event.id}
                                  />
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </FadeInSection>
                    )}

                    <FadeInSection
                      delay={index * 0.08}
                      className={`schedule-event-card ${isEven ? "schedule-event-card--left" : "schedule-event-card--right"}`}
                    >
                      <div
                        className="schedule-event-card-inner"
                        ref={(el) => { cardRefs.current[index] = el; }}
                      >
                        <div className="schedule-event-header">
                          <h2 className="schedule-event-title">
                            {t(`schedule:events.${event.id}.title`, event.id)}
                          </h2>
                          {event.location && (
                            <span className="schedule-event-location">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: "4px", flexShrink: 0 }}>
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                              </svg>
                              {event.location}
                            </span>
                          )}
                        </div>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              style={{ overflow: "hidden" }}
                            >
                              <p className="schedule-event-desc">
                                <Trans
                                  i18nKey={`schedule:events.${event.id}.${isPast ? "descriptionPast" : "description"}`}
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
                                        extraCoordinates={(mapConfig as any).extraCoordinates}
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
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </FadeInSection>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isPast && (
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
      )}
    </div>
  );
};

export default Schedule;
