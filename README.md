## Project layout

registry/ is the JSON API for the package registry.

www/ is the code for search.npmjs.org, eventually maybe www.npmjs.org

## Installing

**1)** Install CouchDB, version 1.2 or later, preferably at least version 1.4.

**2)** Update your CouchDB local.ini and make sure the following option is set:

```
[httpd]
secure_rewrites = false
```

You will need to restart CouchDB after changing these options.

**3)** Create a new database:

```
curl -X PUT http://localhost:5984/registry
```

You should receive the following answer from CouchDB:

```
{"ok":true}
```

**4)** Clone the *npmjs.org* repository if you haven't already, and cd into it:

```
git clone https://github.com/rvagg/npmjs.org.git
cd npmjs.org
git checkout new-install-docs
```

*NOTE: should be `git clone https://github.com/isaacs/npmjs.org.git` / master, will change if/when this is merged.*

**5)** Install the package dependencies; couchapp, semver and jsontool:

```
npm install
```

**6)** Set your internal `npm_package_config_couch` variable so it's available to `npm run` scripts:

```
npm config set _npmjs.org:couch=http://localhost:5984/registry
```

If you have set CouchDB up with an admin login you will need to change the URLs `http://user:pass@localhost:5984/registry`.

**7)** Sync the registry scratch design docs:

```
npm start
```

**8)** Load the views from CouchDB to make them active:

```
npm run load
```

**9)** Copy the scratch design docs to the active *app* to make them live:

```
npm run copy
```

If you get an error when publishing a package a second time, you may need to add the `'error: forbidden'` doc:

```sh
$ curl -X PUT http://localhost:5984/registry/error%3A%20forbidden2 \
    -d '{ "_id": "error: forbidden",
    "forbidden":"must supply latest _rev to update existing package" }'
```

**Note** at some point you should *fix admin party mode* on CouchDB, this can be done through Futon at <http://localhost:5984/_utils/> and will create a user entry at the bottom of /etc/couchdb/local.ini for future logins via Futon and with CURL to the CouchDB API.

If you have an admin account set up then your CouchDB calls (above) should be made to <http://USER:PASS@localhost:5984/>.

## Using a private registry

If you intend to use CouchDB as a private registry, perhaps as a private back-end to a proxy package such as [Kappa](https://github.com/paypal/kappa), you will likely need the ability to create, read, authenticate and edit user accounts. To do this you will need to expose the users database. Put this at the bottom of your /etc/couchdb/local.ini configuration file:

```
[couch_httpd_auth]
public_fields = appdotnet, avatar, avatarMedium, avatarLarge, date, email, fields, freenode, fullname, github, homepage, name, roles, twitter, type, _id, _rev
users_db_public = true
```

(be sure to use the "app" registry end-point for this rather than "ghost" or "scratch", see below).

## Synchronizing with the public npm registry

If you wish to make a complete copy of the npm registry. You may either replicate against the **Full-Fat** registry ([source](https://github.com/npm/npm-fullfat-registry)) or the **Skim** registry ([source](https://github.com/npm/npm-skim-registry)).

The Full-Fat registry contains package tarballs along with the package metadata *within* the same CouchDB and is very large and will take some time for an initial replication.

The Skim registry contains just the metadata with the tarballs being fetched from Fastly/Manta by npm clients. This is much quicker to replicate and requires less system resources but you will still be relying on the public infrastructure to fetch package tarballs.

To replicate, use the internal CouchDB *_replicator* database that is more robust than the old replication mechanism. Full details about how this works can be found here: https://gist.github.com/fdmanana/832610

To start replication, simply create a new replication task in the *_replicator* database:

```
curl -X PUT -H "Content-Type:application/json" \
    http://localhost:5984/_replicator/npm -d \
    '{"_id":"npm","source":"https://fullfatdb.npmjs.com/registry",
    "target":"registry","continuous":true,
    "user_ctx":{"name":"USERNAME","roles":["_admin"]}}'
```

Replace **USERNAME** with a CouchDB admin username and replace the **"source"** with *"https://skimdb.npmjs.com/registry"* if you want to replicate from the Skim registry rather than the Full-Fat registry.

This replication task will start immediately and will restart when your server is restarted.

### Note about replication failures

CouchDB replication can fail for a number of reasons. Most commonly, timeouts in fetching data from the public registry can cause replication to halt. CouchDB will retry a number of times but if unsuccessful it won't continue to replicate. The easiest way to restart replication is to restart the CouchDB server but you can also edit the the *_replicator/npm* document and remove the `"replicationstate"` field to restart replication without restarting CouchDB.

Consider increasing timeouts and retry maximums in the CouchDB configuration files to minimise failures caused by transient network problems.

## Using the registry with the npm client

You can point the npm client at the registry by putting this in your ~/.npmrc file:

```
registry = http://localhost:5984/registry/_design/app/_rewrite
```

You can also set the npm registry config property like:

```
npm config set registry http://localhost:5984/registry/_design/app/_rewrite
```

Or you can simple override the registry config on each call:

```
npm --registry http://localhost:5984/registry/_design/app/_rewrite install <package>
```

Consider using [npmrc](https://github.com/deoxxa/npmrc) for easy *.npmrc* switching when using multiple registries.

## Optional: top-of-host urls

To be snazzier, add a vhost config:

```
[vhosts]
registry.mydomain.com:5984 = /registry/_design/app/_rewrite
search.mydomain.com:5984 = /registry/_design/ui/_rewrite
```

Where `registry.mydomain.com` and `search.mydomain.com` are
the hostnames where you're running the thing, and `5984` is the
port that CouchDB is running on. If you're running on port 80,
then omit the port altogether.

Then for example you can reference the repository like so:

```
npm config set registry http://registry.mydomain.com:5984
```

## API

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

### PUT /packagename/latest

Link a distribution tag (ie. "latest") to a specific version string.

MUST be a JSON string as the body. Example:

    "0.1.2"

Must have `content-type:application/json`.
