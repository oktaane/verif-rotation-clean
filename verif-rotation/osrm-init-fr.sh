#!/bin/sh
set -e

URL="https://download.geofabrik.de/europe/france-latest.osm.pbf"
PBF="/data/france-latest.osm.pbf"
OSRM="/data/france-latest.osrm"

echo "-----------------------------"
echo "[OSRM-FR INIT] Démarrage (MLD)"
echo "-----------------------------"

# 1) Vérifier si le PBF existe déjà
if [ ! -s "$PBF" ]; then
  echo "[OSRM-FR] PBF absent → téléchargement..."
  wget --no-check-certificate -O "$PBF" "$URL"
else
  echo "[OSRM-FR] PBF déjà présent → skip download."
  ls -lh "$PBF"
fi

# 2) Vérifier l'existence du .osrm
if [ ! -f "$OSRM" ]; then
  echo "[OSRM-FR] Extraction osrm-extract..."
  osrm-extract -p /opt/car.lua "$PBF"
else
  echo "[OSRM-FR] Extraction déjà faite → skip."
fi

# 3) Vérifier la présence des fichiers MLD
if [ ! -f "/data/france-latest.osrm.partition" ]; then
  echo "[OSRM-FR] Partition osrm-partition..."
  osrm-partition "$OSRM"
else
  echo "[OSRM-FR] Partition déjà existante → skip."
fi

if [ ! -f "/data/france-latest.osrm.cells" ]; then
  echo "[OSRM-FR] Customisation osrm-customize..."
  osrm-customize "$OSRM"
else
  echo "[OSRM-FR] Customisation déjà existante → skip."
fi

echo "--------------------------------"
echo "[OSRM-FR INIT] Terminé (MLD prêt)"
echo "--------------------------------"