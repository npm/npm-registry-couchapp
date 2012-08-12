
var shows = exports

shows.package = function (doc, req) {
  require("monkeypatch").patch(Object, Date, Array, String)

  var semver = require("semver")
    , code = 200
    , headers = {"Content-Type":"application/json"}
    , body = null

  delete doc.ctime
  delete doc.mtime
  if (doc.versions) Object.keys(doc.versions).forEach(function (v) {
    delete doc.versions[v].ctime
    delete doc.versions[v].mtime
  })

  // legacy kludge
  if (doc.versions) for (var v in doc.versions) {
    var clean = semver.clean(v)
    doc.versions[v].directories = doc.versions[v].directories || {}
    if (clean !== v) {
      var p = doc.versions[v]
      delete doc.versions[v]
      p.version = v = clean
      doc.versions[clean] = p
    }
    if (doc.versions[v].dist.tarball) {

      // make it point at THIS registry that is being requested,
      // with the full /db/_design/app/_rewrite if that is being used,
      // or just the /name if not.

      var t = doc.versions[v].dist.tarball
      t = t.replace(/^https?:\/\/[^\/:]+(:[0-9]+)?/, '')

      var requestedPath = req.requested_path
      // workaround for old couch versions that didn't
      // have requested_path
      if (requestedPath && -1 === requestedPath.indexOf('show'))
        requestedPath = requestedPath.slice(0)
      else {
        var path = req.path
        if (path) {
          var i = path.indexOf('_show')
          if (i !== -1) {
            requestedPath = path.slice(0)
            requestedPath.splice(i, i + 2, '_rewrite')
          }
        } else return {
          code : 500,
          body : JSON.stringify({error: 'bad couch'}),
          headers : headers
        }
      }

      // doc.versions[v].dist._origTarball = doc.versions[v].dist.tarball
      // doc.versions[v].dist._headers = req.headers
      // doc.versions[v].dist._query = req.query
      // doc.versions[v].dist._reqPath = req.requested_path
      // doc.versions[v].dist._path = req.path
      // doc.versions[v].dist._t = t.slice(0)

      // actual location of tarball should always be:
      // .../_rewrite/pkg/-/pkg-version.tgz
      // or: /pkg/-/pkg-version.tgz
      // depending on what requested path is.
      var tf = [doc.name, '-', t.split('/').pop()]
      var i = requestedPath.indexOf('_rewrite')
      if (i !== -1) {
        tf = requestedPath.slice(0, i + 1).concat(tf)
      }
      t = '/' + tf.join('/')
      var h = "http://" + req.headers.Host

      doc.versions[v].dist.tarball = h + t
    }
  }
  if (doc["dist-tags"]) for (var tag in doc["dist-tags"]) {
    var clean = semver.clean(doc["dist-tags"][tag])
    if (!clean) delete doc["dist-tags"][tag]
    else doc["dist-tags"][tag] = clean
  }
  // end kludge

  if (req.query.version) {
    var ver = req.query.version
    // if not a valid version, then treat as a tag.
    if ((!(ver in doc.versions) && (ver in doc["dist-tags"]))
        || !semver.valid(ver)) {
      ver = doc["dist-tags"][ver]
    }
    body = doc.versions[ver]
    if (!body) {
      code = 404
      body = {"error" : "version not found: "+req.query.version}
    }
  } else {
    body = doc
    for (var i in body) if (i.charAt(0) === "_" && i !== "_id" && i !== "_rev") {
      delete body[i]
    }
    for (var i in body.time) {
      if (!body.versions[i]) delete body.time[i]
      else body.time[i] = new Date(Date.parse(body.time[i])).toISOString()
    }
  }

  body = req.query.jsonp
       ? req.query.jsonp + "(" + JSON.stringify(body) + ")"
       : toJSON(body)

  return {
    code : code,
    body : body,
    headers : headers
  }
}

