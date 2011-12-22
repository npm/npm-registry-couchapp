
var views = module.exports = exports = {}

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


views.byField = {
  map: function (doc) {
    require("monkeypatch").patch(Object, Date, Array, String)
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

views.nonlocal = {
  map : function (doc) {
    if (doc.url) emit(doc._id, doc.name)
  }
}

views.needBuild = {
  map : function (doc) {
    // require("monkeypatch").patch(Object, Date, Array, String)

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
    require("monkeypatch").patch(Object, Date, Array, String)
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

views.byUser = { map : function (doc) {
  if (!doc || !doc.maintainers) return
  doc.maintainers.forEach(function (m) {
    emit(m.name, doc._id)
  })
}}

views.fieldsInUse =
{ map : function (doc) {
    if (!doc.versions || !doc["dist-tags"] || !doc["dist-tags"].latest) return
    var d = doc.versions[doc["dist-tags"].latest]
    if (!d) return
    for (var f in d) {
      emit(f, 1)
      if (d[f] && typeof d[f] === "object" &&
          (f === "scripts" || f === "directories")) {
        for (var i in d[f]) emit(f+"."+i, 1)
      }
    }
  }
, reduce : "_sum" }

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
