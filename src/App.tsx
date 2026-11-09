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

const API_URL =
  "https://square-sky-d093.kskish18.workers.dev/?lat=45.49570&lng=-73.65684&radius=5&fuelType=ordinaire&sort=price";
const CACHE_KEY = "gas-near-me:montreal-prices";

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
        <p className="eyebrow">YOUR NEIGHBOURHOOD, AT A GLANCE</p>
        <h2>Find a better<br />fill-up.</h2>
        <p className="intro-text">
          Regular gas prices at stations within 5 km of central Montreal.
        </p>
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
