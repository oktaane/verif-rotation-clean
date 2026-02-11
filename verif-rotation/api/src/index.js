import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Papa from "papaparse";
import { request } from "undici";
import fs from "node:fs";

const app = Fastify({ logger: true });

const OSRM_BASE_URL = process.env.OSRM_BASE_URL ?? "http://osrm:5000";
const PORT = Number(process.env.API_PORT ?? 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";
const EMP_REF_PATH = process.env.EMP_REF_PATH ?? "/data/empExportBdd.csv";

await app.register(cors, { origin: CORS_ORIGIN });
await app.register(multipart);

/* -----------------------
   UTILITAIRES
------------------------*/

function normalizeNumberFr(value) {
  if (!value) return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function normalizeId(value) {
  return value ? String(value).trim() : "";
}

function detectDelimiter(sampleText) {
  const line = sampleText.split(/\r?\n/)[0] ?? "";
  return (line.match(/;/g)?.length ?? 0) >= (line.match(/,/g)?.length ?? 0)
    ? ";"
    : ",";
}

/* -----------------------
   OSRM
------------------------*/

async function getOsrmRoute(from_lon, from_lat, to_lon, to_lat) {
  const url =
    `${OSRM_BASE_URL}/route/v1/driving/` +
    `${from_lon},${from_lat};${to_lon},${to_lat}` +
    `?overview=full&geometries=geojson`;

  const res = await request(url);
  if (res.statusCode !== 200) {
    throw new Error(`OSRM HTTP ${res.statusCode}`);
  }

  const data = await res.body.json();
  const route = data?.routes?.[0];
  if (!route?.geometry) {
    throw new Error("OSRM geometry absente");
  }

  return {
    geometry: route.geometry,
    distance: route.distance,
    duration: route.duration,
  };
}

/* -----------------------
   RÉFÉRENTIEL EMP
------------------------*/

let EMP_INDEX = new Map();

function loadEmpRefOrThrow() {
  const raw = fs.readFileSync(EMP_REF_PATH, "utf-8");
  const delimiter = detectDelimiter(raw);

  const parsed = Papa.parse(raw, {
    header: true,
    skipEmptyLines: true,
    delimiter,
  });

  const COL_ID = "Numéro emplacement ETC";
  const COL_LAT = "Latitude";
  const COL_LON = "Longitude";

  for (const r of parsed.data) {
    const id = normalizeId(r[COL_ID]);
    const lat = normalizeNumberFr(r[COL_LAT]);
    const lon = normalizeNumberFr(r[COL_LON]);

    if (id && lat !== null && lon !== null) {
      EMP_INDEX.set(id, { lat, lon });
    }
  }

  app.log.info(`EMP loaded: ${EMP_INDEX.size} points`);
}

/* -----------------------
   ROUTES
------------------------*/

app.get("/health", async () => ({
  ok: true,
  emp_points: EMP_INDEX.size,
}));

app.post("/imports/trips", async (req, reply) => {
  const file = await req.file();
  if (!file) return reply.code(400).send({ error: "CSV manquant" });

  const text = (await file.toBuffer()).toString("utf-8");
  const delimiter = detectDelimiter(text);

  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    delimiter,
  });

  const rows = parsed.data ?? [];
  const ok = [];
  const errors = [];

  let idx = 0;
  for (const r of rows) {
    idx++;
    const from_id = normalizeId(r.from_id);
    const to_id = normalizeId(r.to_id);

    const from = EMP_INDEX.get(from_id);
    const to = EMP_INDEX.get(to_id);

    if (!from || !to) {
      errors.push({ row: idx, from_id, to_id });
      continue;
    }

    ok.push({
      row: idx,
      from_id,
      to_id,
      from_lon: from.lon,
      from_lat: from.lat,
      to_lon: to.lon,
      to_lat: to.lat,
    });
  }

  /* -----------------------
     OSRM → GEOJSON
  ------------------------*/

  const features = [];

  for (const t of ok) {
    try {
      const r = await getOsrmRoute(
        t.from_lon,
        t.from_lat,
        t.to_lon,
        t.to_lat
      );

      features.push({
        type: "Feature",
        geometry: r.geometry,
        properties: {
          from_id: t.from_id,
          to_id: t.to_id,
          distance_m: r.distance,
          duration_s: r.duration,
        },
      });
    } catch (e) {
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [t.from_lon, t.from_lat],
            [t.to_lon, t.to_lat],
          ],
        },
        properties: {
          from_id: t.from_id,
          to_id: t.to_id,
          error: String(e),
        },
      });
    }
  }

  return {
    stats: { total: rows.length, ok: ok.length, errors: errors.length },
    errors,
    routes_geojson: {
      type: "FeatureCollection",
      features,
    },
  };
});

/* -----------------------
   BOOT
------------------------*/

loadEmpRefOrThrow();

app.listen({ host: "0.0.0.0", port: PORT });
