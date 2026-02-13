#!/bin/sh
set -e

URL="https://download.geofabrik.de/europe/france-latest.osm.pbf"
DEST="/data/france-latest.osm.pbf"

echo "[DOWNLOAD-FR] Téléchargement du PBF France..."
echo "[DOWNLOAD] Destination : $DEST"

wget --no-check-certificate -O "$DEST" "$URL"

echo "[DOWNLOAD] Terminé"
ls -lh "$DEST"