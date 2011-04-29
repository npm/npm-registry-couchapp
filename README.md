# Project layout

registry/ is the JSON API for the package registry.

www/ is the code for search.npmjs.org, eventually maybe www.npmjs.org

# Installing

You'll need CouchDB version 1.0.0 or higher.  We're using some newish features.
I recommend getting one from http://iriscouch.com/

Now install couchapp:

    sudo npm install couchapp -g

Sync the registry and search:

    couchapp push registry/app.js http://localhost:5984/registry
    couchapp push www/app.js http://localhost:5984/search

You may need to put a username and password in the URL:

    couchapp push www/app.js http://user:pass@localhost:5984/search
    couchapp push registry/app.js http://user:pass@localhost:5984/registry

# Optional: top-of-host urls

With the setup so far, you can point the npm client at the registry by
putting this in your ~/.npmrc file:

    registry = http://localhost:5984/registry/_design/app/_rewrite

To be snazzier, add a vhost config:

    [vhosts]
    registry.mydomain.com:5984 = /registry/_design/app/_rewrite
    search.mydomain.com:5984 = /search/_design/app/_rewrite


Where `registry.mydomain.com` and `search.mydomain.com` are
the hostnames where you're running the thing, and `5984` is the
port that CouchDB is running on. If you're running on port 80,
then omit the port altogether.

# API

### GET /packagename

Returns the JSON document for this package. Includes all known dists
and metadata. Example:

    {
      "name": "foo",
      "dist-tags": { "latest": "0.1.2" },
      "_id": "foo",
      "versions": {
        "0.1.2": {
          "name": "foo",
          "_id": "foo",
          "version": "0.1.2",
          "dist": { "tarball": "http:\/\/domain.com\/0.1.tgz" },
          "description": "A fake package"
        }
      },
      "description": "A fake package."
    }

### GET /packagename/0.1.2

Returns the JSON object for a specified release. Example:

    {
      "name": "foo",
      "_id": "foo",
      "version": "0.1.2",
      "dist": { "tarball": "http:\/\/domain.com\/0.1.tgz" },
      "description": "A fake package"
    }

### GET /packagename/latest

Returns the JSON object for the specified tag.

    {
      "name": "foo",
      "_id": "foo",
      "version": "0.1.2",
      "dist": { "tarball": "http:\/\/domain.com\/0.1.tgz" },
      "description": "A fake package"
    }

### PUT /packagename

Create or update the entire package info.

MUST include the JSON body of the entire document. Must have
`content-type:application/json`.

If updating this must include the latest _rev.

This method can also remove previous versions and distributions if necessary.

### PUT /packagename/0.1.2

Create a new release version. 

MUST include all the metadata from package.json along with dist information
as the JSON body of the request. MUST have `content-type:application/json`

### PUT /pacakgename/latest

Link a distribution tag (ie. "latest") to a specific version string.

MUST be a JSON string as the body. Example:

    "0.1.2"

Must have `content-type:application/json`.
