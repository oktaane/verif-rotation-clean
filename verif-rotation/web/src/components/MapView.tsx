import { useEffect, useRef } from "react";
import L from "leaflet";

type Props = {
  geojson: any | null;
  selectedIndex?: number | null;
};

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#7c3aed", "#ea580c", "#0d9488"];
function colorForIndex(i: number) {
  return COLORS[i % COLORS.length];
}

export default function MapView({ geojson, selectedIndex }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routesGroupRef = useRef<L.FeatureGroup | null>(null);

  const startIcon = L.divIcon({
    className: "marker-start",
    html: "🟢",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  const endIcon = L.divIcon({
    className: "marker-end",
    html: "🔴",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  // Init map (1 fois)
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: true }).setView(
      [46.6, 2.2],
      6
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    routesGroupRef.current = L.featureGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      routesGroupRef.current = null;
    };
  }, []);

  // Update geojson / selection
  useEffect(() => {
    const map = mapRef.current;
    const group = routesGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const features: any[] = geojson?.features ?? [];
    if (!features.length) return;

    features.forEach((feature: any, index: number) => {
      const color = colorForIndex(index);
      const isSelected = selectedIndex === index;

      const routeLayer = L.geoJSON(feature, {
        style: {
          color,
          weight: isSelected ? 7 : 4,
          opacity: isSelected ? 1 : 0.85,
        },
      }).addTo(group);

      // Hover highlight (si pas sélectionné)
      routeLayer.on("mouseover", () => {
        if (selectedIndex !== null && selectedIndex !== undefined) return;
        (routeLayer as any).setStyle?.({ weight: 7, opacity: 1 });
      });
      routeLayer.on("mouseout", () => {
        if (selectedIndex !== null && selectedIndex !== undefined) return;
        (routeLayer as any).setStyle?.({ weight: 4, opacity: 0.85 });
      });

      const p = feature?.properties ?? {};
      const fromId = p.from_id ?? "N/A";
      const toId = p.to_id ?? "N/A";
      const distanceM = p.distance_m;
      const durationS = p.duration_s;

      const distanceKm =
        typeof distanceM === "number" ? (distanceM / 1000).toFixed(1) : null;
      const durationMin =
        typeof durationS === "number" ? Math.round(durationS / 60) : null;

      routeLayer.bindPopup(
        `
        <strong>Trajet ${index + 1}</strong><br/>
        ${fromId} → ${toId}<br/>
        ${distanceKm ? `${distanceKm} km` : "distance n/a"} – ${
          durationMin !== null ? `${durationMin} min` : "durée n/a"
        }
        `,
        { closeButton: true }
      );

      // Start/End markers depuis LineString
      const geom = feature?.geometry;
      const coords = geom?.coordinates;

      if (geom?.type === "LineString" && Array.isArray(coords) && coords.length >= 2) {
        const start = coords[0]; // [lon, lat]
        const end = coords[coords.length - 1];

        const startMarker = L.marker([start[1], start[0]], { icon: startIcon }).addTo(group);
        startMarker.bindTooltip("Départ", { direction: "top" });
        startMarker.bindPopup(`<strong>Départ</strong><br/>${fromId}`);

        const endMarker = L.marker([end[1], end[0]], { icon: endIcon }).addTo(group);
        endMarker.bindTooltip("Arrivée", { direction: "top" });
        endMarker.bindPopup(`<strong>Arrivée</strong><br/>${toId}`);
      }
    });

    const bounds = group.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [geojson, selectedIndex]);

  return (
    <div
      ref={containerRef}
      style={{
        height: "450px",
        width: "100%",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    />
  );
}
