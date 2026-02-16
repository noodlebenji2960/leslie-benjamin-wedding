import { useTranslation } from "react-i18next";
import { useWeddingData } from "@/hooks/useWeddingData";
import Map from "@/components/Map";

const Schedule = () => {
  const { t } = useTranslation(["schedule", "common"]);
  const wedding = useWeddingData();
  const events = wedding.schedule || [];

  return (
    <div className="schedule-page container">
      <h1 className="schedule-title">
        {t("schedule:title", "Wedding Schedule")}
      </h1>

      <div className="schedule-list">
        {events.map((event) => (
          <div key={event.id} className="schedule-item">
            <div className="schedule-time">
              {/*<AnalogClock
                size={70}
                fixedTime={event.time}
              />*/}
              <div className="time-text">{event.time}</div>
            </div>
            <div className="schedule-content">
              <h3 className="schedule-event-title">
                <strong>{t(`schedule:events.${event.id}.title`)}</strong>
                {event.location && ` - ${event.location}`}
              </h3>

              <p className="schedule-event-desc">
                {t(`schedule:events.${event.id}.description`)}
              </p>

              <div className="maps-container">
                {event.maps?.map((mapConfig, index) => (
                  <Map
                    key={index}
                    label={(mapConfig as any).label}
                    coordinates={(mapConfig as any).coordinates}
                    extraCoordinates={(mapConfig as any).extraCoordinates}
                    mapUrl={(mapConfig as any).mapUrl}
                    showRoute={(mapConfig as any).showRoute}
                    interactive={(mapConfig as any).interactive}
                    width={(mapConfig as any).width}
                    height={(mapConfig as any).height}
                    zoom={(mapConfig as any).zoom}
                  />
                ))}
              </div>

              {/* Fallbacks */}
              {!event.maps && (event as any).embedMap && (event as any).coordinates && (
                <Map
                  coordinates={(event as any).coordinates}
                  extraCoordinates={(event as any).extraCoordinates}
                  mapUrl={(event as any).mapUrl}
                  showRoute={(event as any).showRoute}
                  interactive={(event as any).interactive}
                  zoom={(event as any).zoom}
                />
              )}

              {!event.maps && !(event as any).coordinates && (event as any).mapUrl && (
                <a
                  href={(event as any).mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="schedule-map-link"
                >
                  {t("common:viewMap", "View map")}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Schedule;
