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
  [ { from: "/", to:"_list/short/listAll", method: "GET" }
  , { from: "/-/jsonp/:jsonp", to:"_list/short/listAll", method: "GET" }

  , { from: "/-/all/since", to:"_list/index/modified", method: "GET" }

  , { from: "/-/rss", to: "_list/rss/modified"
    , method: "GET" }

  , { from: "/-/all", to:"_list/index/listAll", method: "GET" }
  , { from: "/-/search/:start/:end", to: "_list/search/search", method: "GET", query: { startkey: ':start', endkey: ':end' }}
  , { from: "/-/search/:start/:end/:limit", to: "_list/search/search", method: "GET", query: { startkey: ':start', endkey: ':end', limit: ':limit' }}
  , { from: "/-/all/-/jsonp/:jsonp", to:"_list/index/listAll", method: "GET" }

  , { from: "/-/searchterms", to: "_list/rowdump/searchterms", method: "GET" }

  , { from: "/-/short", to:"_list/short/listAll", method: "GET" }
  , { from: "/-/scripts", to:"_list/scripts/scripts", method: "GET" }

  , { from: "/-/needbuild", to:"_list/needBuild/needBuild", method: "GET" }
  , { from: "/-/prebuilt", to:"_list/preBuilt/needBuild", method: "GET" }

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
  , { from: "/:pkg/:version/-rev/:rev", to: "_update/package/:pkg"
    , method: "PUT" }

  , { from: "/:pkg/:version/-tag/:tag", to: "_update/package/:pkg"
    , method: "PUT" }
  , { from: "/:pkg/:version/-tag/:tag/-rev/:rev", to: "_update/package/:pkg"
    , method: "PUT" }

  , { from: "/:pkg/:version/-pre/:pre", to: "_update/package/:pkg"
    , method: "PUT" }
  , { from: "/:pkg/:version/-pre/:pre/-rev/:rev", to: "_update/package/:pkg"
    , method: "PUT" }

  , { from: "/:pkg/-rev/:rev", to: "../../:pkg", method: "DELETE" }
  ]

ddoc.lists.short = function (head, req) {
    Object.keys = Object.keys
      || function (o) { var a = []
                        for (var i in o) a.push(i)
                        return a }
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

ddoc.lists.rss = function (head, req) {
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
    var date = doc.time && doc.time.modified || doc.ctime
    if (!date) continue
    date = new Date(date)
    var authors = doc.maintainers.map(function (m) {
      return '<author>' + m.name + '</author>'
    }).join('\n      ')

    doc = doc.versions[doc["dist-tags"].latest]
    if (!doc) continue

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



ddoc.lists.index = function (head, req) {
  var basePath = req.requested_path
  if (basePath.indexOf("_list") === -1) basePath = ""
  else {
    basePath = basePath.slice(0, basePath.indexOf("_list"))
                       .concat(["_rewrite", ""]).join("/")
  }

  var row
    , out = {}
    , semver = require("semver")

  if (!String.prototype.trim) {
    String.prototype.trim = function () {
      return this.replace(/^\s+|\s+$/g, "")
    }
  }
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
  }

  while (row = getRow()) {
    if (!row.id) continue

    var doc = row.value

    var p = out[row.value._id] = {}

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
ddoc.views.listAll = {
  map : function (doc) { return emit(doc._id, doc) }
}

ddoc.views.modified = { map: modifiedTimeMap }
function modifiedTimeMap (doc) {
  var t = new Date(doc.time && doc.time.modified || doc.mtime || 0)
  emit(t.getTime(), doc)
}

// copied from the www project
ddoc.views.search = { map: searchMap }

function searchMap (doc) {
  var descriptionBlacklist =
    [ "for"
    , "and"
    , "in"
    , "are"
    , "is"
    , "it"
    , "do"
    , "of"
    , "on"
    , "the"
    , "to"
    , "as"
    ]


  if (doc.versions &&
      doc["dist-tags"] &&
      doc.name &&
      doc.versions[doc["dist-tags"].latest] &&
      true) {

    var d = doc.versions[doc["dist-tags"].latest]
    var words = [doc._id, d.name]

    if (d.name.indexOf("-") !== -1) {
      words.push.apply(words, d.name.split("-"))
    }
    if (d.name.indexOf("_") !== -1) {
      words.push.apply(words, d.name.split("_"))
    }
    if (d.name.indexOf(".") !== -1) {
      words.push.apply(words, d.name.split("."))
    }

    if (d.keywords) words.push.apply(words, d.keywords)

    if (d.description) {
      var desc = d.description.replace(/[\.\n\r`_"'\(\)\[\]\{\}\*%\+ ]+/g, " ")
      desc = desc.trim().split(/\s+/)
      words.push.apply(words, desc)
    }

    words = words.map(function (w) {
      return w.trim().toLowerCase()
    })
    //.reduce(function (set, word) {
    //  var ml = 4
    //  // add all substrings of word longer than ml chars
    //  for (var start = 0, len = word.length; start <= len - ml; start ++) {
    //    for (var end = start + ml; end <= len; end ++) {
    //      set.push(word.substring(start, end))
    //    }
    //  }
    //  return set
    //}, [])
    .filter(function (w) {
      return w.length >= 2 && descriptionBlacklist.indexOf(w) === -1
    })
    .sort(function (a, b) {
      return a > b ? 1 : -1
    })
    .reduce(function (set, word) {
      if (set[set.length - 1] !== word) set.push(word)
      return set
    }, [])

    // words.forEach(function (word) {
    //  emit(word, doc)
    // })

    var out = { searchWords: words }
    Object.keys(doc).forEach(function (k) {
      out[k] = doc[k]
    })
    words.forEach(function (word) {
      emit(word, out)
    })
    return
  }
}

ddoc.lists.search = function (head, req) {
  var set = {}
  var rows = []
  var row
  while (row = getRow()) {
    set[row.id] = { key: row.id
                  , count: set[row.id] ? set[row.id].count + 1 : 1
                  , searchWords: row.value.searchWords || "-none-"
                  , dname: row.value.dname || "-none-"
                  , value: row.value._id }
  }
  send(JSON.stringify(set))
}


ddoc.lists.preBuilt = function (head, req) {
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


ddoc.views.needBuild = {
  map : function (doc) {
    Object.keys = Object.keys
      || function (o) { var a = []
                        for (var i in o) a.push(i)
                        return a }
    if (!doc || !doc.versions || !doc["dist-tags"]) return
    var v = doc["dist-tags"].latest
    //Object.keys(doc.versions).forEach(function (v) {
      var d = doc.versions[v]
      if (!d) return
      if (!d.scripts) return
      var inst =  d.scripts.install
               || d.scripts.preinstall
               || d.scripts.postinstall
      if (!inst) return
      //emit(d.name + "@" + d.version, d.dist.bin || {})
      emit(d._id, d.dist.bin || {})
    //})
  }
}

ddoc.lists.needBuild = function (head, req) {
  start({"code": 200, "headers": {"Content-Type": "text/plain"}});
  var row
    , out = []
  while (row = getRow()) {
    if (!row.id) continue
    if (req.query.bindist && row.value[req.query.bindist]) continue
    out.push(row.key)
  }
  send(out.join("\n"))
}


ddoc.views.scripts = {
  map : function (doc) {
    if (!doc || !doc.versions || !doc["dist-tags"]) return
    var v = doc["dist-tags"].latest
    if (!doc.versions[v]) return
    if (!doc.versions[v].scripts) return
    emit(doc._id, doc.versions[v].scripts)
  }
}

ddoc.lists.scripts = function (head, req) {
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
    Object.keys = Object.keys
      || function (o) { var a = []
                        for (var i in o) a.push(i)
                        return a }
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

ddoc.lists.rowdump = function (head, req) {
  var rows = []
  while (row = getRow()) rows.push(row)
  send(toJSON(rows))
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
    Object.keys = Object.keys
      || function (o) { var a = []
                        for (var i in o) a.push(i)
                        return a }
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
    var url = doc.url
    if (req.query.version) {
      url += '/' + req.query.version // add the version to the URL if necessary
    }
    headers.Location = url
    body = { location: url, _rev: doc._rev }
    body = req.query.jsonp
         ? req.query.jsonp + "(" + JSON.stringify(body) + ")"
         : JSON.stringify(body)
    return {
      code : 301,
      body : body,
      headers : headers
    }
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
        // doc.versions[v].dist._req = req

        var basePath = req.requested_path
        if (basePath.indexOf("_show") === -1) basePath = ""
        else {
          basePath = "/" + basePath.slice(0, basePath.indexOf("_show"))
                             .concat(["_rewrite"]).join("/")
        }

        var h = "http://" + req.headers.Host

        doc.versions[v].dist.tarball = h + basePath + t
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
        if (!req.query.rev || req.query.rev !== doc._rev) {
          return error("cannot modify existing version")
        }
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

      var tag = req.query.tag
              || (body.publishConfig && body.publishConfig.tag)
              || body.tag
              || "latest"

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
    if (!doc['dist-tags']) doc['dist-tags'] = {}
    if (latest) doc["dist-tags"].latest = latest
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
