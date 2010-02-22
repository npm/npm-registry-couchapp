function (doc, req) {
  if (req.query.version) {
    if (isNaN(parseInt(req.query.version[0]))) {
      var v = doc.versions[doc['dist-tags'][req.query.version]]
    } else {
      var v = doc.versions[req.query.version]
    }
    if (v == undefined) {
      // 404
    }      
    var response = { body:toJSON(v),
                     headers:{"Content-Type":"application/json"},
                    };
    return response; 
  } else {
    var response = { body:toJSON(doc),
                     headers:{"Content-Type":"application/json"},
                    };
    return response;
  }
}