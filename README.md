# Project layout

registry/ is the JSON API for the package registry.

www/ is the code for search.npmjs.org, eventually maybe www.npmjs.org

# Installing

You'll need CouchDB version 1.0.2 or higher.  We're using some newish features.
I recommend getting one from http://iriscouch.com/

Once you have CouchDB installed, create two new databases:

		registry
		search

Clone the repository if you haven't already, and cd into it:

		git clone https://github.com/isaacs/npmjs.org.git
		cd npmjs.org

Now install couchapp:

    sudo npm install couchapp -g

Sync the registry and search:

    couchapp push registry/app.js http://localhost:5984/registry
    couchapp push www/app.js http://localhost:5984/search

You may need to put a username and password in the URL:

    couchapp push www/app.js http://user:pass@localhost:5984/search
    couchapp push registry/app.js http://user:pass@localhost:5984/registry

To synchronize from the public NPM registry to your private registry, create a replication
task from http://isaacs.couchone.com/registry --> local database registry. This can be done
through the CouchBase administrative UI or via an HTTP call to '/_replicate like so:

		curl -X POST -H "Content-Type:application/json" \
		    http://localhost:5984/_replicate -d \
		    '{"source":"http://isaacs.couchone.com/registry/", "target":"registry"}'

To run the search app, you will also want to create a synchronization task between
local database: registry --> local database: search

		curl -X POST -H "Content-Type:application/json" \
				http://localhost:5984/_replicate -d  \
				'{"source":"registry", "target":"search"}'

# Using the registry with the npm client

With the setup so far, you can point the npm client at the registry by
putting this in your ~/.npmrc file:

    registry = http://localhost:5984/registry/_design/app/_rewrite

You can also set the NPM registry config property like:

		npm config set registry http://localhost:5984/registry/_design/app/_rewrite

Or you can simple override the registry config on each call:

		npm --registry http://localhost:5984/registry/_design/app/_rewrite install <package>

# Optional: top-of-host urls

To be snazzier, add a vhost config:

    [vhosts]
    registry.mydomain.com:5984 = /registry/_design/app/_rewrite
    search.mydomain.com:5984 = /search/_design/ui/_rewrite


Where `registry.mydomain.com` and `search.mydomain.com` are
the hostnames where you're running the thing, and `5984` is the
port that CouchDB is running on. If you're running on port 80,
then omit the port altogether.

Then for example you can reference the repository like so:

		npm config set registry http://registry.mydomain.com:5984

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
