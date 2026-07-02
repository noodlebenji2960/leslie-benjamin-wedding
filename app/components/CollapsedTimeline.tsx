import { useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import weddingData from "@/data/wedding.json";

type ScheduleEvent = typeof weddingData.schedule[number];

interface CollapsedTimelineProps {
  events: ScheduleEvent[];
  onNodeClick?: (eventId: string) => void;
  // Optional: schedule page passes its own refs/handlers so the tracker
  // stays wired to the same state that drives scroll/expand logic.
  timelineRef?: React.RefObject<HTMLDivElement | null>;
  nodeRefs?: React.RefObject<(HTMLDivElement | null)[]>;
  nodeStateRefs?: React.RefObject<(HTMLDivElement | null)[]>;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseLeave?: () => void;
  onTouchMove?: () => void;
}

export function CollapsedTimeline({
  events,
  onNodeClick,
  timelineRef: timelineRefProp,
  nodeRefs: nodeRefsProp,
  nodeStateRefs: nodeStateRefsProp,
  onMouseMove: onMouseMoveProp,
  onMouseLeave: onMouseLeaveProp,
  onTouchMove: onTouchMoveProp,
}: CollapsedTimelineProps) {
  const { t } = useTranslation(["schedule"]);
  const ownTimelineRef = useRef<HTMLDivElement>(null);
  const ownNodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ownNodeStateRefs = useRef<(HTMLDivElement | null)[]>([]);

  const timelineRef = timelineRefProp ?? ownTimelineRef;
  const nodeRefs = nodeRefsProp ?? ownNodeRefs;
  const nodeStateRefs = nodeStateRefsProp ?? ownNodeStateRefs;

  const isMobile = () => window.matchMedia("(max-width: 680px)").matches;

  const updateLines = useCallback(
    (clientX: number, clientY: number) => {
      const timeline = timelineRef.current;
      if (!timeline || events.length < 2) return;

      if (isMobile()) {
        const { top } = timeline.getBoundingClientRect();
        const y = Math.min(Math.max(clientY - top, 0), timeline.offsetHeight);

        const nodeRects = nodeRefs.current
          .map((el) => (el ? el.getBoundingClientRect() : null))
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
      } else {
        const { left, width } = timeline.getBoundingClientRect();
        const x = Math.min(Math.max(clientX - left, 0), width);

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

        const splitX = Math.min(Math.max(x, nodePositions[0]), nodePositions[nodePositions.length - 1]);
        timeline.style.setProperty("--split-x", `${splitX}px`);

        nodeStateRefs.current.forEach((node, i) => {
          if (!node) return;
          node.classList.remove("schedule-event--past", "schedule-event--active", "schedule-event--upcoming");
          const nodeX = nodePositions[i];
          if (nodeX < splitX) node.classList.add("schedule-event--past");
          else if (Math.abs(nodeX - splitX) < 30) node.classList.add("schedule-event--active");
          else node.classList.add("schedule-event--upcoming");
        });
      }
    },
    [events],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => updateLines(e.clientX, e.clientY),
    [updateLines],
  );

  const handleMouseLeave = useCallback(() => {
    nodeStateRefs.current.forEach((node) => {
      if (!node) return;
      node.classList.remove("schedule-event--past", "schedule-event--active", "schedule-event--upcoming");
    });
    timelineRef.current?.style.removeProperty("--split-y");
    timelineRef.current?.style.removeProperty("--split-x");
  }, []);

  const handleTouchMove = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    if (isMobile()) {
      updateLines(0, window.innerHeight / 2);
    } else {
      const { left, width } = timeline.getBoundingClientRect();
      updateLines(left + width / 2, 0);
    }
  }, [updateLines]);

  useEffect(() => {
    const onScroll = () => {
      if (isMobile()) updateLines(0, window.innerHeight / 2);
      else {
        const timeline = timelineRef.current;
        if (timeline) {
          const { left, width } = timeline.getBoundingClientRect();
          updateLines(left + width / 2, 0);
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [updateLines]);

  return (
    <div
      className="schedule-timeline-wrapper schedule-timeline-wrapper--collapsed"
      ref={timelineRef}
      onMouseMove={onMouseMoveProp ?? handleMouseMove}
      onMouseLeave={onMouseLeaveProp ?? handleMouseLeave}
      onTouchMove={onTouchMoveProp ?? handleTouchMove}
    >
      <div className="schedule-nodes-line-past--collapsed" />
      <div className="schedule-nodes-line-future--collapsed" />

      <div className="schedule-timeline--collapsed">
        {events.map((event, index) => (
          <div key={event.id} className="schedule-event-node-wrap">
            <div
              className="schedule-event-node-inner"
              ref={(el) => {
                nodeRefs.current[index] = el;
                nodeStateRefs.current[index] = el;
              }}
              onClick={() => onNodeClick?.(event.id)}
              style={onNodeClick ? { cursor: "pointer" } : undefined}
              title={t(`schedule:events.${event.id}.title`, event.id)}
            >
              <span className="schedule-event-node-content">
                {event.icon && (
                  <span className="schedule-event-icon">
                    {event.icon
                      .split(".")
                      .reduce((acc: any, key: string) => acc[key], Icon)({ size: 32 })}
                  </span>
                )}
                <div className="schedule-event-time">{event.time}</div>
              </span>
              <span className="schedule-event-node-hover-label">
                {t(`schedule:events.${event.id}.title`, event.id)}
              </span>
            </div>
            <div className="schedule-event-node-label">
              {t(`schedule:events.${event.id}.title`, event.id)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
