var couchapp = require('couchapp');

var ddoc = {_id:'_design/app', shows:{}, updates:{}, views:{}, lists:{}};
exports.app = ddoc;

ddoc.rewrites = [
  { from: "/", to:"_list/index/listAll", method: "GET" },

  { from: "/adduser/:user", to:"../../../_users/:user", method: "PUT" },

  { from: "/:pkg", to: "/_show/package/:pkg", method: "GET" },
  { from: "/:pkg/:version", to: "_show/package/:pkg", method: "GET",
    query: { version: ":version" }
  },

  { from: "/:pkg", to: "/_update/package/:pkg", method: "PUT" },
  { from: "/:pkg/:version", to: "_update/package/:pkg", method: "PUT",
    query: { version : ":version" }
  },

  { from: "/:pkg", to: "../../:pkg", method: "DELETE" },
]

ddoc.lists.index = function (head, req) {
  var row,
    out = {};
  while (row = getRow()) {
    out[row.id] = Object.keys(row.value.versions);
  }
  send(toJSON(out));
}
ddoc.views.listAll = {
  map : function (doc) { emit(doc.id, doc) }
}

ddoc.shows.package = function (doc, req) {
  var code = 200,
    headers = {"Content-Type":"application/json"},
    body = null;
  if (req.query.version) {
    if (isNaN(parseInt(req.query.version[0]))) {
      body = doc.versions[doc['dist-tags'][req.query.version]]
    } else {
      body = doc.versions[req.query.version]
    }
    if (!body) {
      code = 404;
      body = {"error" : "version not found: "+req.query.version};
    }
  } else {
    body = doc;
  }
  return {
    code : code,
    body : toJSON(body),
    headers : headers,
  };
}

ddoc.updates.package = function (doc, req) {
  var semver = /v?([0-9]+)\.([0-9]+)\.([0-9]+)([a-zA-Z-][a-zA-Z0-9-]*)?/;
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
        return [doc, JSON.stringify({ok:"updated tag"})];
      }
      // adding a new version.
      if (req.query.version in doc.versions) {
        // attempting to overwrite an existing version.
        // not supported at this time.
        return error("cannot modify existing version");
      }
      doc.versions[req.query.version] = JSON.parse(req.body);
      return [doc, JSON.stringify({ok:"added version"})];
    }

    // update the package info
    var newdoc = JSON.parse(req.body),
      changed = false;
    if (doc._rev && doc._rev !== newdoc._rev) {
      return error("must supply latest _rev to update existing package");
    }
    for (var i in newdoc) {
      if (typeof newdoc[i] === "string") {
        doc[i] = newdoc[i];
      }
    }
    return [doc, JSON.stringify({ok:"updated package metadata"})];
  } else {
    // Create new package doc
    doc = JSON.parse(req.body);
    if (!doc.versions) doc.versions = {};
    if (!doc['dist-tags']) doc['dist-tags'] = {};
    return [doc, JSON.stringify({ok:"created new entry"})];
  }
}

ddoc.validate_doc_update = function (newDoc, oldDoc, user) {
  var semver = /v?([0-9]+)\.([0-9]+)\.([0-9]+)([a-zA-Z-][a-zA-Z0-9-]*)?/;

  if (newDoc._deleted === true) {
    // Allow document deletion, this eventually will need to do user validation.
    return true;
  }

  function assert (ok, message) {
    if (!ok) throw {forbidden:message};
  }

  // TODO: If the user doesn't have access to update this thing,
  // then throw an unauthorized error

  // if the newDoc is an {error:"blerg"}, then throw that right out.
  // something detected in the _updates/package script.
  if (newDoc.forbidden) throw {forbidden:newDoc.forbidden};

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
