#!/bin/bash
set +e

(cd ./services/auth-service && npm run test)
(cd ./services/podcast-service && npm run test)
(cd ./services/pool-service && npm run test-unit)
(cd ./services/pool-service && npm run test)
(cd ./services/storage-service && npm run test)
(cd ./services/transcoder-service && npm run test-unit)
