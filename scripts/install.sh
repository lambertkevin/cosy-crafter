#!/bin/bash
set +e


(cd ./shared/@cosy/array-to-projection  && rm -rf node_modules && npm i)
(cd ./shared/@cosy/axios-utils  && rm -rf node_modules && npm i)
(cd ./shared/@cosy/hapi-fail-validation-handler  && rm -rf node_modules && npm i)
(cd ./shared/@cosy/json-api-standardize  && rm -rf node_modules && npm i)
(cd ./shared/@cosy/logger  && rm -rf node_modules && npm i)
(cd ./shared/@cosy/rsa-utils  && rm -rf node_modules && npm i)
(cd ./shared/@cosy/schema-utils  && rm -rf node_modules && npm i)
(cd ./shared/@cosy/auth  && rm -rf node_modules && npm i)
(cd ./services/auth-service  && rm -rf node_modules && npm i)
(cd ./services/podcast-service  && rm -rf node_modules && npm i)
(cd ./services/pool-service  && rm -rf node_modules && npm i)
(cd ./services/storage-service  && rm -rf node_modules && npm i)
(cd ./services/transcoder-service  && rm -rf node_modules && npm i)
(cd ./services/gateway-service  && rm -rf node_modules && npm i)
