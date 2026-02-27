// app/components/WeatherForecast.tsx
import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/Icon";
import { useWeddingData } from "@/hooks/useWeddingData";

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

/* ======================================================
   Weather → Icon mapping
   ====================================================== */
const getWeatherIcon = (precip: number, temp: number) => {
  if (precip > 60) return Icon.Rain;
  if (precip > 30) return Icon.Cloud;
  if (temp <= 0) return Icon.Snow;
  return Icon.Sun;
};

const WeatherForecast: React.FC = ({test}) => {
  const weddingData = useWeddingData();
  const { lat, lng } = weddingData.wedding.ceremony.venue.coordinates;

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

  /* ---------- Forecast range title (next 7 days) ---------- */
  const forecastRangeTitle = useMemo(() => {
    if (!forecast.length) return "";
    const startDate = new Date(forecast[0].rawDate);
    const endDate = new Date(forecast[forecast.length - 1].rawDate);
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
  }, [forecast]);

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

    const fetchWeather = async () => {
      try {
        /* ---------- Forecast (next 7 days) ---------- */
        const forecastUrl =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${lat}&longitude=${lng}` +
          `&daily=temperature_2m_max,precipitation_probability_max` +
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
          .slice(0, 7)
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

  if (loading) {
    return (
      <div className="weather-forecast loading">
        <Icon.More className="loading-spinner" />
        <p>Loading weather…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weather-forecast error">
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
      className="weather-forecast compact"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* ---------- Next 7 days ---------- */}
      {forecast.length > 0 && <strong>{forecastRangeTitle}</strong>}
      <div className="weather-forecast__forecast">
        {forecast.slice(0, 5).map((day, i) => {
          const WeatherIcon = getWeatherIcon(day.precipitation, day.temp);

          // Check if this day is today
          const today = new Date();
          const dayDate = new Date(day.rawDate);
          const isToday =
            today.getFullYear() === dayDate.getFullYear() &&
            today.getMonth() === dayDate.getMonth() &&
            today.getDate() === dayDate.getDate();

          return (
            <div key={i} className={`weather-day${isToday ? " today" : ""}`}>
              <div className="date">
                <div className="icon">
                  <WeatherIcon size={18} />
                </div>
                {day.date}{" "}
                {isToday && (
                  <>
                    <br />
                    (today)
                  </>
                )}
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
    </motion.div>
  );
};

export default WeatherForecast;
