# Project layout

registry/ is the JSON API for the package registry.

www/ is the code for search.npmjs.org, soon to be www.npmjs.org

# Installing www

You'll need CouchDB version 1.0.0 or higher.  We're using some newish features.
I recommend getting one from http://couchone.com/

Add a vhost config:

    [vhosts]
    search:5984 = /search/_design/app/_rewrite

Where `packages` is the hostname where you'll be running the thing, and `5984` is the port that CouchDB is running on.  If you're running on port 80, then omit the port altogether.

Now install couchapp:

    npm install couchapp

Now run the sync app.js from this repository.

    couchapp --design www/app.js --sync --couch http://localhost:5984/search

You may need to put a username and password in the URL:

    couchapp --design www/app.js --sync --couch http://user:pass@localhost:5984/search

# Installing registry

You'll need CouchDB version 1.0.0 or higher.  We're using some newish features.
I recommend getting one from http://couchone.com/

Add a vhost config:

    [vhosts]
    packages:5984 = /jsregistry/_design/app/_rewrite

Where `packages` is the hostname where you'll be running the thing, and `5984` is the port that CouchDB is running on.  If you're running on port 80, then omit the port altogether.

Now install couchapp:

    npm install couchapp

Now run the sync app.js from this repository.

    couchapp --design registry/app.js --sync --couch http://localhost:5984/jsregistry

You may need to put a username and password in the URL:

    couchapp --design registry/app.js --sync --couch http://user:pass@localhost:5984/jsregistry

# API

### GET /packagename

Returns the JSON document for this package. Includes all known dists and metadata. Example:

    {
      "name": "foo",
      "dist-tags": { "stable": "0.1" },
      "_id": "foo",
      "versions": {
        "0.1": {
          "name": "foo",
          "_id": "foo",
          "version": "0.1",
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

### GET /packagename/stable

Returns the JSON object for the specified tag.

    {
      "name": "foo",
      "_id": "foo",
      "version": "0.1",
      "dist": { "tarball": "http:\/\/domain.com\/0.1.tgz" },
      "description": "A fake package"
    }

### PUT /packagename

Create or update the entire package info.

MUST include the JSON body of the entire document. Must have `content-type:application/json`.

If updating this must include the latest _rev.

This method can also remove previous versions and distributions if necessary.

### PUT /packagename/0.1.2

Create a new release version. 

MUST include all the metadata from package.json along with dist information as the JSON body of the request. MUST have `content-type:application/json`

### PUT /pacakgename/stable

Link a distribution tag (ie. "stable") to a specific version string. 

MUST but a JSON string as the body. Example:

    "0.1.2"

Must have `content-type:application/json`.
