#!/bin/bash
set +e

if test -f ./.initialized;
then
    echo 'DB ALREADY INITIALIZED'
else
    echo 'AUTH DB INITIALIZING'

    if ! command -v mongo &> /dev/null
    then
        curl https://repo.mongodb.org/apt/debian/dists/stretch/mongodb-org/4.4/main/binary-amd64/mongodb-org-shell_4.4.0_amd64.deb -o mongo.deb
        dpkg -i mongo.deb
        rm mongo.deb
    fi

    mongo --host $MONGO_SERVICE_NAME --port $MONGO_SERVICE_PORT --username $MONGO_INITDB_ROOT_USERNAME --password $MONGO_INITDB_ROOT_PASSWORD <<EOF
        use $AUTH_DB_NAME

        var authDbName = '$AUTH_DB_NAME';
        var authDbUser = '$AUTH_DB_USER';
        var authDbPwd = '$AUTH_DB_PASSWORD';
        if (!db.getMongo().getDBNames().includes('$AUTH_DB_NAME') || !db.system.users.find({user: authDbUser}).count()){
            db.createUser({user: authDbUser, pwd: authDbPwd, roles:[{role: "readWrite", db: authDbName}]})
        }
EOF
        echo 'AUTH DB INITIALIZED'
        touch .initialized
fi
