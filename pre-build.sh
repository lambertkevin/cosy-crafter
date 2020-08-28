#!/bin/bash
set +e

mkdir ./.keys
ssh-keygen -t rsa -b 4096 -C 'auth-service' -f ./.keys/auth -N '' -m pem
ssh-keygen -f ./.keys/auth.pub -e -m pem > ./.keys/auth.pem
