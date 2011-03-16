var ddoc = {_id:'_design/app', shows:{}, updates:{}, views:{}, lists:{}}
  , fs = require("fs")

module.exports = ddoc

ddoc.language = "javascript"
// there has GOT to be a better way than this...
ddoc.semver = [ 'var expr = exports.expression = '
                + require("semver").expressions.parse.toString()
              , 'function valid (v) { return v && typeof v === "string" && v.match(expr) }'
              , 'function clean (v) {'
                , 'v = valid(v)'
                , 'if (!v) return v'
                , "return [v[1]||'0', v[2]||'0', v[3]||'0'].join('.') + (v[4]||'') + (v[5]||'')"
              ,'}'
              , 'exports.valid = valid'
              , 'exports.clean = clean'
              ].join("\n")
ddoc.valid =  [ 'var semver = require("semver")'
              , 'function validName (name) {'
                , 'if (!name) return false'
                , 'var n = name.replace(/^\\s|\\s$/, "")'
                , 'if (!n || n.charAt(0) === "."'
                    , '|| n.match(/[\\/\\(\\)&\\?#\\|<>@:%\\s\\\\]/)'
                    , '|| n.toLowerCase() === "node_modules"'
                    , '|| n.toLowerCase() === "favicon.ico") {'
                  , 'return false'
                , '}'
                , 'return n'
              , '}'
              , 'function validPackage (pkg) {'
                , 'return validName(pkg.name) && semver.valid(pkg.version)'
              , '}'
              , 'exports.name = validName'
              , 'exports.package = validPackage'
              ].join("\n")

ddoc.shows.requirey = function () {
  function ISODateString(d){
   function pad(n){return n<10 ? '0'+n : n}
   return d.getUTCFullYear()+'-'
        + pad(d.getUTCMonth()+1)+'-'
        + pad(d.getUTCDate())+'T'
        + pad(d.getUTCHours())+':'
        + pad(d.getUTCMinutes())+':'
        + pad(d.getUTCSeconds())+'Z'}
  if (!Date.prototype.toISOString) {
    Date.prototype.toISOString = function () { return ISODateString(this) }
    Date.parse = function (s) {
      // s is something like "2010-12-29T07:31:06Z"
      s = s.split("T")
      var ds = s[0]
        , ts = s[1]
        , d = new Date()
      ds = ds.split("-")
      ts = ts.split(":")
      var tz = ts[2].substr(2)
      ts[2] = ts[2].substr(0, 2)
      d.setUTCFullYear(+ds[0])
      d.setUTCMonth(+ds[1]-1)
      d.setUTCDate(+ds[2])
      d.setUTCHours(+ts[0])
      d.setUTCMinutes(+ts[1])
      d.setUTCSeconds(+ts[2])
      d.setUTCMilliseconds(0)
      return d.getTime()
      return [d.getTime(), d.toUTCString(), ds, ts, tz]
    }
    Object.keys = Object.keys
      || function (o) { var a = []
                        for (var i in o) a.push(i)
                        return a }
  }

  return { code : 200
         , body : toJSON([require("semver").expression.toString(), typeof ("asdf".match),
          require("semver").clean("0.2.4-1"),
          require("semver").valid("0.2.4-1"),
          new Date().toISOString(),"hi",require("valid")
         ])
         , headers : {}
         }
}

ddoc.rewrites =
  [ { from: "/", to:"_list/index/listAll", method: "GET" }
  , { from: "/-/jsonp/:jsonp", to:"_list/index/listAll", method: "GET" }

  , { from: "/-/all", to:"_list/index/listAll", method: "GET" }
  , { from: "/-/all/-/jsonp/:jsonp", to:"_list/index/listAll", method: "GET" }

  , { from: "/-/short", to:"_list/short/listAll", method: "GET" }

  , { from : "/favicon.ico", to:"../../npm/favicon.ico", method:"GET" }

  // DEPRECATED: Remove when npm dings 0.3.x
  , { from: "/adduser/:user", to:"../../../_users/:user", method: "PUT" }
  , { from: "/adduser/:user/-rev/:rev", to:"../../../_users/:user", method: "PUT" }
  , { from: "/getuser/:user", to:"../../../_users/:user", method: "GET" }

  , { from: "/-/users", to:"../../../_users/_design/_auth/_list/index/listAll"
    , method: "GET" }
  , { from: "/-/user/:user", to:"../../../_users/:user", method: "PUT" }
  , { from: "/-/user/:user/-rev/:rev", to:"../../../_users/:user"
    , method: "PUT" }

  , { from: "/-/user/:user", to:"../../../_users/:user", method: "GET" }

  , { from: "/-/user-by-email/:email"
    , to:"../../../_users/_design/_auth/_list/email/listAll"
    , method: "GET" }

  , { from: "/-/by-user/:user", to: "_list/byUser/byUser", method: "GET" }

  , { from: "/:pkg", to: "/_show/package/:pkg", method: "GET" }
  , { from: "/:pkg/-/jsonp/:jsonp", to: "/_show/package/:pkg", method: "GET" }
  , { from: "/:pkg/:version", to: "_show/package/:pkg", method: "GET" }
  , { from: "/:pkg/:version/-/jsonp/:jsonp", to: "_show/package/:pkg"
    , method: "GET" }

  , { from: "/:pkg/-/:att", to: "../../:pkg/:att", method: "GET" }
  , { from: "/:pkg/-/:att/:rev", to: "../../:pkg/:att", method: "PUT" }
  , { from: "/:pkg/-/:att/-rev/:rev", to: "../../:pkg/:att", method: "PUT" }
  , { from: "/:pkg/-/:att/:rev", to: "../../:pkg/:att", method: "DELETE" }
  , { from: "/:pkg/-/:att/-rev/:rev", to: "../../:pkg/:att", method: "DELETE" }

  , { from: "/:pkg", to: "/_update/package/:pkg", method: "PUT" }
  , { from: "/:pkg/-rev/:rev", to: "/_update/package/:pkg", method: "PUT" }
  , { from: "/:pkg/:version", to: "_update/package/:pkg", method: "PUT" }
  , { from: "/:pkg/:version/-tag/:tag", to: "_update/package/:pkg"
    , method: "PUT" }
  , { from: "/:pkg/:version/-pre/:pre", to: "_update/package/:pkg"
    , method: "PUT" }

  , { from: "/:pkg/-rev/:rev", to: "../../:pkg", method: "DELETE" }
  ]

ddoc.lists.short = function (head, req) {
  var out = {}
    , row
  while (row = getRow()) {
    if (!row.id) continue
    out[row.id] = true
  }
  send(toJSON(Object.keys(out)))
}

ddoc.lists.index = function (head, req) {
  var row
    , out = {}
    , semver = require("semver")

  if (!String.prototype.trim) {
    String.prototype.trim = function () {
      return this.replace(/^\s+|\s+$/g, "")
    }
  }
  while (row = getRow()) {
    if (!row.id) continue
    var p = out[row.id] = {}
      , doc = row.value
    // legacy kludge
    delete doc.mtime
    delete doc.ctime
    if (doc.versions) for (var v in doc.versions) {
      var clean = semver.clean(v)
      delete doc.versions[v].ctime
      delete doc.versions[v].mtime
      if (clean !== v) {
        var x = doc.versions[v]
        delete doc.versions[v]
        x.version = v = clean
        doc.versions[clean] = x
      }
    }
    if (doc["dist-tags"]) for (var tag in doc["dist-tags"]) {
      var clean = semver.clean(doc["dist-tags"][tag])
      if (!clean) delete doc["dist-tags"][tag]
      else doc["dist-tags"][tag] = clean
    }
    // end kludge

    for (var i in doc) {
      if (i === "versions" || i.charAt(0) === "_") continue
      p[i] = doc[i]
    }
    p.versions = {}
    if (doc.repositories && Array.isArray(doc.repositories)) {
      doc.repository = doc.repositories[0]
      delete doc.repositories
    }
    if (doc.repository) p.repository = doc.repository
    if (doc.description) p.description = doc.description
    if (doc.url) p.url = doc.url
    else {
      for (var i in doc.versions) {
        if (doc.versions[i].repository && !doc.repository) {
          p.repository = doc.versions[i].repository
        }
        var md = p.description
          , vd = doc.versions[i].description
        md = md && md.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
        vd = vd && vd.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
        if (vd && vd !== md) {
          p.descriptions = p.descriptions || {}
          p.descriptions[i] = doc.versions[i].description
          if (!p.description) {
            p.description = doc.versions[i].description
          }
        }
        if (doc.versions[i].keywords) p.keywords = doc.versions[i].keywords
        p.versions[i] = "http://"+req.headers.Host+"/"+doc.name+"/"+i
      }
      p.url = "http://"+req.headers.Host+"/"+encodeURIComponent(doc.name)+"/"
    }
  }
  out = req.query.jsonp
      ? req.query.jsonp + "(" + JSON.stringify(out) + ")"
      : toJSON(out)

  send(out)
}
ddoc.views.listAll = {
  map : function (doc) { return emit(doc._id, doc) }
}

ddoc.views.nodeWafInstall = {
  map : function (doc) {
    if (!doc || !doc.versions || !doc["dist-tags"]) return
    var v = doc["dist-tags"].latest
    if (!doc.versions[v]) return
    if (!doc.versions[v].scripts) return
    for (var i in doc.versions[v].scripts) {
      if (doc.versions[v].scripts[i].indexOf("node-waf") !== -1 ||
          doc.versions[v].scripts[i].indexOf("make") !== -1) {
        emit(doc._id, doc.versions[v]._id)
        return
      }
    }
  }
}

ddoc.views.badBins = {
  map : function (doc) {
    if (!doc || !doc.versions || !doc["dist-tags"]) return
    var v = doc["dist-tags"].latest
    if (!doc.versions[v]) return
    v = doc.versions[v]
    var b = v.bin
      , d = v.directories && v.directories.bin
    if (!b && !d) return
    if (b && (typeof b === "string" || Object.keys(b).length === 1)) {
      // it's ok.
      return
    }
    emit(doc._id, {binHash:b, binDir:d})
  }
}


ddoc.views.orphanAttachments = {
  map : function (doc) {
    if (!doc || !doc._attachments) return
    var orphans = []
      , size = 0
    for (var i in doc._attachments) {
      var n = i.substr(doc._id.length + 1).replace(/\.tgz$/, "")
               .replace(/^v/, "")
      if (!doc.versions[n] && i.match(/\.tgz$/)) {
        orphans.push(i)
        size += doc._attachments[i].length
      }
    }
    if (orphans.length) emit(doc._id, {size:size, orphans:orphans})
  }
}

ddoc.views.noMain =
  { map : function (doc) {
      if (!doc || !doc.versions) return
      var obj = {}
      for (var i in doc.versions) {
        if (doc.versions[i].main) return
        if (!doc.versions[i].overlay &&
            !( doc.modules )) continue
        obj[i] = doc.versions[i].directories.lib
      }
      var m = doc.maintainers[0]
      emit(m.email, doc._id)
    }
  , reduce : function (keys, values, rereduce) {
      var out = {}
      if (!rereduce) {
        keys.forEach(function (key, i, keys) {
          var val = values[i]
          key = key[0]
          out[key] = out[key] || []
          out[key].push(val)
        })
      } else {
        // values is an array of previous "out" objects.
        // merge them all together.
        values.forEach(function (val) {
          val.forEach(function (kv) {
            var i = kv[0], val = kv[1]
            out[i] = out[i] || []
            out[i] = out[i].concat(val)
          })
        })
      }
      // now make out into an array of [key,val] pairs
      // because erlang fucks idiots.
      return out
   }
}

ddoc.lists.passthrough = function (head, req) {
  var out = {}
    , row
  while (row = getRow()) {
    if (!row.id) continue
    out[row.id] = row.value
  }
  send(toJSON(out))
}

ddoc.views.byUser = { map : function (doc) {
  if (!doc || !doc.maintainers) return
  doc.maintainers.forEach(function (m) {
    emit(m.name, doc._id)
  })
}}

ddoc.lists.byUser = function (head, req) {
  var out = {}
    , user = req.query.user && req.query.user !== "-" ? req.query.user : null
    , users = user && user.split("|")
  while (row = getRow()) {
    if (!user || users.indexOf(row.key) !== -1) {
      var l = out[row.key] = out[row.key] || []
      l.push(row.value)
    }
  }
  send(toJSON(out))
}

ddoc.views.howBigIsYourPackage = {
  map : function (doc) {
    var s = 0
      , c = 0
    if (!doc) return
    for (var i in doc._attachments) {
      s += doc._attachments[i].length
      c ++
    }
    if (s === 0) return
    emit (doc._id, {_id: doc._id, size: s, count: c, avg: s/c})
  }
}

ddoc.lists.size = function (head, req) {
  var row
    , out = []
    , max = 0
  while (row = getRow()) {
    if (!row.id) continue
    out.push(row.value)
  }
  var list = []
  out = out.sort(function (a, b) {
             max = Math.max(max, a.size, b.size)
             return a.size > b.size ? -1 : 1
           })
           .reduce(function (l, r) {
             var stars = new Array(Math.ceil(80 * (r.size/max)) + 1).join("\u25FE")
             l[r._id] = { size: r.size
                        , count: r.count
                        , avg: r.avg
                        , rel: r.size / max
                        , s: stars
                        }
             return l
           }, {})
  send(JSON.stringify(out))
}

ddoc.lists.histogram = function (head, req) {
  start({"code": 200, "headers": {"Content-Type": "text/plain"}});
  var row
    , out = []
    , max = {}
    , field = req.query.field
    , sort = req.query.sort
    , doAll = !field

  while (row = getRow()) {
    if (!row.id) continue
    out.push(row.value)
  }

  if (!doAll) out.sort(function (a, b) {
    max[field] = Math.max(max[field] || -Infinity, a[field], b[field])
    return a[field] > b[field] ? -1 : 1
  })
  else out.sort(function (a, b) {
    for (var field in a) if (field.charAt(0) !== "_" && !isNaN(a[field])) {
      max[field] = Math.max(max[field] || -Infinity, a[field])
    }
    for (var field in b) if (field.charAt(0) !== "_" && !isNaN(b[field])) {
      max[field] = Math.max(max[field] || -Infinity, b[field])
    }
    if (sort) {
      return Number(a[sort]) > Number(b[sort]) ? -1 : 1
    } else {
      return 0
    }
  })
  if (doAll) {
    // sort the fields by the max sizes.
    var m = {}
    Object.keys(max).sort(function (a, b) {
      return max[a] > max[b] ? -1 : 1
    }).forEach(function (k) { m[k] = max[k] })
    max = m
  }
  out = out.map(function (a) {
    var o = {}
    for (var f in max) {
      var blk = new Array(Math.ceil(80*(a[f] / max[f])+1)).join("#")
        , spc = new Array(80 - blk.length + 1).join(" ")
      o[f] = spc + blk + " " + a[f]
    }
    o._id = a._id
    return o
  }).reduce(function (l, r) {
    l[r._id] = r
    return l
  }, {})

  var spc = new Array(82).join(" ")
  send(Object.keys(out).map(function (i) {
    if (doAll) return [spc + i].concat(Object.keys(max).map(function (f) {
      return out[i][f] + " " + f
    })).join("\n") + "\n"
    return out[i][field] + " " + i
  }).join("\n"))
}


ddoc.shows.package = function (doc, req) {
  if (!Date.prototype.toISOString) {
    function ISODateString(d){
      function pad(n){return n<10 ? '0'+n : n}
      return d.getUTCFullYear()+'-'
           + pad(d.getUTCMonth()+1)+'-'
           + pad(d.getUTCDate())+'T'
           + pad(d.getUTCHours())+':'
           + pad(d.getUTCMinutes())+':'
           + pad(d.getUTCSeconds())+'Z'}
    Date.prototype.toISOString = function () { return ISODateString(this) }
    Date.parse = function (s) {
      // s is something like "2010-12-29T07:31:06Z"
      s = s.split("T")
      var ds = s[0]
        , ts = s[1]
        , d = new Date()
      ds = ds.split("-")
      ts = ts.split(":")
      var tz = ts[2].substr(2)
      ts[2] = ts[2].substr(0, 2)
      d.setUTCFullYear(+ds[0])
      d.setUTCMonth(+ds[1]-1)
      d.setUTCDate(+ds[2])
      d.setUTCHours(+ts[0])
      d.setUTCMinutes(+ts[1])
      d.setUTCSeconds(+ts[2])
      d.setUTCMilliseconds(0)
      return d.getTime()
      return [d.getTime(), d.toUTCString(), ds, ts, tz]
    }
    Object.keys = Object.keys
      || function (o) { var a = []
                        for (var i in o) a.push(i)
                        return a }
  }

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
  if (doc.url) {
    // the package specifies a URL, redirect to it
    code = 301
    var url = doc.url
    if (req.query.version) {
      url += '/' + req.query.version // add the version to the URL if necessary
      delete req.query.version // stay out of the version branch below
    }
    headers.Location = url
    doc = { location: url, _rev: doc._rev }
  }
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
      var t = doc.versions[v].dist.tarball
      t = t.replace(/^https?:\/\/[^\/:]+(:[0-9]+)?/, '')
      if (!t.match(/^\/[^\/]+\/_design\/app\/_rewrite/)) {
        doc.versions[v].dist.tarball = t
        // doc.versions[v].dist._headers = req.headers
        // doc.versions[v].dist._query = req.query
        // doc.versions[v].dist._path = req.path
        // doc.versions[v].dist._requested_path = req.requested_path
        var h
        for (var i in req.headers) {
          if (i.toLowerCase() === 'host') {
            h = req.headers[i]
            break
          }
        }
        h = h ? 'http://' + h : ""
        doc.versions[v].dist.tarball = h + t
      }
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
    if (!semver.valid(ver)) {
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
    headers : headers,
  }
}

ddoc.updates.package = function (doc, req) {
  function ISODateString(d){
   function pad(n){return n<10 ? '0'+n : n}
   return d.getUTCFullYear()+'-'
        + pad(d.getUTCMonth()+1)+'-'
        + pad(d.getUTCDate())+'T'
        + pad(d.getUTCHours())+':'
        + pad(d.getUTCMinutes())+':'
        + pad(d.getUTCSeconds())+'Z'}
  if (!Date.prototype.toISOString) {
    Date.prototype.toISOString = function () { return ISODateString(this) }
    Date.parse = function (s) {
      // s is something like "2010-12-29T07:31:06Z"
      s = s.split("T")
      var ds = s[0]
        , ts = s[1]
        , d = new Date()
      ds = ds.split("-")
      ts = ts.split(":")
      var tz = ts[2].substr(2)
      ts[2] = ts[2].substr(0, 2)
      d.setUTCFullYear(+ds[0])
      d.setUTCMonth(+ds[1]-1)
      d.setUTCDate(+ds[2])
      d.setUTCHours(+ts[0])
      d.setUTCMinutes(+ts[1])
      d.setUTCSeconds(+ts[2])
      d.setUTCMilliseconds(0)
      return d.getTime()
      return [d.getTime(), d.toUTCString(), ds, ts, tz]
    }
    Object.keys = Object.keys
      || function (o) { var a = []
                        for (var i in o) a.push(i)
                        return a }
  }

  var semver = require("semver")
  var valid = require("valid")
  function error (reason) {
    return [{forbidden:reason}, JSON.stringify({forbidden:reason})]
  }

  function ok (doc, message) {
    delete doc.mtime
    delete doc.ctime
    var time = doc.time = doc.time || {}
    time.modified = (new Date()).toISOString()
    time.created = time.created || time.modified
    for (var v in doc.versions) {
      var ver = doc.versions[v]
      delete ver.ctime
      delete ver.mtime
      time[v] = time[v] || (new Date()).toISOString()
    }
    return [doc, JSON.stringify({ok:message})]
  }

  if (doc) {
    if (req.query.version) {
      if (doc.url) {
        return error(doc.name+" is hosted elsewhere: "+doc.url)
      }
      var parsed = semver.valid(req.query.version)
      if (!parsed) {
        // it's a tag.
        var tag = req.query.version
          , ver = JSON.parse(req.body)
        if (!semver.valid(ver)) {
          return error("setting tag "+tag+" to invalid version: "+req.body)
        }
        doc["dist-tags"][tag] = semver.clean(ver)
        return ok(doc, "updated tag")
      }
      // adding a new version.
      var ver = req.query.version
      if (!semver.valid(ver)) {
        return error("invalid version: "+ver)
      }
      if ((ver in doc.versions) || (semver.clean(ver) in doc.versions)) {
        // attempting to overwrite an existing version.
        // not supported at this time.
        return error("cannot modify existing version")
      }
      var body = JSON.parse(req.body)
      if (!valid.name(body.name)) {
        return error( "Invalid name: "+JSON.stringify(body.name))
      }
      body.version = semver.clean(body.version)
      ver = semver.clean(ver)
      if (body.version !== ver) {
        return error( "version in doc doesn't match version in request: "
                    + JSON.stringify(body.version) + " !== " + JSON.stringify(ver))
      }
      body._id = body.name + "@" + body.version
      if (body.description) doc.description = body.description
      if (body.author) doc.author = body.author
      if (body.repository) doc.repository = body.repository
      var tag = req.query.tag || "latest"
      if (!req.query.pre) doc["dist-tags"][tag] = body.version
      doc.versions[ver] = body
      return ok(doc, "added version")
    }

    // update the package info
    var newdoc = JSON.parse(req.body)
      , changed = false
    if (doc._rev && doc._rev !== newdoc._rev) {
      return error( "must supply latest _rev to update existing package" )
    }
    if (newdoc.url && (newdoc.versions || newdoc["dist-tags"])) {
      return error("Do not supply versions or dist-tags for packages "+
                   "hosted elsewhere. Just a URL is sufficient.")
    }
    for (var i in newdoc) if (typeof newdoc[i] === "string" || i === "maintainers") {
      doc[i] = newdoc[i]
    }
    if (newdoc.versions) {
      doc.versions = newdoc.versions
    }
    if (newdoc["dist-tags"]) {
      doc["dist-tags"] = newdoc["dist-tags"]
    }
    return ok(doc, "updated package metadata")
  } else {
    // Create new package doc
    doc = JSON.parse(req.body)
    if (!doc._id) doc._id = doc.name
    if (doc.url) {
      if (doc.versions || doc["dist-tags"]) {
        return error("Do not supply versions or dist-tags for packages "+
                     "hosted elsewhere. Just a URL is sufficient.")
      }
      return ok(doc, "created new entry")
    }
    if (!doc.versions) doc.versions = {}
    var latest
    for (var v in doc.versions) {
      if (!semver.valid(v)) return error("Invalid version: "+JSON.stringify(v))
      var p = doc.versions[p]
      if (p.version !== v) return error("Version mismatch: "+JSON.stringify(v)
                                       +" !== "+JSON.stringify(p.version))
      if (!valid.name(p.name)) return error("Invalid name: "+JSON.stringify(p.name))
      latest = semver.clean(v)
    }
    if (latest) doc["dist-tags"].latest = latest
    if (!doc['dist-tags']) doc['dist-tags'] = {}
    return ok(doc, "created new entry")
  }
}

ddoc.validate_doc_update = function (newDoc, oldDoc, user) {
  function ISODateString(d){
   function pad(n){return n<10 ? '0'+n : n}
   return d.getUTCFullYear()+'-'
        + pad(d.getUTCMonth()+1)+'-'
        + pad(d.getUTCDate())+'T'
        + pad(d.getUTCHours())+':'
        + pad(d.getUTCMinutes())+':'
        + pad(d.getUTCSeconds())+'Z'}
  if (!Date.prototype.toISOString) {
    Date.prototype.toISOString = function () { return ISODateString(this) }
    Date.parse = function (s) {
      // s is something like "2010-12-29T07:31:06Z"
      s = s.split("T")
      var ds = s[0]
        , ts = s[1]
        , d = new Date()
      ds = ds.split("-")
      ts = ts.split(":")
      var tz = ts[2].substr(2)
      ts[2] = ts[2].substr(0, 2)
      d.setUTCFullYear(+ds[0])
      d.setUTCMonth(+ds[1]-1)
      d.setUTCDate(+ds[2])
      d.setUTCHours(+ts[0])
      d.setUTCMinutes(+ts[1])
      d.setUTCSeconds(+ts[2])
      d.setUTCMilliseconds(0)
      return d.getTime()
      return [d.getTime(), d.toUTCString(), ds, ts, tz]
    }
    Object.keys = Object.keys
      || function (o) { var a = []
                        for (var i in o) a.push(i)
                        return a }
  }

  Array.isArray = Array.isArray
    || function (a) { return a instanceof Array
                        || (typeof a === "object" && typeof a.length === "number") }
  var semver = require("semver")
  var valid = require("valid")
  // admins can do ANYTHING (even break stuff)
  if (isAdmin()) return

  function assert (ok, message) {
    if (!ok) throw {forbidden:message}
  }

  // if the newDoc is an {error:"blerg"}, then throw that right out.
  // something detected in the _updates/package script.
  assert(!newDoc.forbidden || newDoc._deleted, newDoc.forbidden)

  function validUser () {
    if ( !oldDoc || !oldDoc.maintainers ) return true
    if (isAdmin()) return true
    if (typeof oldDoc.maintainers !== "object") return true
    for (var i = 0, l = oldDoc.maintainers.length; i < l; i ++) {
      if (oldDoc.maintainers[i].name === user.name) return true
    }
    return false
  }
  function isAdmin () { return user.roles.indexOf("_admin") >= 0 }

  assert(validUser(), "user: " + user.name + " not authorized to modify "
                      + newDoc.name )
  if (newDoc._deleted) return

  assert(newDoc._id, "Empty id not allowed")

  assert(Array.isArray(newDoc.maintainers),
         "maintainers should be a list of owners")
  newDoc.maintainers.forEach(function (m) {
    assert(m.name && m.email, "Maintainer should have name and email: "+
           JSON.stringify(m))
  })

  assert(!newDoc.ctime,
         "ctime is deprecated. Use time.created.")
  assert(!newDoc.mtime,
         "mtime is deprecated. Use time.modified.")
  assert(newDoc.time, "time object required. {created, modified}")
  var c = new Date(Date.parse(newDoc.time.created))
    , m = new Date(Date.parse(newDoc.time.modified))
  assert(c.toString() !== "Invalid Date" &&
         m.toString() !== "Invalid Date", "invalid created/modified time: "
         + JSON.stringify(newDoc.time)
         + " " + c.toString() + " " + m.toString())

  var n = valid.name(newDoc.name)
  assert(valid.name(n) && n === newDoc.name && n
        , "Invalid name: "
          + JSON.stringify(newDoc.name)
          + " may not start with '.' or contain '/' or '@' or whitespace")
  assert(newDoc.name === newDoc._id,
         "Invalid _id: " + JSON.stringify(newDoc._id) + "\n" +
         "Must match 'name' field ("+JSON.stringify(newDoc.name)+")")
  if (newDoc.url) {
    assert(!newDoc["dist-tags"], "redirected packages can't have dist-tags")
    assert(!newDoc.versions, "redirected packages can't have versions")
    return
  }
  // make sure all the dist-tags and versions are valid semver
  assert(newDoc["dist-tags"], "must have dist-tags")
  assert(newDoc.versions, "must have versions")

  for (var i in newDoc["dist-tags"]) {
    assert(semver.valid(newDoc["dist-tags"][i]),
      "dist-tag "+i+" is not a valid version: "+newDoc["dist-tags"][i])
    assert(newDoc["dist-tags"][i] in newDoc.versions,
      "dist-tag "+i+" refers to non-existent version: "+newDoc["dist-tags"][i])
  }
  for (var i in newDoc.versions) {
    assert(semver.valid(i), "version "+i+" is not a valid version")
  }
}
