#!/bin/bash
set +e

mkdir ./.keys
ssh-keygen -t rsa -b 4096 -C 'auth-service' -f ./.keys/auth -N '' -m pem
openssl rsa -in ./.keys/auth -pubout -out ./.keys/auth.pem
ssh-keygen -t rsa -b 4096 -C 'pool-service' -f ./.keys/pool -N '' -m pem
openssl rsa -in ./.keys/pool -pubout -out ./.keys/pool.pem
