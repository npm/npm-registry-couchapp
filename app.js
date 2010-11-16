var couchapp = require('couchapp')
  , ddoc = {_id:'_design/app', shows:{}, updates:{}, views:{}, lists:{}}
  , fs = require("fs")

exports.app = ddoc

ddoc.language = "javascript"
// there has GOT to be a better way than this...
ddoc.semver = [ 'var expr = exports.expression = '
                + require("npm/utils/semver").expressions.parse.toString()
              , 'function valid (v) { return v && typeof v === "string" && v.match(expr) }'
              , 'function clean (v) {'
                , 'v = valid(v)'
                , 'if (!v) return v'
                , "return [v[1]||'0', v[2]||'0', v[3]||'0'].join('.') + (v[4]||'') + (v[5]||'')"
              ,'}'
              , 'exports.valid = valid'
              , 'exports.clean = clean'
              ].join("\n")
ddoc.valid =  [ 'function validName (name) {'
                , 'if (!name) return false'
                , 'if (name === "favicon.ico") return false'
                , 'var n = name.replace("%20", " ")'
                , 'n = n.replace(/^\\s+|\\s+$/g, "")'
                , 'if (!n || n.charAt(0) === "." || n.match(/[\\/@\\s]/) || n !== name) {'
                  , 'return false'
                , '}'
                , 'return n'
              , '}'
              , 'function validPackage (pkg) {'
                , 'return validName(pkg.name) && semver.valid(pkg.version)'
              , '}'
              , 'exports.name = validName'
              , 'exports.package = validPackage'
              ].join("\n")



ddoc.shows.requirey = function () {
  return { code : 200
         , body : toJSON([require("semver").expression.toString(), typeof ("asdf".match),
          require("semver").clean("0.2.4-1"),
          require("semver").valid("0.2.4-1"),
          new Date().toISOString(),"hi"
         ])
         , headers : {}
         }
}

ddoc.rewrites =
  [ { from: "/", to:"_list/index/listAll", method: "GET" }
  , { from : "/favicon.ico", to:"../../npm/favicon.ico", method:"GET" }
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
    , semver = require("semver")

  while (row = getRow()) {
    var p = out[row.id] = {}
    var doc = row.value
    // legacy kludge
    for (var v in doc.versions) {
      var clean = semver.clean(v)
      if (clean !== v) {
        var x = doc.versions[v]
        delete doc.versions[v]
        x.version = v = clean
        doc.versions[clean] = x
      }
    }
    for (var tag in doc["dist-tags"]) {
      var clean = semver.clean(doc["dist-tags"][tag])
      if (!clean) delete doc["dist-tags"][tag]
      else doc["dist-tags"][tag] = clean
    }
    // end kludge

    for (var i in doc) {
      if (i === "versions" || i.charAt(0) === "_") continue
      p[i] = doc[i]
    }
    p.versions = {}
    if (row.repository) p.repository = row.repository
    if (row.description) p.description = row.description
    for (var i in doc.versions) {
      if (doc.versions[i].repository && !row.repository) {
        p.repository = doc.versions[i].repository
      }
      if (doc.versions[i].description && !row.description) {
        p.description = doc.versions[i].description
      }
      p.versions[i] = "http://"+req.headers.Host+"/"+doc.name+"/"+i
    }
    p.url = "http://"+req.headers.Host+"/"+encodeURIComponent(doc.name)+"/"
  }
  out = req.query.jsonp
      ? req.query.jsonp + "(" + JSON.stringify(out) + ")"
      : toJSON(out)

  send(out)
}
ddoc.views.listAll = {
  map : function (doc) { return emit(doc._id, doc) }
}

ddoc.shows.package = function (doc, req) {
  var semver = require("semver")
    , code = 200
    , headers = {"Content-Type":"application/json"}
    , body = null
  // legacy kludge
  for (var v in doc.versions) {
    var clean = semver.clean(v)
    if (clean !== v) {
      var p = doc.versions[v]
      delete doc.versions[v]
      p.version = v = clean
      doc.versions[clean] = p
    }
    if (doc.versions[v].dist.tarball) {
      var t = doc.versions[v].dist.tarball
      t = t.replace(/^https?:\/\/[^\/:]+(:[0-9]+)?/, '')
      doc.versions[v].dist.tarball = t
      var h
      for (var i in req.headers) {
        if (i.toLowerCase() === 'host') {
          h = req.headers[i]
          break
        }
      }
      h = h ? 'http://' + h : h
      doc.versions[v].dist.tarball = h + t
    }
  }
  for (var tag in doc["dist-tags"]) {
    var clean = semver.clean(doc["dist-tags"][tag])
    if (!clean) delete doc["dist-tags"][tag]
    else doc["dist-tags"][tag] = clean
  }
  // end kludge
  if (req.query.version) {
    var ver = req.query.version
    // if not a valid version, then treat as a tag.
    if (!semver.valid(ver)) {
      ver = doc["dist-tags"][ver]
    }
    body = doc.versions[ver]
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
  var semver = require("semver")
  var valid = require("valid")
  function error (reason) {
    return [{forbidden:reason}, JSON.stringify({forbidden:reason})]
  }

  if (doc) {
    if (req.query.version) {
      var parsed = semver.valid(req.query.version)
      if (!parsed) {
        // it's a tag.
        var tag = req.query.version
          , ver = JSON.parse(req.body)
        if (!semver.valid(ver)) {
          return error("setting tag "+tag+" to invalid version: "+req.body)
        }
        doc["dist-tags"][tag] = semver.clean(ver)
        return [doc, JSON.stringify({ok:"updated tag"})]
      }
      // adding a new version.
      var ver = req.query.version
      if (!semver.valid(ver)) {
        return error("invalid version: "+ver)
      }
      if ((ver in doc.versions) || (semver.clean(ver) in doc.versions)) {
        // attempting to overwrite an existing version.
        // not supported at this time.
        return error("cannot modify existing version")
      }
      var body = JSON.parse(req.body)
      if (!valid.name(body.name)) {
        return error( "Invalid name: "+JSON.stringify(body.name))
      }
      body.version = semver.clean(body.version)
      ver = semver.clean(ver)
      if (body.version !== ver) {
        return error( "version in doc doesn't match version in request: "
                    + JSON.stringify(body.version) + " !== " + JSON.stringify(ver))
      }
      if (body.description) doc.description = body.description
      if (body.author) doc.author = body.author
      if (body.repository) doc.repository = body.repository
      doc["dist-tags"].latest = body.version
      doc.versions[ver] = body
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
      if (!semver.valid(v)) return error("Invalid version: "+JSON.stringify(v))
      var p = doc.versions[p]
      if (p.version !== v) return error("Version mismatch: "+JSON.stringify(v)
                                       +" !== "+JSON.stringify(p.version))
      if (!valid.name(p.name)) return error("Invalid name: "+JSON.stringify(p.name))
      latest = semver.clean(v)
    }
    if (latest) doc["dist-tags"].latest = latest
    if (!doc['dist-tags']) doc['dist-tags'] = {}
    return [doc, JSON.stringify({ok:"created new entry"})]
  }
}

ddoc.validate_doc_update = function (newDoc, oldDoc, user) {
  var semver = require("semver")
  var valid = require("valid")

  function assert (ok, message) {
    if (!ok) throw {forbidden:message}
  }

  // if the newDoc is an {error:"blerg"}, then throw that right out.
  // something detected in the _updates/package script.
  assert(!newDoc.forbidden || newDoc._deleted, newDoc.forbidden)

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

  assert(validUser(), "user: " + user.name + " not authorized to modify "
                      + newDoc.name )
  if (newDoc._deleted) return

  assert(newDoc.maintainers, "Please upgrade your package manager program")
  var n = valid.name(newDoc.name)
  assert(valid.name(n) && n === newDoc.name && n
        , "Invalid name: "
          + JSON.stringify(newDoc.name)
          + " may not start with '.' or contain '/' or '@' or whitespace")

  // make sure all the dist-tags and versions are valid semver
  assert(newDoc["dist-tags"], "must have dist-tags")
  assert(newDoc.versions, "must have versions")

  for (var i in newDoc["dist-tags"]) {
    assert(semver.valid(newDoc["dist-tags"][i]),
      "dist-tag "+i+" is not a valid version: "+newDoc["dist-tags"][i])
    assert(newDoc["dist-tags"][i] in newDoc.versions,
      "dist-tag "+i+" refers to non-existent version: "+newDoc["dist-tags"][i])
  }
  for (var i in newDoc.versions) {
    assert(semver.valid(i), "version "+i+" is not a valid version")
  }
}
