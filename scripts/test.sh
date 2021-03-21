#!/bin/bash
set +e

(cd ./shared/@cosy/array-to-projection && npm run test  -- --bail false)
(cd ./shared/@cosy/axios-utils && npm run test  -- --bail false)
(cd ./shared/@cosy/hapi-fail-validation-handler && npm run test  -- --bail false)
(cd ./shared/@cosy/json-api-standardize && npm run test  -- --bail false)
(cd ./shared/@cosy/logger && npm run test  -- --bail false)
(cd ./services/auth-service && npm run test  -- --bail false --timeout 30000)
(cd ./services/podcast-service && npm run test  -- --bail false --timeout 30000)
(cd ./services/pool-service && npm run test-unit  -- --bail false)
(cd ./services/pool-service && npm run test  -- --bail false --timeout 30000)
(cd ./services/storage-service && npm run test  -- --bail false --timeout 30000)
(cd ./services/transcoder-service && npm run test-unit  -- --bail false)
