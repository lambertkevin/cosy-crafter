echo 'MONGO DATABASE INITIALIZED'

mongo -- "$MONGO_INITDB_DATABASE" <<EOF
    var rootUser = '$MONGO_INITDB_ROOT_USERNAME';
    var rootPassword = '$MONGO_INITDB_ROOT_PASSWORD';
    var admin = db.getSiblingDB('admin');
    admin.auth(rootUser, rootPassword);

    var podcastPartsUser = '$PODCAST_PARTS_DB_USER';
    var podcastPartsPwd = '$PODCAST_PARTS_DB_PASSWORD';
    var podcastPartsDb = '$PODCAST_PARTS_DB_NAME'
    use $PODCAST_PARTS_DB_NAME;
    db.createUser({user: podcastPartsUser, pwd: podcastPartsPwd, roles:[{role: "readWrite", db: podcastPartsDb}]})
EOF