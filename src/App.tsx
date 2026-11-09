import { useEffect, useMemo, useState } from "react";
import "./App.css";

type Station = {
  stationId: string;
  name: string;
  address: string;
  price: number | null;
  distanceKm: number;
};

type ApiResponse = {
  stations: Station[];
  generatedAt?: string;
};

type CachedResponse = { data: ApiResponse; cachedAt: number };
type WeatherResponse = {
  current?: { temperature_2m: number; weather_code: number; is_day: number };
};

const API_URL =
  "https://square-sky-d093.kskish18.workers.dev/?lat=45.49570&lng=-73.65684&radius=5&fuelType=ordinaire&sort=price";
const CACHE_KEY = "gas-near-me:montreal-prices";
const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=45.4957&longitude=-73.65684&current=temperature_2m,weather_code,is_day&timezone=America%2FToronto";

function getWeatherLabel(code: number) {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Montreal";
}

function WeatherIcon({ code, isDay }: { code: number; isDay: boolean }) {
  if (code >= 95) {
    return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M17 39h29a10 10 0 0 0 0-20 15 15 0 0 0-28-2 11 11 0 0 0-1 22Z" /><path d="m34 30-7 11h7l-3 10 10-14h-7l4-7" /></svg>;
  }
  if ((code >= 71 && code <= 77) || code >= 85) {
    return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M17 37h29a10 10 0 0 0 0-20 15 15 0 0 0-28-2 11 11 0 0 0-1 22Z" /><path d="M23 44v9m-4-4h8m11-5v9m-4-4h8" /></svg>;
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M17 36h29a10 10 0 0 0 0-20 15 15 0 0 0-28-2 11 11 0 0 0-1 22Z" /><path d="m23 43-3 8m14-8-3 8m14-8-3 8" /></svg>;
  }
  if (code === 45 || code === 48) {
    return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M13 25h38M9 34h39M16 43h35" /></svg>;
  }
  if (code === 3) {
    return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M17 42h29a10 10 0 0 0 0-20 15 15 0 0 0-28-2 11 11 0 0 0-1 22Z" /></svg>;
  }
  if (code === 1 || code === 2) {
    return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><circle cx="25" cy="25" r="10" /><path d="M25 7v4m0 28v4M7 25h4m28 0h4M12.3 12.3l2.8 2.8m19.8 19.8 2.8 2.8M37.7 12.3l-2.8 2.8M15.1 35.1l-2.8 2.8" />{code === 2 && <path d="M27 48h21a8 8 0 0 0 0-16 12 12 0 0 0-19-2" />}</svg>;
  }
  return isDay
    ? <svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><circle cx="32" cy="32" r="12" /><path d="M32 7v7m0 36v7M7 32h7m36 0h7M14.3 14.3l5 5m25.4 25.4 5 5m0-35.4-5 5M19.3 44.7l-5 5" /></svg>
    : <svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M42 11a18 18 0 1 0 11 31A20 20 0 0 1 42 11Z" /></svg>;
}

function readCache(): CachedResponse | null {
  try {
    const value = localStorage.getItem(CACHE_KEY);
    return value ? (JSON.parse(value) as CachedResponse) : null;
  } catch {
    return null;
  }
}

function formatPrice(price: number | null) {
  return typeof price === "number" ? price.toFixed(1) : "--";
}

function formatUpdatedAt(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function App() {
  const [cached] = useState(readCache);
  const [stations, setStations] = useState<Station[]>(cached?.data.stations ?? []);
  const [generatedAt, setGeneratedAt] = useState(cached?.data.generatedAt);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState("");
  const [ascending, setAscending] = useState(true);
  const [weather, setWeather] = useState<WeatherResponse["current"]>();

  useEffect(() => {
    const controller = new AbortController();

    async function loadStations() {
      try {
        const response = await fetch(API_URL, {
          signal: controller.signal,
          cache: "default",
        });
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);

        const data = (await response.json()) as ApiResponse;
        const safeData = { ...data, stations: data.stations ?? [] };
        setStations(safeData.stations);
        setGeneratedAt(safeData.generatedAt);
        setError("");
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data: safeData, cachedAt: Date.now() }),
          );
        } catch {
          // Storage can be unavailable in private browsing; the live data still works.
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        if (!stations.length) setError("Unable to load gas stations right now.");
        console.error(err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadStations();
    return () => controller.abort();
    // Cached data is intentionally shown immediately while the request refreshes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(WEATHER_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
        return response.json() as Promise<WeatherResponse>;
      })
      .then((data) => setWeather(data.current))
      .catch((err: unknown) => {
        if (!controller.signal.aborted) console.error(err);
      });
    return () => controller.abort();
  }, []);

  const sortedStations = useMemo(
    () =>
      [...stations].sort((a, b) => {
        if (a.price === null) return b.price === null ? 0 : 1;
        if (b.price === null) return -1;
        return ascending ? a.price - b.price : b.price - a.price;
      }),
    [ascending, stations],
  );

  const refreshedTime = formatUpdatedAt(generatedAt);

  return (
    <main className="app-shell">
      <header className="app-header">
        <a className="brand" href="#top" aria-label="Gas Near Me home">
          <span className="brand-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5 21V4.8A1.8 1.8 0 0 1 6.8 3h7.4A1.8 1.8 0 0 1 16 4.8V21M4 21h13M7.5 7h5.2v4H7.5zM16 7h1.2l2 2.2v6.3a1.5 1.5 0 0 0 3 0v-4.2" />
            </svg>
          </span>
          <span>
            <h1>Gas Near Me</h1>
            <span className="brand-subtitle">Montreal fuel prices</span>
          </span>
        </a>
        <span className="live-status"><i /> Live prices</span>
      </header>

      <section className="intro-card" id="top">
        <div className="intro-glow" />
        <p className="eyebrow">MONTRÉAL WEATHER</p>
        <div className="weather-main" aria-label={weather ? `${Math.round(weather.temperature_2m)} degrees, ${getWeatherLabel(weather.weather_code)}` : "Weather loading"}>
          {weather && <WeatherIcon code={weather.weather_code} isDay={weather.is_day === 1} />}
          <span className="weather-temperature">{weather ? `${Math.round(weather.temperature_2m)}°` : "--°"}</span>
          {weather && <span className="weather-condition">{getWeatherLabel(weather.weather_code)}</span>}
        </div>
        <div className="intro-bottom">
          <span className="radius-chip"><span>⌖</span> Montréal · 5 km radius</span>
          {refreshedTime && <span className="refresh-time">Updated {refreshedTime}</span>}
        </div>
      </section>

      <section className="results-section" aria-label="Nearby gas prices">
        <div className="results-heading">
          <div>
            <p className="eyebrow">THE BEST AROUND YOU</p>
            <h2>Nearby stations</h2>
          </div>
          <button
            className="sort-button"
            type="button"
            onClick={() => setAscending((current) => !current)}
            aria-label={`Sort by ${ascending ? "highest" : "lowest"} price`}
            title={`Sort by ${ascending ? "highest" : "lowest"} price`}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M8 5v14m0 0-4-4m4 4 4-4M16 19V5m0 0-4 4m4-4 4 4" />
            </svg>
            <span>{ascending ? "Low to high" : "High to low"}</span>
          </button>
        </div>

        {loading && <div className="message-card">Finding nearby prices…</div>}
        {!loading && error && <div className="message-card error">{error}</div>}
        {!loading && !error && stations.length === 0 && (
          <div className="message-card">No stations were found.</div>
        )}

        {sortedStations.length > 0 && (
          <div className="station-list">
            {sortedStations.map((station, index) => (
              <article className="station-card" key={station.stationId}>
                <div className="station-topline">
                  <div className="station-identity">
                    <span className="station-number">{String(index + 1).padStart(2, "0")}</span>
                    <div className="station-title">
                      <h3>{station.name}</h3>
                      <p className="address">{station.address}</p>
                    </div>
                  </div>
                  <div className="price-block">
                    <span className="price">{formatPrice(station.price)}</span>
                    <span className="unit">¢/L</span>
                  </div>
                </div>
                <div className="station-details">
                  <span className="distance"><span aria-hidden="true">⌖</span> {station.distanceKm.toFixed(1)} km away</span>
                  <span className="fuel-label"><i /> Regular</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="app-footer">
        Prices are displayed in Canadian cents per litre.<br />
        Data from the Régie de l’énergie du Québec via Gas Québec.
      </footer>
    </main>
  );
}

export default App;
