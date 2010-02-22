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

## GET /packagename


Returns the JSON document for this package. Includes all known dists and metadata. Example:

<pre>
  {"_id":"foo", 
   "name":"foo",
   "description":"A fake package.",
   "dist-tags":{"stable":"0.1"},
   "versions":{"0.1":{"_id":"foo","name":"foo","description":"A fake package", 
                            "dist":{"tarball":"http://domain.com/0.1.tgz"}      
              }
  }
</pre>

<pre>
GET /packagename/0.1
</pre>

Returns the JSON object for a specified release. Example:

<pre>
  {"_id":"foo","name":"foo","description":"A fake package", 
   "dist":{"tarball":"http://domain.com/0.1.tgz"}
</pre>

<pre>
GET /packagename/stable
</pre>



<pre>
PUT /packagename
</pre>
<pre>
PUT /packagename/0.1
</pre>
<pre>
PUT /pacakgename/stable