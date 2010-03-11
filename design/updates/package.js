function (doc, req) {
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
