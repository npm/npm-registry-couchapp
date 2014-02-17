var fs = require("fs")
var cases = {}
fs.readdirSync(__dirname + "/fixtures/vdu/").forEach(function(d) {
  var m = d.match(/^([0-9]+)-(old|new|throw|user|db)\.json$/)
  if (!m) return;
  var c = cases[n] = cases[n] || {}
  var n = m[1]
  var t = m[2]
  c[t] = require("./fixtures/vdu/" + d)
})

var mod = require("../registry/modules.js")
Object.keys(mod).forEach(function (m) {
  process.binding('natives')[m] = mod[m]
})

var vdu = require("../registry/app.js").validate_doc_update

var test = require("tap").test

for (var i in cases) {
  test("vdu test case " + i, function (t) {
    var c = cases[i]
    var threw = true
    try {
      vdu(c.old, c.new, c.user, c.db)
      threw = false
    } catch (er) {
      if (c.throw)
        t.same(er, c.throw, "got expected error")
      else
        t.ifError(er)
    } finally {
      if (c.throw && !threw)
        t.fail("Expected throw, didn't get it")
    }
    t.end()
  })
}
