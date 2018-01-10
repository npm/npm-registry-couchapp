var common = require('./common.js')
var test = require('tap').test
var reg = 'http://127.0.0.1:15986/'
var request = require('request')
var db = 'http://localhost:15986/registry/'
var fs = require('fs')
var path = require('path')
var rimraf = require('rimraf')
var conf = path.resolve(__dirname, 'fixtures', 'npmrc')
var conf2 = path.resolve(__dirname, 'fixtures', 'npmrc2')
var conf4 = path.resolve(__dirname, 'fixtures', 'npmrc4')
var pkg = path.resolve(__dirname, 'fixtures/scoped-package')
var pkg002 = path.resolve(pkg, '0.0.2')
var pkg023a = path.resolve(pkg, '0.2.3alpha')
var pkg023 = path.resolve(pkg, '0.2.3')
var inst = path.resolve(__dirname, 'fixtures/scoped-install')
var http = require('http')
var maintainers = [
  {
  "name": "admin",
  "email": "x@x.com"
  }
]
var url = require("url")

var expect = null

var version002 = {
  "name": "@scoped/package",
  "version": "0.0.2",
  "description": "just an npm test",
  "_id": "@scoped/package@0.0.2",
  "dist": {
    "tarball": "http://127.0.0.1:15986/@scoped%2fpackage/-/@scoped%2fpackage-0.0.2.tgz"
  },
  "_npmUser": {
    "name": "admin",
    "email": "x@x.com"
  },
  "maintainers": [
    {
    "name": "admin",
    "email": "x@x.com"
    }
  ],
  "directories": {}
}

var version023a = {
  "name": "@scoped/package",
  "version": "0.2.3-alpha",
  "description": "just an npm test, but with a **markdown** readme.",
  "_id": "@scoped/package@0.2.3-alpha",
  "dist": {
    "tarball": "http://127.0.0.1:15986/@scoped%2fpackage/-/@scoped%2fpackage-0.2.3-alpha.tgz"
  },
  "_npmUser": {
    "name": "admin",
    "email": "x@x.com"
  },
  "maintainers": [
    {
      "name": "admin",
      "email": "x@x.com"
    }
  ],
  "directories": {}
}

var version023 = {
  "name": "@scoped/package",
  "version": "0.2.3",
  "description": "just an npm test, but with a **markdown** readme.",
  "_id": "@scoped/package@0.2.3",
  "dist": {
    "tarball": "http://127.0.0.1:15986/@scoped%2fpackage/-/@scoped%2fpackage-0.2.3.tgz"
  },
  "_npmUser": {
    "name": "admin",
    "email": "x@x.com"
  },
  "maintainers": [
    {
      "name": "admin",
      "email": "x@x.com"
    },
    {
      "name": "other",
      "email": "other@example.com"
    }
  ],
  "directories": {}
}

var time = {}
var npmVersion = null
var env = { PATH: process.env.PATH, npm_config_loglevel: "error" }

test('get npm version', function(t) {
  var c = common.npm([ '--version' ], { env: env })
  var v = ''
  c.stdout.on('data', function(d) {
    v += d
  })
  c.on('close', function(code) {
    npmVersion = v.trim()
    version002._npmVersion = npmVersion
    version023a._npmVersion = npmVersion
    version023._npmVersion = npmVersion
    t.notOk(code)
    t.end()
  })
})

test('fail to publish as non-admin', function(t) {
  var c = common.npm([
    '--registry=' + reg,
    '--userconf=' + conf2,
    'publish'
  ], { cwd: pkg002, env: env })
  c.on('close', function(code) {
    t.ok(code)
    t.end()
  })
})


test('first publish (as admin)', function(t) {
  t.comment('here1');
  var c = common.npm([
    '--registry=' + reg,
    '--userconf=' + conf4,
    'publish'
  ], { cwd: pkg002, env: env })
  c.stderr.pipe(process.stderr)
  var out = ''
  c.stdout.setEncoding('utf8')
  c.stdout.on('data', function(d) {
    t.comment('here2',d);
    out += d
  })
  c.on('close', function(code) {
    t.comment('here3',code);
    t.notOk(code)
    t.equal(out, "+ @scoped/package@0.0.2\n")
    t.end()
  })
})

var urls = [
  '@scoped%2fpackage/-/@scoped%2fpackage-0.0.2.tgz',
  'npm/public/registry/@scoped%2fpackage/_attachments/@scoped%2fpackage-0.0.2.tgz',
  'npm/public/registry/p/@scoped%2fpackage/_attachments/@scoped%2fpackage-0.0.2.tgz'
]

urls.forEach(function(u) {
  test('attachment: ' + u, function(t) {
    r = url.parse(reg + u)
    r.method = 'HEAD'
    r.headers = {connection: 'close'}
    http.request(r, function(res) {
      t.equal(res.statusCode, 200)
      t.end()
    }).end()
  })
})

test('GET after publish', function(t) {
  expect = {
    "_id": "@scoped/package",
    "name": "@scoped/package",
    "description": "just an npm test",
    "dist-tags": {
      "latest": "0.0.2"
    },
    "versions": {
      "0.0.2": version002
    },
    "readme": "just an npm test\n",
    "maintainers": maintainers,
    "time": time,
    "readmeFilename": "README",
    "_attachments": {
      "@scoped/package-0.0.2.tgz": {
        "content_type": "application/octet-stream",
        "revpos": 1,
        "stub": true
      }
    }
  }

  http.get(reg + '@scoped%2fpackage', function(res) {
    t.equal(res.statusCode, 200)
    var c = ''
    res.setEncoding('utf8')
    res.on('data', function(d) {
      c += d
    })
    res.on('end', function() {
      c = JSON.parse(c)
      // rev and time will be different
      t.like(c._rev, /1-[0-9a-f]+$/)
      expect._rev = c._rev
      expect.time['0.0.2'] = c.time['0.0.2']
      t.has(c, expect)
      t.end()
    })
  })
})

test('GET with x-forwarded-for', function (t) {
  var wanted = 'http://fooblz/registry/_design/scratch/_rewrite/@scoped%2fpackage/-/@scoped%2fpackage-0.0.2.tgz'

  var g = url.parse('http://localhost:15986/registry/_design/scratch/_rewrite/@scoped%2fpackage')
  g.headers = {
    'x-forwarded-host': 'fooblz'
  }

  http.get(g, function(res) {
    t.equal(res.statusCode, 200)
    var c = ''
    res.setEncoding('utf8')
    res.on('data', function(d) {
      c += d
    })
    res.on('end', function() {
      c = JSON.parse(c)
      var actual = c.versions[c['dist-tags'].latest].dist.tarball
      t.equal(actual, wanted)
      t.end()
    })
  })
})


test('fail to clobber', function(t) {
  var c = common.npm([
    '--registry=' + reg,
    '--userconf=' + conf4,
    'publish'
  ], { cwd: pkg002, env: env })
  c.on('close', function(code) {
    t.ok(code)
    t.end()
  })
})

test('fail to publish as other user', function(t) {
  var c = common.npm([
    '--registry=' + reg,
    '--userconf=' + conf2,
    'publish'
  ], { cwd: pkg023a, env: env })
  c.on('close', function(code) {
    t.ok(code)
    t.end()
  })
})

test('publish update as non-latest', function(t) {
  var c = common.npm([
    '--registry=' + reg,
    '--userconf=' + conf4,
    '--tag=alpha',
    'publish'
  ], { cwd: pkg023a, env: env })
  c.stderr.pipe(process.stderr)
  var out = ''
  c.stdout.setEncoding('utf8')
  c.stdout.on('data', function(d) {
    out += d
  })
  c.on('close', function(code) {
    t.notOk(code)
    t.equal(out, "+ @scoped/package@0.2.3-alpha\n")
    t.end()
  })
})

test('GET after update', function(t) {
  expect = {
    "_id": "@scoped/package",
    "name": "@scoped/package",
    "description": "just an npm test",
    "dist-tags": {
      "latest": "0.0.2",
      "alpha": "0.2.3-alpha"
    },
    "versions": {
      "0.0.2": version002,
      "0.2.3-alpha": version023a
    },
    "readme": "just an npm test\n",
    "maintainers": maintainers,
    "time": time,
    "readmeFilename": "README",
    "_attachments": {
      "@scoped/package-0.0.2.tgz": {
        "content_type": "application/octet-stream",
        "revpos": 1,
        "stub": true
      },
      "@scoped/package-0.2.3-alpha.tgz": {
        "content_type": "application/octet-stream",
        "revpos": 2,
        "stub": true
      }
    }
  }

  http.get(reg + '@scoped%2fpackage', function(res) {
    t.equal(res.statusCode, 200)
    var c = ''
    res.setEncoding('utf8')
    res.on('data', function(d) {
      c += d
    })
    res.on('end', function() {
      c = JSON.parse(c)
      // rev and time will be different
      t.like(c._rev, /2-[0-9a-f]+$/)
      expect._rev = c._rev
      time['0.2.3-alpha'] = c.time['0.2.3-alpha']
      t.has(c, expect)
      t.end()
    })
  })
})

test('add second publisher', function(t) {
  var c = common.npm([
    '--registry=' + reg,
    '--userconf=' + conf4,
    'owner',
    'add',
    'other',
    '@scoped/package'
  ], { env: env })
  c.stderr.pipe(process.stderr)
  c.on('close', function(code) {
    t.notOk(code)
    t.end()
  })
})

test('get after owner add', function(t) {
  http.get(reg + '@scoped%2fpackage', function(res) {
    t.equal(res.statusCode, 200)
    var c = ''
    res.setEncoding('utf8')
    res.on('data', function(d) {
      c += d
    })
    res.on('end', function() {
      c = JSON.parse(c)
      // rev and time will be different
      t.like(c._rev, /3-[0-9a-f]+$/)
      expect._rev = c._rev
      expect.maintainers.push({
        name: 'other',
        email: 'other@example.com'
      })
      expect.time = time
      t.has(c, expect)
      t.end()
    })
  })
})

//we expect this to fail, as other owner is not an admin
//FIXME: it looks like this actually partially succeds, in updating the dist-tags. might be a bug.
/*
test('other owner publish', function(t) {
  var c = common.npm([
    '--registry=' + reg,
    '--userconf=' + conf2,
    'publish'
  ], { cwd: pkg023, env: env })
  c.stderr.pipe(process.stderr)
  var out = ''
  c.stdout.setEncoding('utf8')
  c.stdout.on('data', function(d) {
    out += d
  })
  c.on('close', function(code) {
    t.ok(code)
    t.end()
  })
})
*/


test('original admin owner publish', function(t) {
  var c = common.npm([
    '--registry=' + reg,
    '--userconf=' + conf4,
    'publish'
  ], { cwd: pkg023, env: env })
  c.stderr.pipe(process.stderr)
  var out = ''
  c.stdout.setEncoding('utf8')
  c.stdout.on('data', function(d) {
    out += d
  })
  c.on('close', function(code) {
    t.notOk(code)
    t.equal(out, "+ @scoped/package@0.2.3\n")
    t.end()
  })
})

test('install the thing we published', function(t) {
  rimraf.sync(path.resolve(inst, 'node_modules'))
  var c = common.npm([
    '--registry=' + reg,
    'install'
  ], { env: env, cwd: inst })
  c.on('close', function(code) {
    t.is(code, 0)
    c = common.npm(['--registry=' + reg, 'ls'], {env: env, cwd: inst})
    c.stderr.pipe(process.stderr)
    var out = ''
    c.stdout.setEncoding('utf8')
    c.stdout.on('data', function(d) {
      out += d
    })
    c.on('close', function(code) {
      t.notOk(code)
      t.similar(out, /@scoped\/package@0.2.3/)
      rimraf.sync(path.resolve(inst, 'node_modules'))
      t.end()
    })
  })
})


test('remove all the tarballs', function(t) {
  http.get(db + '@scoped%2fpackage', function(res) {
    t.equal(res.statusCode, 200)
    var c = ''
    res.setEncoding('utf8')
    res.on('data', function (d) {
      c += d
    })
    res.on('end', function() {
      var doc = JSON.parse(c)
      doc._attachments = {}
      var body = new Buffer(JSON.stringify(doc), 'utf8')
      var p = url.parse(db + '@scoped%2fpackage')
      p.auth = 'admin:admin'
      p.headers = {
        'content-type': 'application/json',
        'content-length': body.length,
        connection: 'close'
      }
      p.method = 'PUT'
      http.request(p, function(res) {
        if (res.statusCode !== 201)
          res.pipe(process.stderr)
        else
          res.resume()
        t.equal(res.statusCode, 201)
        res.on('end', t.end.bind(t))
      }).end(body)
    })
  })
})

test('try to attach a new tarball (and fail)', function(t) {
  http.get(db + '@scoped%2fpackage', function(res) {
    t.equal(res.statusCode, 200)
    var c = ''
    res.setEncoding('utf8')
    res.on('data', function (d) {
      c += d
    })
    res.on('end', function() {
      var doc = JSON.parse(c)
      var rev = doc._rev
      var p = url.parse(db + '@scoped%2fpackage/@scoped%2fpackage-0.2.3.tgz?rev=' + rev)
      body = new Buffer("this is the attachment data")
      p.auth = 'other:pass@:!%\''
      p.headers = {
        'content-type': 'application/octet-stream',
        'content-length': body.length,
        connection: 'close'
      }
      p.method = 'PUT'
      http.request(p, function(res) {
        if (res.statusCode !== 403)
          res.pipe(process.stderr)
        else
          res.resume()
        res.on('end', t.end.bind(t))
        t.equal(res.statusCode, 403)
      }).end(body)
    })
  })
})

