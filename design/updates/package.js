function (doc, req) {
  if (doc) {
    if (req.query.version) {
      if (typeof(parseInt(req.query.version[0])) == "NaN") {
        doc['dist-tags'][req.query.version] = JSON.parse(req.body);
      } else {
        doc.versions[req.query.version] = JSON.parse(req.body);
      }
      return [doc, "Updated version."]
    } else {
      var newdoc = JSON.parse(req.body);  
      return [newdoc, "Updated entry"]
    }
  } else {
    // Create new package doc
    doc = JSON.parse(req.body)
    if (!doc.versions) {
      doc.versions = {};
    }
    if (!doc['dist-tags']) {
      doc['dist-tags'] = {};
    }
    return [doc, "Created new entry."]
  }
}