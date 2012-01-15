
module.exports = function (doc, oldDoc, user, dbCtx) {
  // can't write to the db without logging in.
  if (!user || !user.name) {
    throw { unauthorized: "Please log in before writing to the db" }
  }

  require("monkeypatch").patch(Object, Date, Array, String)

  var semver = require("semver")
  var valid = require("valid")
  var deep = require("deep")
  var deepEquals = deep.deepEquals


  if (oldDoc) oldDoc.users = oldDoc.users || {}
  doc.users = doc.users || {}


  function assert (ok, message) {
    if (!ok) throw {forbidden:message}
  }

  // admins can do ANYTHING (even break stuff)
  if (isAdmin()) return

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

  // if the doc is an {error:"blerg"}, then throw that right out.
  // something detected in the _updates/package script.
  // XXX: Make this not ever happen ever.  Validation belongs here,
  // not in the update function.
  assert(!doc.forbidden || doc._deleted, doc.forbidden)

  // everyone may alter his "starred" status on any package
  if (oldDoc &&
      !doc._deleted &&
      deepEquals(doc, oldDoc,
                 [["users", user.name], ["time", "modified"]])) {
    return
  }


  // check if the user is allowed to write to this package.
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
                        + doc.name + "\n"
                        + diffObj(oldDoc, doc).join("\n"))
  }

  // deleting a document entirely *is* allowed.
  if (doc._deleted) return

  // sanity checks.
  assert(valid.name(doc.name), "name invalid: "+doc.name)
  assert(doc.name === doc._id, "name must match _id")
  assert(!doc.mtime, "doc.mtime is deprecated")
  assert(!doc.ctime, "doc.ctime is deprecated")
  assert(typeof doc.time === "object", "time must be object")

  assert(typeof doc["dist-tags"] === "object", "dist-tags must be object")

  var versions = doc.versions
  assert(typeof versions === "object", "versions must be object")

  var latest = doc["dist-tags"].latest
  if (latest) {
    assert(versions[latest], "dist-tags.latest must be valid version")
  }

  for (var v in doc["dist-tags"]) {
    var ver = doc["dist-tags"][v]
    assert(semver.valid(ver),
           v + " version invalid version: " + ver)
    assert(versions[ver],
           v + " version missing: " + ver)
  }

  for (var ver in versions) {
    var version = versions[ver]
    assert(semver.valid(ver),
           "invalid version: " + ver)
    assert(typeof version === "object",
           "version entries must be objects")
    assert(version.version === ver,
           "version must match: "+ver)
    assert(version.name === doc._id,
           "version "+ver+" has incorrect name: "+version.name)
  }

  assert(Array.isArray(doc.maintainers),
         "maintainers should be a list of owners")
  doc.maintainers.forEach(function (m) {
    assert(m.name && m.email,
           "Maintainer should have name and email: " + JSON.stringify(m))
  })

  var time = doc.time
  var c = new Date(Date.parse(time.created))
    , m = new Date(Date.parse(time.modified))
  assert(c.toString() !== "Invalid Date",
         "invalid created time: " + JSON.stringify(time.created))

  assert(m.toString() !== "Invalid Date",
         "invalid modified time: " + JSON.stringify(time.modified))

  if (oldDoc &&
      oldDoc.time &&
      oldDoc.time.created &&
      Date.parse(oldDoc.time.created)) {
    assert(Date.parse(oldDoc.time.created) === Date.parse(time.created),
           "created time cannot be changed")
  }

  if (oldDoc && oldDoc.users) {
    assert(deepEquals(doc.users,
                      oldDoc.users, [[user.name]]),
           "you may only alter your own 'star' setting")
  }

  // This needs to stop.
  if (doc.url &&
      (!oldDoc || !oldDoc.url || doc.url !== oldDoc.url)) {
    assert(false,
           "Package redirection is deprecated, "+
           "and will be removed at some point.  "+
           "Please update your publish scripts.")
  }


  // at this point, we've passed the basic sanity tests.
  // Time to dig into more details.
  // Valid operations:
  // 1. Add a version
  // 2. Remove a version
  // 3. Modify a version
  // 4. Add or remove onesself from the "users" hash (already done)
  //
  // If a version is being added or changed, make sure that the
  // _npmUser field matches the current user, and that the
  // time object has the proper entry, and that the "maintainers"
  // matches the current "maintainers" field.
  //
  // Things that must not change:
  //
  // 1. More than one version being modified.
  // 2. Removing keys from the "time" hash
  //
  // Later, once we are off of the update function 3-stage approach,
  // these things should also be errors:
  //
  // 1. Lacking an attachment for any published version.
  // 2. Having an attachment for any version not published.

  var oldVersions = oldDoc ? oldDoc.versions || {} : {}
  var oldTime = oldDoc ? oldDoc.time || {} : {}

  var versions = Object.keys(doc.versions)
    , modified = null

  for (var i = 0, l = versions.length; i < l; i ++) {
    var v = versions[i]
    assert(doc.time[v], "must have time entry for "+v)

    if (!deepEquals(doc.versions[v], oldVersions[v], [["directories"], ["deprecated"]]) &&
        doc.versions[v]) {
      // this one was modified
      // if it's more than a few minutes off, then something is wrong.
      var t = Date.parse(doc.time[v])
        , n = Date.now()
      assert(doc.time[v] !== oldTime[v] &&
             Math.abs(n - t) < 1000 * 60 * 60,
             v + " time needs to be updated\n" +
             "new=" + JSON.stringify(doc.versions[v]) + "\n" +
             "old=" + JSON.stringify(oldVersions[v]))

      assert(doc.time[v] === doc.time.modified,
             v + " is modified, should match modified time")

      // XXX Remove the guard these once old docs have been found and
      // fixed.  It's too big of a pain to have to manually fix
      // each one every time someone complains.
      if (typeof doc.versions[v]._npmUser !== "object") continue


      assert(typeof doc.versions[v]._npmUser === "object",
             "_npmUser field must be object\n"+
             "(You probably need to upgrade your npm version)")
      assert(doc.versions[v]._npmUser.name === user.name,
             "_npmUser.name must === user.name")
      assert(deepEquals(doc.versions[v].maintainers,
                        doc.maintainers),
             "modified version 'maintainers' must === doc.maintainers")

      // make sure that the _npmUser is one of the maintainers
      var found = false
      for (var i = 0, l = doc.maintainers.length; i < l; i ++) {
        var m = doc.maintainers[i]
        if (m.name === doc.versions[v]._npmUser.name) {
          found = true
          break
        }
      }
      assert(found, "_npmUser must be a current maintainer.\n"+
                    "maintainers=" + JSON.stringify(doc.maintainers)+"\n"+
                    "current user=" + JSON.stringify(doc.versions[v]._npmUser))

    } else if (oldTime[v]) {
      assert(oldTime[v] === doc.time[v],
             v + " time should not be modified 1")
    }
  }

  // now go through all the time settings that weren't covered
  for (var v in oldTime) {
    if (doc.versions[v] || !oldVersions[v]) continue
    assert(doc.time[v] === oldTime[v],
           v + " time should not be modified 2")
  }

}

