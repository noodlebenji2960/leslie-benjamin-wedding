// app/components/WeatherForecast.tsx
import { useEffect, useState, useMemo, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router";
import { Icon } from "@/components/Icon";
import Map from "@/components/Map";
import { useWeddingData } from "@/hooks/useWeddingData";
import { useLenis } from "lenis/react";

interface ForecastDay {
  rawDate: string; // ISO for logic
  date: string; // formatted for display
  temp: number;
  precipitation: number;
}

interface MonthlyTypical {
  avgTemp: number;
  maxTemp: number;
  minTemp: number;
  rainyDays: number;
  sunnyDays: number;
  totalDays: number;
  measuredRange: string;
}

interface WeddingDayLastYear {
  temp: number;
  precipitation: number;
  date: string;
  year: number;
}

interface WeatherLocation {
  id: string;
  label?: string;
  labelMain: string;
  region: string;
  coordinates: { lat: number; lng: number };
  /** Filename under /public/images/locations/ */
  image: string;
}

interface WeatherForecastProps {
  /** "compact" embeds inline (e.g. inside flowing FAQ text); "full" renders
   * a richer standalone page section with a location picker and venue map.
   * Defaults to "compact". */
  variant?: "compact" | "full";
}

/* ======================================================
   Weather → Icon mapping
   ====================================================== */
const getWeatherIcon = (precip: number, temp: number) => {
  if (precip > 60) return Icon.Rain;
  if (precip > 30) return Icon.Cloud;
  if (temp <= 0) return Icon.Snow;
  return Icon.Sun;
};

const WeatherForecast: React.FC<WeatherForecastProps> = ({
  variant = "compact",
}) => {
  const weddingData = useWeddingData();
  const venue = weddingData.wedding.ceremony.venue;

  // Fuente Murrieta coordinates already used for the shuttle bus pickup —
  // see the "bus" schedule event in wedding.json.
  const locations: WeatherLocation[] = useMemo(
    () => [
      {
        id: "venue",
        label: `The Venue`,
        labelMain: venue.city,
        region: venue.region,
        coordinates: { lat: venue.coordinates.lat, lng: venue.coordinates.lng },
        image: "venue.jpg",
      },
      {
        id: "logrono",
        label: "Bus pick up/drop off",
        labelMain: "Logroño",
        region: "La Rioja",
        coordinates: { lat: 42.4661562, lng: -2.4511548 },
        image: "logroño.webp",
      },
      {
        id: "bilbao",
        label: undefined,
        labelMain: "Bilbao",
        region: "Basque Country",
        coordinates: { lat: 43.263, lng: -2.935 },
        image: "bilbao.webp",
      },
      {
        id: "zaragoza",
        label: undefined,
        labelMain: "Zaragoza",
        region: "Aragón",
        coordinates: { lat: 41.6488, lng: -0.8891 },
        image: "zaragoza.webp",
      },
      {
        id: "madrid",
        label: undefined,
        labelMain: "Madrid",
        region: "Comunidad de Madrid",
        coordinates: { lat: 40.4168, lng: -3.7038 },
        image: "madrid.webp",
      },
      {
        id: "barcelona",
        label: undefined,
        labelMain: "Barcelona",
        region: "Catalonia",
        coordinates: { lat: 41.3851, lng: 2.1734 },
        image: "barcelona.jpg",
      },
    ],
    [venue],
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const locationParam = variant === "full" ? searchParams.get("location") : null;

  const [selectedId, setSelectedId] = useState(
    locations.some((l) => l.id === locationParam)
      ? (locationParam as string)
      : locations[0].id,
  );
  const selectedLocation =
    locations.find((l) => l.id === selectedId) ?? locations[0];
  const { lat, lng } = selectedLocation.coordinates;

  const selectLocation = (id: string) => {
    setSelectedId(id);
    if (variant !== "full") return;
    setSearchParams(
      (params) => {
        if (id === locations[0].id) {
          params.delete("location");
        } else {
          params.set("location", id);
        }
        return params;
      },
      { replace: true },
    );
  };

  const lenis = useLenis();
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  /* ---------- Current weather for every location (drives the map markers) ---------- */
  const [locationWeather, setLocationWeather] = useState<
    Record<string, { temp: number; precipitation: number }>
  >({});

  useEffect(() => {
    if (variant !== "full") return;
    let cancelled = false;

    Promise.all(
      locations.map(async (loc) => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${loc.coordinates.lat}&longitude=${loc.coordinates.lng}&current=temperature_2m,precipitation`,
          );
          if (!res.ok) return null;
          const json = await res.json();
          return {
            id: loc.id,
            temp: Math.round(json.current?.temperature_2m ?? 0),
            precipitation: Math.round(json.current?.precipitation ?? 0),
          };
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, { temp: number; precipitation: number }> =
        {};
      results.forEach((r) => {
        if (r) next[r.id] = { temp: r.temp, precipitation: r.precipitation };
      });
      setLocationWeather(next);
    });

    return () => {
      cancelled = true;
    };
  }, [variant, locations]);

  useEffect(() => {
    if (!pickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pickerOpen]);

  const weddingDate = useMemo(
    () => new Date(weddingData.wedding.date),
    [weddingData.wedding.date],
  );

  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [typical, setTypical] = useState<MonthlyTypical | null>(null);
  const [weddingDayLastYear, setWeddingDayLastYear] =
    useState<WeddingDayLastYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];
  const formatShortDate = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  /* ---------- 7-day pagination over the 14-day forecast ---------- */
  const [forecastPage, setForecastPage] = useState(0);
  const visibleForecast = useMemo(
    () => forecast.slice(forecastPage * 7, forecastPage * 7 + 7),
    [forecast, forecastPage],
  );

  /* ---------- Forecast range title (visible 7-day page) ---------- */
  const forecastRangeTitle = useMemo(() => {
    if (!visibleForecast.length) return "";
    const startDate = new Date(visibleForecast[0].rawDate);
    const endDate = new Date(
      visibleForecast[visibleForecast.length - 1].rawDate,
    );
    const start = `${startDate.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })}, ${startDate.getFullYear()}`;
    const end = `${endDate.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })}, ${endDate.getFullYear()}`;
    return `${start} – ${end}`;
  }, [visibleForecast]);

  /* ---------- Historical month title ---------- */
  const historicalRangeTitle = useMemo(() => {
    if (!typical) return "";
    // Extract years from measuredRange start and end
    const [start, end] = typical.measuredRange.split(" – ");
    return `${start}, ${weddingDate.getFullYear() - 1} – ${end}, ${weddingDate.getFullYear() - 1}`;
  }, [typical, weddingDate]);

  /* Memoized wedding day title (with year) */
  const weddingDayTitle = useMemo(() => {
    if (!weddingDayLastYear) return "";
    return `${weddingDayLastYear.date}, ${weddingDayLastYear.year}`;
  }, [weddingDayLastYear]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setForecastPage(0);

    const fetchWeather = async () => {
      try {
        /* ---------- Forecast (next 14 days) ---------- */
        const forecastUrl =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${lat}&longitude=${lng}` +
          `&daily=temperature_2m_max,precipitation_probability_max` +
          `&forecast_days=14` +
          `&timezone=auto`;

        /* ---------- Historical (entire wedding month last year) ---------- */
        const year = weddingDate.getFullYear() - 1;
        const month = weddingDate.getMonth();
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);

        const historicalUrl =
          `https://archive-api.open-meteo.com/v1/archive` +
          `?latitude=${lat}&longitude=${lng}` +
          `&start_date=${formatDate(monthStart)}` +
          `&end_date=${formatDate(monthEnd)}` +
          `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
          `&timezone=auto`;

        const [forecastRes, historicalRes] = await Promise.all([
          fetch(forecastUrl),
          fetch(historicalUrl),
        ]);

        if (!forecastRes.ok || !historicalRes.ok)
          throw new Error("Weather fetch failed");

        const forecastJson = await forecastRes.json();
        const historicalJson = await historicalRes.json();

        if (cancelled) return;

        /* ---------- Parse forecast ---------- */
        const parsedForecast: ForecastDay[] = forecastJson.daily.time
          .slice(0, 14)
          .map((date: string, i: number) => ({
            rawDate: date, // keep ISO for comparison
            date: new Date(date).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            }),
            temp: Math.round(forecastJson.daily.temperature_2m_max[i]),
            precipitation: Math.round(
              forecastJson.daily.precipitation_probability_max?.[i] ?? 0,
            ),
          }));

        setForecast(parsedForecast);

        /* ---------- Parse monthly typical ---------- */
        const maxTemps: number[] = historicalJson.daily.temperature_2m_max;
        const minTemps: number[] = historicalJson.daily.temperature_2m_min;
        const precip: number[] = historicalJson.daily.precipitation_sum;

        const totalDays = precip.length;
        const rainyDays = precip.filter((p) => p > 1).length;
        const sunnyDays = totalDays - rainyDays;
        const avg = (arr: number[]) =>
          arr.reduce((a, b) => a + b, 0) / arr.length;

        setTypical({
          avgTemp: Math.round(avg(maxTemps)),
          maxTemp: Math.round(Math.max(...maxTemps)),
          minTemp: Math.round(Math.min(...minTemps)),
          rainyDays,
          sunnyDays,
          totalDays,
          measuredRange: `${formatShortDate(monthStart)} – ${formatShortDate(
            monthEnd,
          )}`,
        });

        /* ---------- Parse wedding day last year ---------- */
        const weddingLastYearDateStr = formatDate(
          new Date(year, month, weddingDate.getDate()),
        );
        const dayIndex = historicalJson.daily.time.findIndex(
          (d: string) => d === weddingLastYearDateStr,
        );
        if (dayIndex >= 0) {
          setWeddingDayLastYear({
            temp: Math.round(historicalJson.daily.temperature_2m_max[dayIndex]),
            precipitation: Math.round(
              historicalJson.daily.precipitation_sum[dayIndex],
            ),
            date: formatShortDate(new Date(weddingLastYearDateStr)),
            year,
          });
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchWeather();
    return () => {
      cancelled = true;
    };
  }, [lat, lng, weddingDate]);

  const dayCount = variant === "full" ? 7 : 5;

  const heroBackground = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.45)), url(/images/locations/${selectedLocation.image})`,
  };

  /* ---------- Build custom weather markers for the map ---------- */
  const weatherMarkers = useMemo(() => {
    return locations.map((loc) => {
      const w = locationWeather[loc.id];
      const WeatherIcon = w ? getWeatherIcon(w.precipitation, w.temp) : Icon.Sun;
      const iconSvg = renderToStaticMarkup(
        <WeatherIcon size={loc.id === selectedId ? 24 : 18} />,
      );
      return {
        id: loc.id,
        lat: loc.coordinates.lat,
        lng: loc.coordinates.lng,
        label: w ? `${loc.labelMain} – ${w.temp}°C` : loc.labelMain,
        active: loc.id === selectedId,
        iconHtml: `<div class="marker-icon">${iconSvg}</div>${
          w ? `<div class="marker-temp">${w.temp}°</div>` : ""
        }`,
      };
    });
  }, [locations, locationWeather, selectedId]);

  const LocationPicker = () => (
    <div className="weather-forecast__picker" ref={pickerRef}>
      <button
        type="button"
        className="weather-forecast__picker-trigger"
        onClick={() => setPickerOpen((v) => !v)}
        aria-expanded={pickerOpen}
      >
        <Icon.location size={16} />
        {selectedLocation.label
          ? `${selectedLocation.label} – ${selectedLocation.labelMain}`
          : selectedLocation.labelMain}
        <Icon.Down
          size={14}
          className={pickerOpen ? "weather-forecast__picker-chevron open" : "weather-forecast__picker-chevron"}
        />
      </button>

      <AnimatePresence>
        {pickerOpen && (
          <motion.ul
            className="weather-forecast__picker-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {locations.map((loc) => (
              <li key={loc.id}>
                <button
                  type="button"
                  className={
                    loc.id === selectedId
                      ? "weather-forecast__picker-option active"
                      : "weather-forecast__picker-option"
                  }
                  onClick={() => {
                    selectLocation(loc.id);
                    setPickerOpen(false);
                  }}
                >
                  {loc.label ? `${loc.label} – ${loc.labelMain}` : loc.labelMain}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );

  if (loading) {
    return (
      <div className={`weather-forecast loading ${variant}`}>
        <Icon.More className="loading-spinner" />
        <p>Loading weather…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`weather-forecast error ${variant}`}>
        <Icon.Cloud />
        <p>
          <strong>Weather unavailable</strong>
        </p>
        <small>Typical summer weather: warm & sunny ☀️</small>
      </div>
    );
  }

  return (
    <motion.div
      className={`weather-forecast ${variant}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {variant === "full" && (
        <div className="weather-forecast__hero" style={heroBackground}>
          <div className="weather-forecast__hero-content">
            <Icon.Sun size={36} />
            <div>
              <h2>{selectedLocation.labelMain}</h2>
              <p>
                {weddingDate.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <LocationPicker />
        </div>
      )}

      {/* ---------- Next 7 / 14 days ---------- */}
      {variant === "full" ? (
        forecast.length > 0 && (
          <div className="weather-forecast__forecast-header">
            <strong>{forecastRangeTitle}</strong>
            {forecast.length > 7 && (
              <button
                type="button"
                className="weather-forecast__page-toggle"
                onClick={() => setForecastPage((p) => (p === 0 ? 1 : 0))}
              >
                {forecastPage === 0 ? (
                  <>
                    See next 7 days <Icon.Next size={16} />
                  </>
                ) : (
                  <>
                    <Icon.Back size={16} /> See previous 7 days
                  </>
                )}
              </button>
            )}
          </div>
        )
      ) : (
        forecast.length > 0 && <strong>{forecastRangeTitle}</strong>
      )}
      <div className="weather-forecast__forecast">
        {(variant === "full" ? visibleForecast : forecast.slice(0, dayCount)).map((day, i) => {
          const WeatherIcon = getWeatherIcon(day.precipitation, day.temp);

          // Check if this day is today
          const today = new Date();
          const dayDate = new Date(day.rawDate);
          const weddingIsDate = new Date(weddingDate.getFullYear(), weddingDate.getMonth(), weddingDate.getDate());
          const isToday =
            today.getFullYear() === dayDate.getFullYear() &&
            today.getMonth() === dayDate.getMonth() &&
            today.getDate() === dayDate.getDate();

          const isWeddingDay =
            weddingIsDate.getFullYear() === dayDate.getFullYear() &&
            weddingIsDate.getMonth() === dayDate.getMonth() &&
            weddingIsDate.getDate() === dayDate.getDate();

          return (
            <div
              key={i}
              className={`weather-day${isToday ? " today" : ""}${isWeddingDay ? " wedding-day" : ""}`}
            >
              <span className={`today-badge`}>Today</span>
              <div className="date">
                <div className="icon">
                  <WeatherIcon size={variant === "full" ? 28 : 18} />
                </div>
                {day.date}
              </div>
              <div>
                {day.precipitation > 30 && (
                  <div className="rain">{day.precipitation}% prec.</div>
                )}
                <div className="temp">{day.temp}°</div>
              </div>
            </div>
          );
        })}
      </div>

      {variant === "full" ? (
        <div className="weather-forecast__details">
          {/* ---------- Wedding day last year ---------- */}
          {weddingDayLastYear && (
            <div className="weather-forecast__card">
              <h3>Last Year's Wedding Day</h3>
              <div className="weather-forecast__wedding-day">
                <div className="icon">
                  {getWeatherIcon(
                    weddingDayLastYear.precipitation,
                    weddingDayLastYear.temp,
                  )({ size: 32 })}
                </div>
                <div>
                  <strong>{weddingDayTitle}</strong>
                  <p>
                    {weddingDayLastYear.temp}°
                    {weddingDayLastYear.precipitation > 0 &&
                      ` • 💧 ${weddingDayLastYear.precipitation}mm rain`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ---------- Historical month averages ---------- */}
          {typical && (
            <div className="weather-forecast__card">
              <h3>Typical for {historicalRangeTitle}</h3>
              <div className="weather-forecast__stats">
                <div className="stat">
                  <span className="stat__value">{typical.avgTemp}°</span>
                  <span className="stat__label">avg high</span>
                </div>
                <div className="stat">
                  <span className="stat__value">{typical.maxTemp}°</span>
                  <span className="stat__label">record high</span>
                </div>
                <div className="stat">
                  <span className="stat__value">{typical.minTemp}°</span>
                  <span className="stat__label">record low</span>
                </div>
                <div className="stat">
                  <span className="stat__value">{typical.sunnyDays}</span>
                  <span className="stat__label">sunny days</span>
                </div>
                <div className="stat">
                  <span className="stat__value">{typical.rainyDays}</span>
                  <span className="stat__label">rainy days</span>
                </div>
              </div>
            </div>
          )}

          {/* ---------- Map ---------- */}
          <div className="weather-forecast__card weather-forecast__card--map">
            <Map
              key={selectedId}
              coordinates={selectedLocation.coordinates}
              markers={weatherMarkers}
              onMarkerClick={(id) => {
                selectLocation(id);
                lenis?.scrollTo(0, { duration: 1 });
              }}
              interactive
              zoomControl
              zoom={selectedId === "venue" ? 10 : 7}
              height="420px"
            />
          </div>

          {/* ---------- Sources ---------- */}
          <p className="weather-forecast__sources">
            Forecast & historical data:{" "}
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open-Meteo
            </a>{" "}
            (
            <a
              href="https://open-meteo.com/en/license"
              target="_blank"
              rel="noopener noreferrer"
            >
              CC BY 4.0
            </a>
            ). Map tiles:{" "}
            <a
              href="https://carto.com/attributions"
              target="_blank"
              rel="noopener noreferrer"
            >
              CARTO
            </a>{" "}
            /{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenStreetMap
            </a>{" "}
            contributors.
          </p>
        </div>
      ) : (
        <>
          {/* ---------- Wedding day last year ---------- */}
          {weddingDayLastYear && (
            <div className="weather-forecast__wedding-day">
              <strong>{weddingDayTitle}:</strong>
              <div className="icon">
                {getWeatherIcon(
                  weddingDayLastYear.precipitation,
                  weddingDayLastYear.temp,
                )({ size: 18 })}
              </div>
              <span>{weddingDayLastYear.temp}°</span>
              {weddingDayLastYear.precipitation > 0 && (
                <span> • 💧 {weddingDayLastYear.precipitation}mm</span>
              )}
            </div>
          )}

          {/* ---------- Historical month averages ---------- */}
          {typical && (
            <div className="weather-forecast__typical">
              <small>{historicalRangeTitle}</small>
              <span>
                🌧 {typical.rainyDays} rainy days • ☀️ {typical.sunnyDays} sunny
                days
              </span>
              <span>
                🌡 {typical.avgTemp}°C avg / {typical.maxTemp}° / {typical.minTemp}°
              </span>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default WeatherForecast;
