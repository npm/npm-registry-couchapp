function (doc, req) {
  if (req.query.version) {
    if (typeof(parseInt(req.query.version[0])) == "NaN") {
      var v = doc.versions[doc['dist-tags'][req.query.version]]
    } else {
      var v = doc.version[req.query.version]
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