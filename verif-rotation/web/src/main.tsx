import React from "react";
import ReactDOM from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import MapView from "./components/MapView";

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#7c3aed", "#ea580c", "#0d9488"];
function colorForIndex(i: number) {
  return COLORS[i % COLORS.length];
}

function fmtKm(distanceM: unknown) {
  if (typeof distanceM !== "number") return "n/a";
  return `${(distanceM / 1000).toFixed(1)} km`;
}
function fmtMin(durationS: unknown) {
  if (typeof durationS !== "number") return "n/a";
  return `${Math.round(durationS / 60)} min`;
}

function App() {
  const [json, setJson] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  const features: any[] = json?.routes_geojson?.features ?? [];

  const rows = features.map((f, i) => {
    const p = f?.properties ?? {};
    return {
      index: i,
      color: colorForIndex(i),
      from_id: p.from_id ?? "N/A",
      to_id: p.to_id ?? "N/A",
      distance_m: p.distance_m,
      duration_s: p.duration_s,
    };
  });

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="title">Road Trips</div>
          <div className="subtitle">Upload CSV (from_id,to_id) → routes OSRM → visualisation</div>
        </div>

        <label className="upload">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              setErr(null);
              setJson(null);
              setSelectedIndex(null);

              const file = e.target.files?.[0];
              if (!file) return;

              try {
                const form = new FormData();
                form.append("file", file);

                const res = await fetch("http://localhost:4000/imports/trips", {
                  method: "POST",
                  body: form,
                });

                if (!res.ok) throw new Error(`API error ${res.status}`);
                const data = await res.json();
                setJson(data);
              } catch (e: any) {
                setErr(e?.message ?? "Erreur");
              }
            }}
          />
          <span className="uploadBtn">Choisir un CSV</span>
        </label>
      </header>

      {err && <div className="error">{err}</div>}

      <main className="layout">
        {/* Gauche : carte */}
        <section className="panel panelMap">
          <div className="panelHeader">
            <div className="panelTitle">Carte</div>
            <div className="panelMeta">
              {rows.length ? `${rows.length} trajet(s)` : "Aucun trajet"}
            </div>
          </div>
          <div className="panelBody">
            <MapView geojson={json?.routes_geojson ?? null} selectedIndex={selectedIndex} />
          </div>
        </section>

        {/* Droite : tableau */}
        <section className="panel panelTable">
          <div className="panelHeader">
            <div className="panelTitle">Trajets</div>
            <div className="panelMeta">
              Clique une ligne pour mettre en avant un trajet
            </div>
          </div>

          <div className="panelBody tableWrap">
            {!rows.length ? (
              <div className="empty">
                <div className="emptyTitle">Aucun trajet à afficher</div>
                <div className="emptyText">
                  Importe un CSV avec les colonnes <code>from_id</code> et <code>to_id</code>.
                </div>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}></th>
                    <th>Départ</th>
                    <th>Arrivée</th>
                    <th style={{ width: 110 }}>Distance</th>
                    <th style={{ width: 90 }}>Durée</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const active = selectedIndex === r.index;
                    return (
                      <tr
                        key={r.index}
                        className={active ? "rowActive" : ""}
                        onClick={() => setSelectedIndex(active ? null : r.index)}
                        title="Cliquer pour sélectionner"
                      >
                        <td>
                          <span
                            className="swatch"
                            style={{ background: r.color }}
                          />
                        </td>
                        <td className="mono">{r.from_id}</td>
                        <td className="mono">{r.to_id}</td>
                        <td>{fmtKm(r.distance_m)}</td>
                        <td>{fmtMin(r.duration_s)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
