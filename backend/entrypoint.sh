#!/bin/sh
set -e
# Only the web container migrates (RUN_MIGRATIONS=1). The worker never does,
# so two containers cannot race on the schema.
if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
  python manage.py migrate --noinput
fi
exec "$@"
