# Install

You'll need CouchDB trunk, we're using some very new features.
<pre>
svn co http://svn.apache.org/repos/asf/couchdb/trunk couchdb
</pre>
or you can pull the git mirror
<pre>
git clone git://github.com/apache/couchdb.git
</pre>

Now compile and install CouchDB http://wiki.apache.org/couchdb/Installation

In your couchdb .ini configuration file add the following lines to the bottom of the config.

<pre>
[vhosts]
domain.com:5984 = /jsregistry/_design/app/_rewrite
</pre>

This assumes you're running CouchDB on post 5984, if you are running CouchDB on port 80 you should omit the port from this directive since it matches on the Host header.

Now create a db named "jsregistry" and then run the sync script.

<pre>
node sync.js
</pre>

# API

### GET /packagename


Returns the JSON document for this package. Includes all known dists and metadata. Example:

<pre>
  {"_id":"foo", 
   "name":"foo",
   "description":"A fake package.",
   "dist-tags":{"stable":"0.1"},
   "versions":{"0.1":{"_id":"foo","name":"foo","description":"A fake package", "version":"0.1",
                            "dist":{"tarball":"http://domain.com/0.1.tgz"}      
              }
  }
</pre>

### GET /packagename/0.1

Returns the JSON object for a specified release. Example:

<pre>
  {"_id":"foo","name":"foo","description":"A fake package", 
   "version":"0.1"
   "dist":{"tarball":"http://domain.com/0.1.tgz"}
</pre>

### GET /packagename/stable

Returns the JSON object for the specified tag.

<pre>
  {"_id":"foo","name":"foo","description":"A fake package", 
   "version":"0.1"
   "dist":{"tarball":"http://domain.com/0.1.tgz"}
</pre>

### PUT /packagename

Create or update the entire package info.

MUST include the JSON body of the entire document. Must have content-type:application/json.

If updating this must include the latest _rev.

This method can also remove previous versions and distributions if necessary.

### PUT /packagename/0.1

Create a new release version. 

MUST include all the metadata from package.json along with dist information as the JSON body of the request. MUST have content-type:application/json

### PUT /pacakgename/stable

Link a distribution tag (ie. "stable") to a specific version string. 

MUST but a JSON string as the body. Example:

<pre>
"0.1"
</pre>

Must have content-type:application/json.
