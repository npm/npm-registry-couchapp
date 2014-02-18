var updates = exports

updates.delete = function (doc, req) {
  if (req.method !== "DELETE")
    return [ { _id: ".error.", forbidden: "Method not allowed" },
             { error: "method not allowed" } ]

  require("monkeypatch").patch(Object, Date, Array, String)
  var t = doc.time || {}
  t.unpublished = {
    name: req.userCtx.name,
    time: new Date().toISOString()
  }
  return [ {
    _id: doc._id,
    _rev: doc._rev,
    name: doc._id,
    time: t
  }, JSON.stringify({ ok: "deleted" }) ]
}

updates.package = function (doc, req) {
  require("monkeypatch").patch(Object, Date, Array, String)

  var d
  if (typeof console === 'object')
    d = console.error
  else
    d = function() {}

  var semver = require("semver")
  var valid = require("valid")
  function error (reason) {
    return [{_id: ".error.", forbidden:reason}, JSON.stringify({forbidden:reason})]
  }

  function latestCopy(doc) {
    d('latestCopy', doc['dist-tags'])

    if (!doc['dist-tags'] || !doc.versions)
      return

    // Make sure that these are copied from the "latest" version, not
    // some other random old thing.
    var copyFields = [
      "description",
      "homepage",
      "keywords",
      "repository",
      "contributors",
      "author",
      "bugs",
      "license"
    ]

    var latest = doc.versions && doc.versions[doc["dist-tags"].latest]
    if (latest && typeof latest === "object") {
      copyFields.forEach(function(k) {
        if (!latest[k])
          delete doc[k]
        else
          doc[k] = latest[k]
      })
    }
  }

  function ok (doc, message) {
    delete doc.mtime
    delete doc.ctime
    var time = doc.time = doc.time || {}
    time.modified = (new Date()).toISOString()
    time.created = time.created || time.modified
    for (var v in doc.versions) {
      var ver = doc.versions[v]
      delete ver.ctime
      delete ver.mtime
      time[v] = time[v] || (new Date()).toISOString()
    }
    readmeTrim(doc)
    latestCopy(doc)
    return [doc, JSON.stringify({ok:message})]
  }

  var README_MAXLEN = 64 * 1024

  function readmeTrim(doc) {
    var changed = false
    var readme = doc.readme || ''
    var readmeFilename = doc.readmeFilename || ''
    if (doc['dist-tags'] && doc['dist-tags'].latest) {
      var latest = doc.versions[doc['dist-tags'].latest]
      if (latest && latest.readme) {
        readme = latest.readme
        readmeFilename = latest.readmeFilename || ''
      }
    }

    for (var v in doc.versions) {
      // If we still don't have one, just take the first one.
      if (doc.versions[v].readme && !readme)
        readme = doc.versions[v].readme
      if (doc.versions[v].readmeFilename && !readmeFilename)
        readmeFilename = doc.versions[v].readmeFilename

      if (doc.versions[v].readme)
        changed = true

      delete doc.versions[v].readme
      delete doc.versions[v].readmeFilename
    }

    if (readme && readme.length > README_MAXLEN) {
      changed = true
      readme = readme.slice(0, README_MAXLEN)
    }
    doc.readme = readme
    doc.readmeFilename = readmeFilename

    return changed
  }

  if (doc) {
    if (req.query.version) {
      var parsed = semver.valid(req.query.version, true)
      if (!parsed) {
        // it's a tag.
        var tag = req.query.version
          , ver = JSON.parse(req.body)
        if (!semver.valid(ver)) {
          return error("setting tag "+tag+" to invalid version: "+req.body)
        }
        doc["dist-tags"][tag] = semver.clean(ver, true)
        return ok(doc, "updated tag")
      }
      // adding a new version.
      var ver = req.query.version
      if (!semver.valid(ver, true)) {
        return error("invalid version: "+ver)
      }

      if (doc.versions) {
        if ((ver in doc.versions) || (semver.clean(ver, true) in doc.versions)) {
          // attempting to overwrite an existing version.
          // not allowed
          return error("cannot modify existing version")
        }
      }

      var body = JSON.parse(req.body)
      if (!valid.name(body.name)) {
        return error( "Invalid name: "+JSON.stringify(body.name))
      }
      body.version = semver.clean(body.version, true)
      ver = semver.clean(ver, true)
      if (body.version !== ver) {
        return error( "version in doc doesn't match version in request: "
                    + JSON.stringify(body.version)
                    + " !== " + JSON.stringify(ver) )
      }
      body._id = body.name + "@" + body.version
      if (body.description) doc.description = body.description
      if (body.author) doc.author = body.author
      if (body.repository) doc.repository = body.repository
      body.maintainers = doc.maintainers

      if (body.publishConfig && typeof body.publishConfig === 'object') {
        Object.keys(body.publishConfig).filter(function (k) {
          return k.match(/^_/)
        }).forEach(function (k) {
          delete body.publishConfig[k]
        })
      }

      var tag = req.query.tag
              || (body.publishConfig && body.publishConfig.tag)
              || body.tag
              || "latest"

      if (!req.query.pre)
        doc["dist-tags"][tag] = body.version
      if (!doc["dist-tags"].latest)
        doc["dist-tags"].latest = body.version
      doc.versions[ver] = body
      doc.time = doc.time || {}
      doc.time[ver] = (new Date()).toISOString()
      return ok(doc, "added version")
    }

    // update the package info
    var newdoc = JSON.parse(req.body)
      , changed = false

    if (doc.time && doc.time.unpublished) {
      delete doc.time.unpublished
      newdoc._rev = doc._rev
    }

    if (doc._rev && doc._rev !== newdoc._rev) {
      return [newdoc, JSON.stringify({error:'409 should happen now'})]
    }

    for (var i in newdoc) if (typeof newdoc[i] === "string" || i === "maintainers") {
      doc[i] = newdoc[i]
    }

    if (newdoc.versions) {
      if (!doc.versions) doc.versions = {}
      // Make sure that we record the maintainers list on the new version
      for (var v in newdoc.versions) {
        if (!doc.versions[v]) {
          var vc = semver.clean(v, true)
          if (!vc)
            return error('Invalid version: ' + v)
          doc.versions[vc] = newdoc.versions[v]
          doc.versions[vc].version = vc
          doc.versions[vc].maintainers = doc.maintainers
          doc.time[vc] = new Date().toISOString()
        } else if (newdoc.versions[v].deprecated) {
          doc.versions[v].deprecated = newdoc.versions[v].deprecated
        }
      }
      for (var v in doc.versions) {
        if (!newdoc.versions[v])
          delete doc.versions[v]
      }
    }

    if (newdoc["dist-tags"]) {
      doc["dist-tags"] = newdoc["dist-tags"]
    }

    if (newdoc.users) {
      if (!doc.users) doc.users = {}
      if (newdoc.users[req.userCtx.name])
        doc.users[req.userCtx.name] = newdoc.users[req.userCtx.name]
      else
        delete doc.users[req.userCtx.name]
    }

    if (newdoc._attachments) {
      if (!doc._attachments) doc._attachments = {}
      var inline = false
      for(var k in newdoc._attachments) {
        if(newdoc._attachments[k].data) {
          doc._attachments[k] = newdoc._attachments[k]
          inline = true
        }
      }
      if (inline)
        return ok(doc, "updated package metadata & attachments")
    }

    return ok(doc, "updated package metadata")
  } else {
    // Create new package doc
    doc = JSON.parse(req.body)
    if (!doc._id) doc._id = doc.name
    if (!doc.versions) doc.versions = {}
    var latest
    for (var v in doc.versions) {
      if (!semver.valid(v, true)) return error("Invalid version: "+JSON.stringify(v))
      var p = doc.versions[v]
      if (p.version !== v) return error("Version mismatch: "+JSON.stringify(v)
                                       +" !== "+JSON.stringify(p.version))
      if (!valid.name(p.name)) return error("Invalid name: "+JSON.stringify(p.name))
      latest = semver.clean(v, true)
    }
    if (!doc['dist-tags']) doc['dist-tags'] = {}
    if (latest) doc["dist-tags"].latest = latest

    return ok(doc, "created new entry")
  }
}
