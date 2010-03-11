function (newDoc, oldDoc, user) {
  var semver = /v?([0-9]+)\.([0-9]+)\.([0-9]+)([a-zA-Z-][a-zA-Z0-9-]*)?/;
  
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
