#!/bin/bash
set +e

./scripts/db_check.sh

echo "Environnement: ${NODE_ENV:-unknown}"

if [ "$NODE_ENV" = "development" ]; then
  npm run dev
elif [ "$NODE_ENV" = "production" ]; then
  npm run start
else
  echo 'NODE_ENV not set.';
fi
