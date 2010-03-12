# Install

You'll need CouchDB trunk, we're using some very new features.  The git mirror is linked in as a submodule.  You can get it like this:

    git submodule init
    git submodule update

and then `cd deps/couchdb` and do the `./bootstrap && ./configure && make && sudo make install` dance.  More information, including how to install the dependencies, available [on the CouchDB wiki](http://wiki.apache.org/couchdb/Installation).

If you already have couch installed via MacPorts or apt-get or Homebrew, you'll probably need to remove it first.

Create a file called `jsregistry.ini` (or anything .ini, really) and put this in it:
    
    [vhosts]
    packages:5984 = /jsregistry/_design/app/_rewrite

Where `packages` is the hostname where you'll be running the thing, and `5984` is the port that CouchDB is running on.  If you're running on port 80, then omit the port altogether.

Then drop this file in your `/etc/couchdb/local.d` folder.  (If you're using Homebrew or MacPorts, this may be found underneath the package system prefix, either `/usr/local` or `/opt/local`, respectively.)

Now Install use npm to install couchapp.

    git clone git@github.com:mikeal/node.couchapp.js.git
    cd node.couchapp.js
    npm install .
    npm activate couchapp 0.2.0

Now run the sync app.js from this repository.

    couchapp --design app.js --sync --couch http://localhost:5984/jsregistry

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

### GET /packagename/0.1

Returns the JSON object for a specified release. Example:

    {
      "name": "foo",
      "_id": "foo",
      "version": "0.1",
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

### PUT /packagename/0.1

Create a new release version. 

MUST include all the metadata from package.json along with dist information as the JSON body of the request. MUST have `content-type:application/json`

### PUT /pacakgename/stable

Link a distribution tag (ie. "stable") to a specific version string. 

MUST but a JSON string as the body. Example:

    "0.1"

Must have `content-type:application/json`.
