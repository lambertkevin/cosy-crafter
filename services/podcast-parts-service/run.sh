#!/bin/bash
set +e

echo $NODE_ENV

if [ "$NODE_ENV" = "development" ]; then
  npm run dev
elif [ "$NODE_ENV" = "production" ]; then
  npm run start
else
  echo 'NODE_ENV incorrect';
fi