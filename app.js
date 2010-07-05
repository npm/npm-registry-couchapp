var couchapp = require('couchapp');

var ddoc = {_id:'_design/app', shows:{}, updates:{}, views:{}, lists:{}};
exports.app = ddoc;

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

  , { from: "/:pkg/:rev", to: "../../:pkg", method: "DELETE" }
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
    for (var i in row.value.versions) {
      p.versions[i] = "http://"+req.headers.Host+"/"+row.value.name+"/"+i
    }
  }
  out = req.query.jsonp
      ? req.query.jsonp + "(" + JSON.stringify(out) + ")"
      : toJSON(out)

  send(out)
}
ddoc.views.listAll = {
  map : function (doc) { emit(doc.id, doc) }
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
    body = doc;
  }
  body = req.query.jsonp
       ? req.query.jsonp + "(" + JSON.stringify(body) + ")"
       : toJSON(body)
  return {
    code : code,
    body : body,
    headers : headers,
  };
}

ddoc.updates.package = function (doc, req) {
  var semver = /v?([0-9]+)\.([0-9]+)\.([0-9]+)([a-zA-Z-][a-zA-Z0-9-]*)?/;
  function toISOString(d){
   function pad(n){return n<10 ? '0'+n : n}
   return d.getUTCFullYear()+'-'
        + pad(d.getUTCMonth()+1)+'-'
        + pad(d.getUTCDate())+'T'
        + pad(d.getUTCHours())+':'
        + pad(d.getUTCMinutes())+':'
        + pad(d.getUTCSeconds())+'Z'}
  var now = toISOString(new Date());
  function error (reason) {
    return [{forbidden:reason}, JSON.stringify({forbidden:reason})];
  }

  if (doc) {
    if (req.query.version) {
      var parsed = semver(req.query.version);
      if (!parsed) {
        // it's a tag.
        var tag = req.query.version;
        parsed = semver(JSON.parse(req.body));
        if (!parsed) {
          return error(
            "setting tag "+req.query.version+
            " to invalid version: "+req.body);
        }
        doc["dist-tags"][req.query.version] = JSON.parse(req.body);
        doc.mtime = now;
        return [doc, JSON.stringify({ok:"updated tag"})];
      }
      // adding a new version.
      if (req.query.version in doc.versions) {
        // attempting to overwrite an existing version.
        // not supported at this time.
        return error("cannot modify existing version");
      }
      var body = JSON.parse(req.body);
      body.ctime = body.mtime = doc.mtime = now;
      doc["dist-tags"].latest = body.version;
      doc.versions[req.query.version] = body;
      return [doc, JSON.stringify({ok:"added version"})];
    }

    // update the package info
    var newdoc = JSON.parse(req.body)
      , changed = false
    if (doc._rev && doc._rev !== newdoc._rev) {
      return error( "must supply latest _rev to update existing package" )
    }
    for (var i in newdoc) {
      if (typeof newdoc[i] === "string") {
        doc[i] = newdoc[i];
      }
    }
    if (newdoc.versions) {
      doc.versions = newdoc.versions
      doc["dist-tags"] = newdoc["dist-tags"]
    }
    doc.mtime = now;
    return [doc, JSON.stringify({ok:"updated package metadata"})];
  } else {
    // Create new package doc
    doc = JSON.parse(req.body);
    if (!doc.versions) doc.versions = {};
    var latest
    for (var v in doc.versions) {
      doc.versions[v].ctime = doc.versions[v].mtime = now;
      latest = v
    }
    doc["dist-tags"].latest = latest;
    if (!doc['dist-tags']) doc['dist-tags'] = {};
    doc.ctime = doc.mtime = now;
    return [doc, JSON.stringify({ok:"created new entry"})];
  }
}

ddoc.validate_doc_update = function (newDoc, oldDoc, user) {
  var semver = /v?([0-9]+)\.([0-9]+)\.([0-9]+)([a-zA-Z-][a-zA-Z0-9-]*)?/;

  function assert (ok, message) {
    if (!ok) throw {forbidden:message};
  }
  
  // if the newDoc is an {error:"blerg"}, then throw that right out.
  // something detected in the _updates/package script.
  if (newDoc.forbidden) throw {forbidden:newDoc.forbidden};

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
  
  // make sure all the dist-tags and versions are valid semver
  assert(newDoc["dist-tags"], "must have dist-tags");
  assert(newDoc.versions, "must have versions");

  for (var i in newDoc["dist-tags"]) {
    assert(semver(newDoc["dist-tags"][i]),
      "dist-tag "+i+" is not a valid version: "+newDoc["dist-tags"][i]);
    assert(newDoc["dist-tags"][i] in newDoc.versions,
      "dist-tag "+i+" refers to non-existent version: "+newDoc["dist-tags"][i]);
  }
  for (var i in newDoc.versions) {
    assert(semver(i),
      "version "+i+" is not a valid version");
  }
}
