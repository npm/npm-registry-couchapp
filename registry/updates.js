var updates = exports

updates.package = function (doc, req) {
  require("monkeypatch").patch(Object, Date, Array, String)

  var semver = require("semver")
  var valid = require("valid")
  function error (reason) {
    return [{_id: "error: forbidden", forbidden:reason}, JSON.stringify({forbidden:reason})]
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
    return [doc, JSON.stringify({ok:message})]
  }

  if (doc) {
    if (req.query.version) {
      if (doc.url) {
        return error(doc.name+" is hosted elsewhere: "+doc.url)
      }
      var parsed = semver.valid(req.query.version)
      if (!parsed) {
        // it's a tag.
        var tag = req.query.version
          , ver = JSON.parse(req.body)
        if (!semver.valid(ver)) {
          return error("setting tag "+tag+" to invalid version: "+req.body)
        }
        doc["dist-tags"][tag] = semver.clean(ver)
        return ok(doc, "updated tag")
      }
      // adding a new version.
      var ver = req.query.version
      if (!semver.valid(ver)) {
        return error("invalid version: "+ver)
      }

      if ((ver in doc.versions) || (semver.clean(ver) in doc.versions)) {
        // attempting to overwrite an existing version.
        // not supported at this time.
        if (!req.query.rev || req.query.rev !== doc._rev) {
          return error("cannot modify existing version")
        }
      }

      var body = JSON.parse(req.body)
      if (!valid.name(body.name)) {
        return error( "Invalid name: "+JSON.stringify(body.name))
      }
      body.version = semver.clean(body.version)
      ver = semver.clean(ver)
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

      var tag = req.query.tag
              || (body.publishConfig && body.publishConfig.tag)
              || body.tag
              || "latest"

      if (!req.query.pre) doc["dist-tags"][tag] = body.version
      doc.versions[ver] = body
      doc.time = doc.time || {}
      doc.time[ver] = (new Date()).toISOString()
      return ok(doc, "added version")
    }

    // update the package info
    var newdoc = JSON.parse(req.body)
      , changed = false
    if (doc._rev && doc._rev !== newdoc._rev) {
      return error( "must supply latest _rev to update existing package" )
    }
    if (newdoc.url && (newdoc.versions || newdoc["dist-tags"])) {
      return error("Do not supply versions or dist-tags for packages "+
                   "hosted elsewhere. Just a URL is sufficient.")
    }
    for (var i in newdoc) if (typeof newdoc[i] === "string" || i === "maintainers") {
      doc[i] = newdoc[i]
    }
    if (newdoc.versions) {
      doc.versions = newdoc.versions
    }
    if (newdoc["dist-tags"]) {
      doc["dist-tags"] = newdoc["dist-tags"]
    }
    if (newdoc.users) {
      if (!doc.users) doc.users = {}
      doc.users[req.userCtx.name] = newdoc.users[req.userCtx.name]
    }
    return ok(doc, "updated package metadata")
  } else {
    // Create new package doc
    doc = JSON.parse(req.body)
    if (!doc._id) doc._id = doc.name
    if (doc.url) {
      if (doc.versions || doc["dist-tags"]) {
        return error("Do not supply versions or dist-tags for packages "+
                     "hosted elsewhere. Just a URL is sufficient.")
      }
      return ok(doc, "created new entry")
    }
    if (!doc.versions) doc.versions = {}
    var latest
    for (var v in doc.versions) {
      if (!semver.valid(v)) return error("Invalid version: "+JSON.stringify(v))
      var p = doc.versions[v]
      if (p.version !== v) return error("Version mismatch: "+JSON.stringify(v)
                                       +" !== "+JSON.stringify(p.version))
      if (!valid.name(p.name)) return error("Invalid name: "+JSON.stringify(p.name))
      latest = semver.clean(v)
    }
    if (!doc['dist-tags']) doc['dist-tags'] = {}
    if (latest) doc["dist-tags"].latest = latest
    return ok(doc, "created new entry")
  }
}
