#!/bin/bash
set +e

(cd ./services/auth-service && rm -rf node_modules && npm i)
(cd ./services/podcast-service && rm -rf node_modules && npm i)
(cd ./services/pool-service && rm -rf node_modules && npm i)
(cd ./services/storage-service && rm -rf node_modules && npm i)
(cd ./services/transcoder-service && rm -rf node_modules && npm i)
