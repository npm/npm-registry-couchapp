// kill the couchdb process that's running as a detached child process
// started by the 00-setup.js test

var fs = require('fs')
var test = require('tap').test
var path = require('path')
var pidfile = path.resolve(__dirname, 'fixtures', 'pid')
var _users = path.resolve(__dirname, 'fixtures', '_users.couch')
var db = path.resolve(__dirname, 'fixtures', 'registry.couch')
var log = path.resolve(__dirname, 'fixtures', 'couch.log')
var repl = path.resolve(__dirname, 'fixtures', '_replicator.couch')

test('cleanup', function (t) {
  try {
    var pid = fs.readFileSync(pidfile)
  } catch (er) {}

  if (pid) {
    try { process.kill(pid) } catch (er) {
      // ok if already killed
      t.equal(er.code, 'ESRCH')
    }
  }

  files = [ pidfile, repl, log, _users, db ]
  files.forEach(function(file) {
    try { fs.unlinkSync(file) } catch (er) {
      // ok if gone
      t.equal(er.code, 'ENOENT')
    }
  })

  t.pass('couch is no more')
  t.end()
})
