
module.exports = function (newDoc, oldDoc, user, dbCtx) {
  require("monkeypatch").patch(Object, Date, Array, String)

  var semver = require("semver")
  var valid = require("valid")
  var deep = require("deep")
  var ignoringDeepEquals = deep.ignoringDeepEquals


  if (oldDoc) oldDoc.users = oldDoc.users || {}
  newDoc.users = newDoc.users || {}

  // admins can do ANYTHING (even break stuff)
  if (isAdmin()) return

  function assert (ok, message) {
    if (!ok) throw {forbidden:message}
  }

  // if the newDoc is an {error:"blerg"}, then throw that right out.
  // something detected in the _updates/package script.
  assert(!newDoc.forbidden || newDoc._deleted, newDoc.forbidden)

  // everyone may alter his "starred" status on any package
  if (oldDoc && !newDoc._deleted &&
      ignoringDeepEquals(newDoc, oldDoc, [["users", user.name], ["time", "modified"]])) return

  // figure out what changed in the doc.
  function diffObj (o, n, p) {
    p = p || ""
    var d = []
    var seenKeys = []
    for (var i in o) {
      seenKeys.push(i)
      if (!(i in n)) {
        d.push("Deleted: "+p+i)
      }
      if (typeof o[i] !== typeof n[i]) {
        d.push("Changed Type: "+p+i)
      }
      if (typeof o[i] === "object" && o[i] && !n[i]) {
        d.push("Nulled: "+p+i)
      }
      if (typeof o[i] === "object" && !o[i] && n[i]) {
        d.push("Un-nulled: "+p+i)
      }
      if (typeof o[i] === "object") {
        d = d.concat(diffObj(o[i], n[i], p + i + "."))
      } else {
        if (o[i] !== n[i]) {
          d.push("Changed: "+p+i+" "+JSON.stringify(o[i]) + " -> "
                 +JSON.stringify(n[i]))
        }
      }
    }
    for (var i in n) {
      if (-1 === seenKeys.indexOf(i)) {
        d.push("Added: "+p+i)
      }
    }
    return d
  }

  function validUser () {
    if ( !oldDoc || !oldDoc.maintainers ) return true
    if (isAdmin()) return true
    if (typeof oldDoc.maintainers !== "object") return true
    for (var i = 0, l = oldDoc.maintainers.length; i < l; i ++) {
      if (oldDoc.maintainers[i].name === user.name) return true
    }
    return false
  }
  function isAdmin () {
    if (dbCtx &&
        dbCtx.admins) {
      if (dbCtx.admins.names &&
          dbCtx.admins.roles &&
          dbCtx.admins.names.indexOf(user.name) !== -1) return true
      for (var i=0;i<user.roles.length;i++) {
        if (dbCtx.admins.roles.indexOf(user.roles[i]) !== -1) return true
      }
    }
    return user.roles.indexOf("_admin") >= 0
  }

  var vu = validUser()
  if (!vu) {
    assert(vu, "user: " + user.name + " not authorized to modify "
                        + newDoc.name + "\n"
                        + diffObj(oldDoc, newDoc).join("\n"))
  }

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

  assert(ignoringDeepEquals(newDoc.users, (oldDoc || {users:{}}).users, [[user.name]]),
         "even the owner of a package may not fake 'star' data")
}

