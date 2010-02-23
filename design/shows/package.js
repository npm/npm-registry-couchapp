function (doc, req) {
  if (req.query.version) {
    var code = 200;
    if (isNaN(parseInt(req.query.version[0]))) {
      var v = doc.versions[doc['dist-tags'][req.query.version]]
    } else {
      var v = doc.versions[req.query.version]
    }
    if (v == undefined) {
      code = 404;
      v = {"error" : "version not found: "+req.query.version};
    }      
    var response = {
      code : code,
      body : toJSON(v),
      headers : {"Content-Type":"application/json"},
    };
    return response; 
  } else {
    var response = {
      body : toJSON(doc),
      headers : {"Content-Type":"application/json"},
    };
    return response;
  }
}
