#!/bin/sh
set -e

URL="https://download.geofabrik.de/europe/france/ile-de-france-latest.osm.pbf"
PBF="/data/idf-latest.osm.pbf"
OSRM="/data/idf-latest.osrm"

echo "-----------------------------"
echo "[OSRM-IDF INIT] Démarrage (CH)"
-------------------------------"

# 1) Vérifier si le PBF existe déjà
if [ ! -s "$PBF" ]; then
  echo "[OSRM-IDF] PBF absent → téléchargement..."
  wget --no-check-certificate -O "$PBF" "$URL"
else
  echo "[OSRM-IDF] PBF déjà présent → skip download."
  ls -lh "$PBF"
fi

# 2) Extraction
if [ ! -f "$OSRM" ]; then
  echo "[OSRM-IDF] Extraction osrm-extract..."
  osrm-extract -p /opt/car.lua "$PBF"
else
  echo "[OSRM-IDF] Extraction déjà faite → skip."
fi

# 3) Contraction CH
if [ ! -f "/data/idf-latest.osrm.hsgr" ]; then
  echo "[OSRM-IDF] Contract osrm-contract..."
  osrm-contract "$OSRM"
else
  echo "[OSRM-IDF] CH déjà fait → skip."
fi

echo "--------------------------------"
echo "[OSRM-IDF INIT] Terminé (CH prêt)"
echo "--------------------------------"