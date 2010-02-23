function (doc, req) {
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
