#!/usr/bin/env bash
set -e

DB_CONTAINER="cattlecoin-db"
DB_USER="cattlecoin"
DB_NAME="cattlecoin"

MIGRATIONS_DIR="./migrations"

for file in "$MIGRATIONS_DIR"/*.sql; do
  [ -f "$file" ] || continue
  echo "Applying $(basename "$file")..."
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$file"
done

echo "✅ Done. All migrations applied."