#!/bin/bash
set +e

(cd ./services/auth-service && npm run test  -- --bail false --timeout 30000)
(cd ./services/podcast-service && npm run test  -- --bail false --timeout 30000)
(cd ./services/pool-service && npm run test-unit  -- --bail false --timeout 30000)
(cd ./services/pool-service && npm run test  -- --bail false --timeout 30000)
(cd ./services/storage-service && npm run test  -- --bail false --timeout 30000)
(cd ./services/transcoder-service && npm run test-unit  -- --bail false --timeout 30000)
