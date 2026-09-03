import { useEffect, useState } from "react";
import "./App.css";

const API_URL =
  "https://www.gasquebec.ca/api/stations/nearby?lat=45.49570&lng=-73.65684&radius=5&fuelType=ordinaire&sort=price";

function formatPrice(price) {
  return typeof price === "number" ? price.toFixed(1) : "--";
}

function App() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStations() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const data = await response.json();
        setStations(data.stations || []);
      } catch (err) {
        setError("Unable to load gas stations right now.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadStations();
  }, []);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">⛽</span>
          <div>
            <h1>Gas Near Me</h1>
            <p>Montreal fuel prices</p>
          </div>
        </div>
        <span className="updated-label">Updated on load</span>
      </header>

      <section className="intro-card">
        <p className="eyebrow">NEARBY STATIONS</p>
        <h2>Gas prices near you</h2>
        <p className="intro-text">
          Regular gasoline prices within 5 km of your selected Montreal location.
        </p>
      </section>

      {loading && <div className="message-card">Loading nearby stations...</div>}

      {!loading && error && <div className="message-card error">{error}</div>}

      {!loading && !error && stations.length === 0 && (
        <div className="message-card">No stations were found.</div>
      )}

      {!loading && !error && stations.length > 0 && (
        <section className="station-list" aria-label="Nearby gas stations">
          {stations.map((station, index) => (
            <article className="station-card" key={station.stationId}>
              <div className="station-topline">
                <div>
                  <p className="station-number">STATION {index + 1}</p>
                  <h3>{station.name}</h3>
                </div>
                <div className="price-block">
                  <span className="price">{formatPrice(station.price)}</span>
                  <span className="unit">¢/L</span>
                </div>
              </div>

              <p className="address">{station.address}</p>

              <div className="station-details">
                <span>📍 {station.distanceKm.toFixed(1)} km away</span>
                <span>Regular</span>
              </div>
            </article>
          ))}
        </section>
      )}

      <footer className="app-footer">
        Prices are displayed in Canadian cents per litre.
        <br />
        Data source: Régie de l'énergie du Québec via Gas Quebec.
      </footer>
    </main>
  );
}

export default App;
