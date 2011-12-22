var lists = module.exports = {}

lists.short = function (head, req) {
  require("monkeypatch").patch(Object, Date, Array, String)

  var out = {}
    , row
    , show = (req.query.show || "").split(",")
    , v = show.indexOf("version") !== -1
    , t = show.indexOf("tag") !== -1
  while (row = getRow()) {
    if (!row.id) continue
    if (!t && !v) {
      out[row.id] = true
      continue
    }
    var val = row.value
    if (t) Object.keys(val["dist-tags"] || {}).forEach(function (t) {
      out[row.id + "@" + t] = true
    })
    if (v) Object.keys(val.versions || {}).forEach(function (v) {
      out[row.id + "@" + v] = true
    })
  }
  send(toJSON(Object.keys(out)))
}

lists.rss = function (head, req) {
  var limit = +req.query.limit
    , desc = req.query.descending
  if (!desc || !limit || limit > 50 || limit < 0) {
    start({ code: 403
           , headers: { 'Content-type': 'text/xml' }})
    send('<error><![CDATA[Please retry your request with '
        + '?descending=true&limit=50 query params]]></error>')
    return
  }

  start({ code: 200
        // application/rss+xml is correcter, but also annoyinger
        , headers: { "Content-Type": "text/xml" } })
  send('<?xml version="1.0" encoding="UTF-8"?>'
      +'\n<!DOCTYPE rss PUBLIC "-//Netscape Communications//DTD RSS 0.91//EN" '
        +'"http://my.netscape.com/publish/formats/rss-0.91.dtd">'
      +'\n<rss version="0.91">'
      +'\n  <channel>'
      +'\n    <title>npm recent updates</title>'
      +'\n    <link>http://search.npmjs.org/</link>'
      +'\n    <description>Updates to the npm package registry</description>'
      +'\n    <language>en</language>')

  var row
  while (row = getRow()) {
    if (!row.value || !row.value["dist-tags"]) continue

    var doc = row.value
    var authors = doc.maintainers.map(function (m) {
      return '<author>' + m.name + '</author>'
    }).join('\n      ')

    var latest = doc["dist-tags"].latest
    var time = doc.time && doc.time[latest]
    var date = new Date(time)
    doc = doc.versions[latest]
    if (!doc || !time || !date) continue

    var url = doc.homepage
      , repo = doc.repository || doc.repositories
    if (!url && repo) {
      if (Array.isArray(repo)) repo = repo.shift()
      if (repo.url) repo = repo.url
      if (repo && (typeof repo === "string")) {
        url = repo.replace(/^git(@|:\/\/)/, 'http://')
                  .replace(/\.git$/, '')+"#readme"
      }
    }
    if (!url) url = "http://search.npmjs.org/#/" + doc.name

    send('\n    <item>'
        +'\n      <title>' + doc._id + '</title>'
        +'\n      <link>' + url + '</link>'
        +'\n      ' + authors
        +'\n      <description><![CDATA['
          + (doc.description || '').trim() + ']]></description>'
        +'\n      <pubDate>' + date.toISOString() + '</pubDate>'
        +'\n    </item>')
  }
  send('\n  </channel>'
      +'\n</rss>')
}



lists.index = function (head, req) {
  require("monkeypatch").patch(Object, Date, Array, String)
  var basePath = req.requested_path
  if (basePath.indexOf("_list") === -1) basePath = ""
  else {
    basePath = basePath.slice(0, basePath.indexOf("_list"))
                       .concat(["_rewrite", ""]).join("/")
  }

  var row
    , out = {}
    , semver = require("semver")

  while (row = getRow()) {
    if (!row.id) continue

    var doc = row.value
    if (!doc.name || !doc._id) continue

    var p = out[doc._id] = {}

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
    p.dist = {}
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
        if (doc.versions[i].keywords) p.keywords = doc.versions[i].keywords

        p.versions[i] = "http://"+req.headers.Host+"/"+
                        basePath +
                        encodeURIComponent(doc.name)+"/"+i
        p.dist[i] = doc.versions[i].dist
      }
      p.url = "http://"+req.headers.Host+"/"+
              basePath +
              encodeURIComponent(doc.name)+"/"
    }
  }
  out = req.query.jsonp
      ? req.query.jsonp + "(" + JSON.stringify(out) + ")"
      : toJSON(out)

  send(out)
}


lists.byField = function (head, req) {
  require("monkeypatch").patch(Object, Date, Array, String)

  if (!req.query.field) {
    start({"code":"400", "headers": {"Content-Type": "application/json"}})
    send('{"error":"Please specify a field parameter"}')
    return
  }

  start({"code": 200, "headers": {"Content-Type": "application/json"}})
  var row
    , out = {}
    , field = req.query.field
    , not = field.charAt(0) === "!"
  if (not) field = field.substr(1)
  while (row = getRow()) {
    if (!row.id) continue
    var has = row.value.hasOwnProperty(field)
    if (!not && !has || not && has) continue
    out[row.key] = { "maintainers": row.value.maintainers.map(function (m) {
      return m.name + " <" + m.email + ">"
    }) }
    if (has) out[row.key][field] = row.value[field]
  }
  send(JSON.stringify(out))
}



lists.preBuilt = function (head, req) {
  start({"code": 200, "headers": {"Content-Type": "text/plain"}});
  var row
    , out = []
  while (row = getRow()) {
    if (!row.id) continue
    if (!(req.query.bindist && row.value[req.query.bindist])) continue
    out.push(row.key)
  }
  send(out.join("\n"))
}

lists.needBuild = function (head, req) {
  start({"code": 200, "headers": {"Content-Type": "text/plain"}});
  var row
    , first = true
  while (row = getRow()) {
    if (!row.id) continue
    if (req.query.bindist && row.value[req.query.bindist]) continue
    // out.push(row.key)
    send((first ? "{" : ",")
        + JSON.stringify(row.key)
        + ":"
        + JSON.stringify(Object.keys(row.value))
        + "\n")
    first = false
  }
  send("}\n")
}

lists.scripts = function (head, req) {
  var row
    , out = {}
    , scripts = req.query.scripts && req.query.scripts.split(",")
  while (row = getRow()) {
    inc = true
    if (!row.id) continue
    if (req.query.package && row.id !== req.query.package) continue
    if (scripts && scripts.length) {
      var inc = false
      for (var s = 0, l = scripts.length; s < l && !inc; s ++) {
        inc = row.value[scripts[s]]
      }
      if (!inc) continue
    }
    out[row.id] = row.value
  }
  send(toJSON(out))
}


lists.rowdump = function (head, req) {
  var rows = []
  while (row = getRow()) rows.push(row)
  send(toJSON(rows))
}

lists.passthrough = function (head, req) {
  var out = {}
    , row
  while (row = getRow()) {
    if (!row.id) continue
    out[row.id] = row.value
  }
  send(toJSON(out))
}

lists.byUser = function (head, req) {
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

lists.sortCount = function (head, req) {
  var out = []
  while (row = getRow()) {
    out.push([row.key, row.value])
  }
  out = out.sort(function (a, b) {
    return a[1] === b[1] ? 0
         : a[1] < b[1] ? 1 : -1
  })
  var outObj = {}
  for (var i = 0, l = out.length; i < l; i ++) {
    outObj[out[i][0]] = out[i][1]
  }
  send(toJSON(outObj))
}

lists.size = function (head, req) {
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

lists.histogram = function (head, req) {
  require("monkeypatch").patch(Object, Date, Array, String)
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

