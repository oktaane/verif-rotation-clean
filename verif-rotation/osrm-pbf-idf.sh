#!/bin/sh
set -e

URL="https://download.geofabrik.de/europe/france/ile-de-france-latest.osm.pbf"
DEST="/data/idf-latest.osm.pbf"

echo "[DOWNLOAD-IDF] Téléchargement du PBF Île-de-France..."
echo "[DOWNLOAD] Destination : $DEST"

wget --no-check-certificate -O "$DEST" "$URL"

echo "[DOWNLOAD] Terminé"
ls -lh "$DEST"