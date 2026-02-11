#!/bin/sh
set -eu

PBF="/data/idf-latest.osm.pbf"
OSRM="/data/idf-latest.osrm"

echo "[OSRM-INIT] Start"
echo "[OSRM-INIT] Using PBF: $PBF"

# Vérification stricte du PBF
if [ ! -s "$PBF" ]; then
  echo "[OSRM-INIT] ERROR: PBF missing or empty: $PBF"
  exit 1
fi

# -------------------------
# EXTRACT
# -------------------------
if [ ! -f "$OSRM" ]; then
  echo "[OSRM-INIT] osrm-extract..."
  osrm-extract -p /opt/car.lua "$PBF"
else
  echo "[OSRM-INIT] OSRM already extracted, skipping."
fi

# -------------------------
# CONTRACT (CH)
# -------------------------
if [ ! -f "/data/idf-latest.osrm.hsgr" ]; then
  echo "[OSRM-INIT] osrm-contract (CH)..."
  osrm-contract "$OSRM"
else
  echo "[OSRM-INIT] contract already done, skipping."
fi

echo "[OSRM-INIT] Done (CH ready)"
