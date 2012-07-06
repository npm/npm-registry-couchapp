#!/bin/bash

c=${npm_package_config_couch}

if [ "$c" == "" ]; then
  cat >&2 <<-ERR
Please set a valid 'npmjs.org:couch' npm config.

You can put PASSWORD in the setting somewhere to
have it prompt you for a password each time, so
it doesn't get dropped in your config file.

If you have PASSWORD in there, it'll also be read
from the PASSWORD environment variable, so you
can set it in the env and not have to enter it
each time.
ERR
  exit 1
fi

case $c in
  *PASSWORD*)
    if [ "$PASSWORD" == "" ]; then
      echo -n "Password: "
      read -s PASSWORD
    fi
    ;;
  *);;
esac

# echo "couch=$c"

scratch_message () {
  cat <<-EOF

Pushed to scratch ddoc. To make it real, use a COPY request.
Something like this:

curl -u "\$username:\$password" \\
  \$couch/registry/_design/scratch \\
  -X COPY \\
  -H destination:'_design/app?rev=\$rev'

But, before you do that, make sure to fetch the views and give
them time to load, so that real users don't feel the pain of
view generation latency.

EOF
}

c=${c/PASSWORD/$PASSWORD}
c=${c// /%20}
which couchapp
couchapp push registry/shadow.js "$c" && \
couchapp push registry/app.js "$c" && \
couchapp push www/app.js "$c" && \
scratch_message && \
exit 0 || \
( ret=$?
  echo "Failed with code $ret"
  exit $ret )
