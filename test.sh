#!/bin/bash
set +e

(cd ./services/auth-service && npm run test  -- --bail false)
(cd ./services/podcast-service && npm run test  -- --bail false)
(cd ./services/pool-service && npm run test-unit  -- --bail false)
(cd ./services/pool-service && npm run test  -- --bail false)
(cd ./services/storage-service && npm run test  -- --bail false)
(cd ./services/transcoder-service && npm run test-unit  -- --bail false)
