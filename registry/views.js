
var views = module.exports = exports = {}

views.updated = {map: function (doc) {
  var l = doc["dist-tags"].latest
    , t = doc.time && doc.time[l]
  if (t) emit(t, 1)
}}

views.listAll = {
  map : function (doc) { return emit(doc._id, doc) }
}

views.modified = { map: modifiedTimeMap }
function modifiedTimeMap (doc) {
  if (!doc.versions) return
  var latest = doc["dist-tags"].latest
  if (!doc.versions[latest]) return
  var time = doc.time && doc.time[latest] || 0
  var t = new Date(time)
  emit(t.getTime(), doc)
}

views.byEngine = {
  map: function (doc) {
    if (!doc || !doc.versions || !doc["dist-tags"]) return
    var v = doc["dist-tags"].latest
    var d = doc.versions[v]
    if (d && d.engines) emit(doc._id, [d.engines, doc.maintainers])
  }
}

views.countVersions = { map: function (doc) {
  if (!doc || !doc.name) return
  var i = 0
  if (!doc.versions) return emit([i, doc._id], 1)
  for (var v in doc.versions) i++
  emit([i, doc._id], 1)
}, reduce: "_sum"}

views.byKeyword = {
  map: function (doc) {
    if (!doc || !doc.versions || !doc['dist-tags']) return
    var v = doc.versions[doc['dist-tags'].latest]
    if (!v || !v.keywords || !Array.isArray(v.keywords)) return
    v.keywords.forEach(function (kw) {
      emit([kw.toLowerCase(), doc.name, doc.description], 1)
    })
  }, reduce: "_sum"
}


views.byField = {
  map: function (doc) {
    if (!doc || !doc.versions || !doc["dist-tags"]) return
    var v = doc["dist-tags"].latest
    //Object.keys(doc.versions).forEach(function (v) {
      var d = doc.versions[v]
      if (!d) return
      //emit(d.name + "@" + d.version, d.dist.bin || {})
      var out = {}
      for (var i in d) {
        out[i] = d[i] //true
        if (d[i] && typeof d[i] === "object" &&
            (i === "scripts" || i === "directories")) {
          for (var j in d[i]) out[i + "." + j] = d[i][j]
        }
      }
      out.maintainers = doc.maintainers
      emit(doc._id, out)
    //})
  }
}

views.needBuild = {
  map : function (doc) {

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

views.scripts = {
  map : function (doc) {
    if (!doc || !doc.versions || !doc["dist-tags"]) return
    var v = doc["dist-tags"].latest
    if (!doc.versions[v]) return
    if (!doc.versions[v].scripts) return
    emit(doc._id, doc.versions[v].scripts)
  }
}

views.nodeWafInstall = {
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

views.badBins = {
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


views.orphanAttachments = {
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

views.starredByUser = { map : function (doc) {
  if (!doc || !doc.users) return
  Object.keys(doc.users).forEach(function (m) {
    if (!doc.users[m]) return
    emit(m, doc._id)
  })
}}

views.starredByPackage = { map : function (doc) {
  if (!doc || !doc.users) return
  Object.keys(doc.users).forEach(function (m) {
    if (!doc.users[m]) return
    emit(doc._id, m)
  })
}}

views.byUser = { map : function (doc) {
  if (!doc || !doc.maintainers) return
  doc.maintainers.forEach(function (m) {
    emit(m.name, doc._id)
  })
}}



views.browseAuthors = views.npmTop = { map: function (doc) {
  if (!doc || !doc.maintainers) return
  var l = doc['dist-tags'] && doc['dist-tags'].latest
  l = l && doc.versions && doc.versions[l]
  if (!l) return
  var desc = doc.description || l.description || ''
  var readme = doc.readme || l.readme || ''
  doc.maintainers.forEach(function (m) {
    emit([m.name, doc._id, desc, readme], 1)
  })
}, reduce: "_sum" }

views.browseUpdated = { map: function (doc) {
  if (!doc || !doc.versions) return
  var l = doc['dist-tags'] && doc['dist-tags'].latest
  if (!l) return
  var t = doc.time && doc.time[l]
  if (!t) return
  var v = doc.versions[l]
  if (!v) return
  var d = new Date(t)
  if (!d.getTime()) return
  emit([ d.toISOString(),
         doc._id,
         v.description,
         v.readme ], 1)
}, reduce: "_sum" }

views.browseAll = { map: function (doc) {
  if (!doc || !doc.versions) return
  var l = doc['dist-tags'] && doc['dist-tags'].latest
  if (!l) return
  l = doc.versions && doc.versions[l]
  if (!l) return
  var desc = doc.description || l.description || ''
  var readme = doc.readme || l.readme || ''
  emit([doc.name, desc, readme], 1)
}, reduce: '_sum' }

views.analytics = { map: function (doc) {
  if (!doc || !doc.time) return
  for (var i in doc.time) {
    var t = doc.time[i]
    var d = new Date(t)
    if (!d.getTime()) return
    var type = i === 'modified' ? 'latest'
             : i === 'created' ? 'created'
             : 'update'
    emit([ type,
           d.getUTCFullYear(),
           d.getUTCMonth() + 1,
           d.getUTCDate(),
           doc._id ], 1)
  }
}, reduce: '_sum' }

views.dependedUpon = { map: function (doc) {
  if (!doc) return
  var l = doc['dist-tags'] && doc['dist-tags'].latest
  if (!l) return
  l = doc.versions && doc.versions[l]
  if (!l) return
  var desc = doc.description || l.description || ''
  var readme = doc.readme || l.readme || ''
  var d = l.dependencies
  if (!d) return
  for (var dep in d) {
    emit([dep, doc._id, desc, readme], 1)
  }
}, reduce: '_sum' }

views.browseStarUser = { map: function (doc) {
  if (!doc) return
  var l = doc['dist-tags'] && doc['dist-tags'].latest
  if (!l) return
  l = doc.versions && doc.versions[l]
  if (!l) return
  var desc = doc.description || l.description || ''
  var readme = doc.readme || l.readme || ''
  var d = doc.users
  if (!d) return
  for (var user in d) {
    emit([user, doc._id, desc, readme], 1)
  }
}, reduce: '_sum' }

views.browseStarPackage = { map: function (doc) {
  if (!doc) return
  var l = doc['dist-tags'] && doc['dist-tags'].latest
  if (!l) return
  l = doc.versions && doc.versions[l]
  if (!l) return
  var desc = doc.description || l.description || ''
  var readme = doc.readme || l.readme || ''
  var d = doc.users
  if (!d) return
  for (var user in d) {
    emit([doc._id, desc, user, readme], 1)
  }
}, reduce: '_sum' }


views.fieldsInUse = { map : function (doc) {
  if (!doc.versions || !doc["dist-tags"] || !doc["dist-tags"].latest) {
    return
  }
  var d = doc.versions[doc["dist-tags"].latest]
  if (!d) return
  for (var f in d) {
    emit(f, 1)
    if (d[f] && typeof d[f] === "object" &&
        (f === "scripts" || f === "directories")) {
      for (var i in d[f]) emit(f+"."+i, 1)
    }
  }
} , reduce : "_sum" }

views.howBigIsYourPackage = {
  map : function (doc) {
    var s = 0
      , c = 0
    if (!doc) return
    for (var i in doc._attachments) {
      s += doc._attachments[i].length
      c ++
    }
    if (s === 0) return
    emit(doc._id, {_id: doc._id, size: s, count: c, avg: s/c})
  }
}
