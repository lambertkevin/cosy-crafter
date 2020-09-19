#!/bin/bash
set +e

mkdir ./.keys
ssh-keygen -t rsa -b 4096 -C 'auth-service' -f ./.keys/auth -N '' -m pem
ssh-keygen -f ./.keys/auth.pub -e -m pem > ./.keys/auth.pem
ssh-keygen -t rsa -b 4096 -C 'pool-service' -f ./.keys/pool -N '' -m pem
ssh-keygen -f ./.keys/pool.pub -e -m pem > ./.keys/pool.pem
