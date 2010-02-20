function (doc, req) {
  if (req.query.version) {
    if (doc.versions[req.query.version]) {
      var response = { body:toJSON(doc.versions[req.query.version]),
                       headers:{"Content-Type":"application/json"},
                      };
      return response;
    } else {
      // does not exist error
    }
  } else {
    var response = { body:toJSON(doc),
                     headers:{"Content-Type":"application/json"},
                    };
    return response;
  }
}