// start the couchdb spinning as a detached child process.
// the zz-teardown.js test kills it.

var spawn = require('child_process').spawn
var test = require('tap').test
var path = require('path')
var fs = require('fs')
var http = require('http')
var url = require('url')

// just in case it was still alive from a previous run, kill it.
require('./zz-teardown.js')

// run with the cwd of the main program.
var cwd = path.dirname(__dirname)

var timeout = 300000; // 5 minutes
var conf = path.resolve(__dirname, 'fixtures', 'couch.ini')
var pidfile = path.resolve(__dirname, 'fixtures', 'pid')
var logfile = path.resolve(__dirname, 'fixtures', 'couch.log')
var started = /Apache CouchDB has started on http:\/\/127\.0\.0\.1:15986\/\n$/

test('start couch as a zombie child',  function (t) {
  var fd = fs.openSync(pidfile, 'wx')

  try { fs.unlinkSync(logfile) } catch (er) {}


  // Without this sudo, Travis will timeout when trying to start couchdb (why?!)
  var cmd = 'sudo'
  var args = ['couchdb', '-a', conf]

  if (!process.env.TRAVIS) {
    cmd = args.shift();
  }

  var child = spawn(cmd, args, {
    detached: true,
    stdio: 'ignore',
    cwd: cwd
  })
  child.unref()
  t.ok(child.pid)
  fs.writeSync(fd, child.pid + '\n')
  fs.closeSync(fd)

  // wait for it to create a log, give it 5 seconds
  var start = Date.now()
  fs.readFile(logfile, function R (er, log) {
    log = log ? log.toString() : ''
    if (!er && !log.match(started))
      er = new Error('not started yet')
    if (er) {
      if (Date.now() - start < timeout)
        return setTimeout(function () {
          fs.readFile(logfile, R)
        }, 100)
      else
        throw er
    }
    t.pass('relax, jeez')
    t.end()
  })
})

test('create test db', function(t) {
  var u = url.parse('http://admin:admin@localhost:15986/registry')
  u.method = 'PUT'
  http.request(u, function(res) {
    t.equal(res.statusCode, 201)
    var c = ''
    res.setEncoding('utf8')
    res.on('data', function(chunk) {
      c += chunk
    })
    res.on('end', function() {
      c = JSON.parse(c)
      t.same(c, { ok: true })
      t.end()
    })
  }).end()
})


if (!process.env.TRAVIS) {
  test('get the git-describe output', function (t) {
    var c = spawn('git', ['describe', '--tags'])
    c.stderr.pipe(process.stderr)
    var desc = ''
    c.stdout.on('data', function (d) {
      desc += d
    })

    c.stdout.on('end', function () {
      process.env.DEPLOY_VERSION = desc.trim()
      t.end()
    })
  })
}

test('ddoc', function(t) {
  var app = require.resolve('../registry/app.js')
  var couch = 'http://admin:admin@localhost:15986/registry'
  var c = spawn('couchapp', ['push', app, couch])
  c.stderr.pipe(process.stderr)
  c.stdout.pipe(process.stdout)
  c.on('exit', function(code) {
    t.notOk(code)
    t.end()
  })
})

test('users ddoc', function(t) {
  var app = require.resolve('../registry/_auth.js')
  var couch = 'http://admin:admin@localhost:15986/_users'
  var c = spawn('couchapp', ['push', app, couch])
  c.stderr.pipe(process.stderr)
  c.stdout.pipe(process.stdout)
  c.on('exit', function(code) {
    t.notOk(code)
    t.end()
  })
})
