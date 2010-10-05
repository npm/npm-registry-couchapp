var couchapp = require('couchapp')

var ddoc = {_id:'_design/app', shows:{}, updates:{}, views:{}, lists:{}}
exports.app = ddoc

ddoc.rewrites =
  [ { from: "/", to:"_list/index/listAll", method: "GET" }
  , { from: "/all", to:"_list/index/listAll", method: "GET" }
  , { from: "/all/-/jsonp/:jsonp", to:"_list/index/listAll", method: "GET" }
  , { from: "/-/jsonp/:jsonp", to:"_list/index/listAll", method: "GET" }

  , { from: "/adduser/:user", to:"../../../_users/:user", method: "PUT" }
  , { from: "/adduser/:user/-rev/:rev", to:"../../../_users/:user", method: "PUT" }
  , { from: "/getuser/:user", to:"../../../_users/:user", method: "GET" }

  , { from: "/:pkg", to: "/_show/package/:pkg", method: "GET" }
  , { from: "/:pkg/-/jsonp/:jsonp", to: "/_show/package/:pkg", method: "GET" }
  , { from: "/:pkg/:version", to: "_show/package/:pkg", method: "GET" }
  , { from: "/:pkg/:version/-/jsonp/:jsonp", to: "_show/package/:pkg", method: "GET" }

  , { from: "/:pkg/-/:att", to: "../../:pkg/:att", method: "GET" }
  , { from: "/:pkg/-/:att/:rev", to: "../../:pkg/:att", method: "PUT" }
  , { from: "/:pkg/-/:att/-rev/:rev", to: "../../:pkg/:att", method: "PUT" }
  , { from: "/:pkg/-/:att/:rev", to: "../../:pkg/:att", method: "DELETE" }
  , { from: "/:pkg/-/:att/-rev/:rev", to: "../../:pkg/:att", method: "DELETE" }

  , { from: "/:pkg", to: "/_update/package/:pkg", method: "PUT" }
  , { from: "/:pkg/-rev/:rev", to: "/_update/package/:pkg", method: "PUT" }
  , { from: "/:pkg/:version", to: "_update/package/:pkg", method: "PUT" }

  , { from: "/:pkg/-rev/:rev", to: "../../:pkg", method: "DELETE" }
  ]

ddoc.lists.index = function (head, req) {
  var row
    , out = {}
  while (row = getRow()) {
    var p = out[row.id] = {}
    for (var i in row.value) {
      if (i === "versions" || i.charAt(0) === "_") continue
      p[i] = row.value[i]
    }
    p.versions = {}
    if (row.repository) p.repository = row.repository
    if (row.description) p.description = row.description
    for (var i in row.value.versions) {
      if (row.value.versions[i].repository && !row.repository) {
        p.repository = row.value.versions[i].repository
      }
      if (row.value.versions[i].description && !row.description) {
        p.description = row.value.versions[i].description
      }
      p.versions[i] = "http://"+req.headers.Host+"/"+row.value.name+"/"+i
    }
    p.url = "http://"+req.headers.Host+"/"+encodeURIComponent(row.value.name)+"/"
  }
  out = req.query.jsonp
      ? req.query.jsonp + "(" + JSON.stringify(out) + ")"
      : toJSON(out)

  send(out)
}
ddoc.views.listAll = {
  map : function (doc) {
    for (var i in doc.versions) return emit(doc.id, doc)
  }
}

ddoc.shows.package = function (doc, req) {
  var code = 200
    , headers = {"Content-Type":"application/json"}
    , body = null
  if (req.query.version) {
    if (isNaN(parseInt(req.query.version[0]))) {
      body = doc.versions[doc['dist-tags'][req.query.version]]
    } else {
      body = doc.versions[req.query.version]
    }
    if (!body) {
      code = 404
      body = {"error" : "version not found: "+req.query.version}
    }
  } else {
    body = doc
    delete body._revisions
    delete body._attachments
  }
  body = req.query.jsonp
       ? req.query.jsonp + "(" + JSON.stringify(body) + ")"
       : toJSON(body)
  return {
    code : code,
    body : body,
    headers : headers,
  }
}

ddoc.updates.package = function (doc, req) {
  var semver = /^v?([0-9]+)\.([0-9]+)\.([0-9]+)(-[0-9]+-?)?([a-zA-Z-][a-zA-Z0-9-.:]*)?$/
  function error (reason) {
    return [{forbidden:reason}, JSON.stringify({forbidden:reason})]
  }

  function validVersion (v) {
    return v.match(semver)
  }
  function validName (name) {
    var n = name.replace('%20', ' ').trim()
    if (n.charAt(0) === "." || n.match(/[\/@\s]/) || n !== name || !n) {
      return false
    }
    return true
  }
  function validPackage (pkg) {
    return validName(pkg.name) && validVersion(pkg.version)
  }

  if (doc) {
    if (req.query.version) {
      var parsed = semver(req.query.version)
      if (!parsed) {
        // it's a tag.
        var tag = req.query.version
        if (!validVersion(JSON.parse(req.body))) {
          return error(
            "setting tag "+req.query.version+
            " to invalid version: "+req.body)
        }
        doc["dist-tags"][req.query.version] = JSON.parse(req.body)
        return [doc, JSON.stringify({ok:"updated tag"})]
      }
      // adding a new version.
      if (req.query.version in doc.versions) {
        // attempting to overwrite an existing version.
        // not supported at this time.
        return error("cannot modify existing version")
      }
      if (!validVersion(req.query.version)) {
        return error("invalid version: "+req.query.version)
      }
      var body = JSON.parse(req.body)
      if (!validName(body.name)) {
        return error( "Invalid name: "+JSON.stringify(body.name))
      }
      if (body.version !== req.query.version) {
        return error( "version in doc doesn't match version in request: "
                    + JSON.stringify(body.version) + " !== " + JSON.stringify(req.query.version))
      }
      if (body.description) doc.description = body.description
      if (body.author) doc.author = body.author
      if (body.repository) doc.repository = body.repository
      doc["dist-tags"].latest = body.version
      doc.versions[req.query.version] = body
      return [doc, JSON.stringify({ok:"added version"})]
    }

    // update the package info
    var newdoc = JSON.parse(req.body)
      , changed = false
    if (doc._rev && doc._rev !== newdoc._rev) {
      return error( "must supply latest _rev to update existing package" )
    }
    for (var i in newdoc) if (typeof newdoc[i] === "string" || i === "maintainers") {
      doc[i] = newdoc[i]
    }
    if (newdoc.versions) {
      doc.versions = newdoc.versions
      doc["dist-tags"] = newdoc["dist-tags"]
    }
    return [doc, JSON.stringify({ok:"updated package metadata"})]
  } else {
    // Create new package doc
    doc = JSON.parse(req.body)
    if (!doc.versions) doc.versions = {}
    var latest
    for (var v in doc.versions) {
      if (!validVersion(v)) return error("Invalid version: "+JSON.stringify(v))
      var p = doc.versions[p]
      if (p.version !== v) return error("Version mismatch: "+JSON.stringify(v)
                                       +" !== "+JSON.stringify(p.version))
      if (!validName(p.name)) return error("Invalid name: "+JSON.stringify(p.name))
      latest = v
    }
    if (latest) doc["dist-tags"].latest = latest
    if (!doc['dist-tags']) doc['dist-tags'] = {}
    return [doc, JSON.stringify({ok:"created new entry"})]
  }
}

ddoc.validate_doc_update = function (newDoc, oldDoc, user) {
  var semver = /^v?([0-9]+)\.([0-9]+)\.([0-9]+)(-[0-9]+-?)?([a-zA-Z-][a-zA-Z0-9-.:]*)?$/

  function assert (ok, message) {
    if (!ok) throw {forbidden:message}
  }

  // if the newDoc is an {error:"blerg"}, then throw that right out.
  // something detected in the _updates/package script.
  if (newDoc.forbidden) throw {forbidden:newDoc.forbidden || newDoc.error}

  function validUser () {
    if ( !oldDoc || !oldDoc.maintainers ) return true
    if (isAdmin()) return true
    if (typeof oldDoc.maintainers !== "object") return true
    for (var i = 0, l = oldDoc.maintainers.length; i < l; i ++) {
      if (oldDoc.maintainers[i].name === user.name) return true
    }
    return false
  }
  function isAdmin () { return user.roles.indexOf("_admin") >= 0 }

  if (!validUser()) {
    throw {forbidden:"user: " + user.name + " not authorized to modify "
                    + newDoc.name }
  }
  if (newDoc._deleted) return true

  if (oldDoc && oldDoc.maintainers && !newDoc.maintainers) {
    throw {forbidden: "Please upgrade your package manager program"}
  }
  var n = newDoc.name.replace('%20', ' ').trim()
  if (n.charAt(0) === "." || n.match(/[\/@\s]/) || n !== newDoc.name || !n) {
    var msg = "Invalid name: "
            + JSON.stringify(newDoc.name)
            + " may not start with '.' or contain '/' or '@' or whitespace"
    throw {forbidden:msg}
  }
  
  // make sure all the dist-tags and versions are valid semver
  assert(newDoc["dist-tags"], "must have dist-tags")
  assert(newDoc.versions, "must have versions")

  for (var i in newDoc["dist-tags"]) {
    assert(semver(newDoc["dist-tags"][i]),
      "dist-tag "+i+" is not a valid version: "+newDoc["dist-tags"][i])
    assert(newDoc["dist-tags"][i] in newDoc.versions,
      "dist-tag "+i+" refers to non-existent version: "+newDoc["dist-tags"][i])
  }
  for (var i in newDoc.versions) {
    assert(semver(i),
      "version "+i+" is not a valid version")
  }
}
