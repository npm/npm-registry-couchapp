var test = require('tap').test
var reg = 'http://127.0.0.1:15984/'
var path = require('path')
var conf = path.resolve(__dirname, 'fixtures', 'npmrc')
var conf2 = path.resolve(__dirname, 'fixtures', 'npmrc2')
var spawn = require('child_process').spawn
var pkg = path.resolve(__dirname, 'fixtures/package')
var pkg002 = path.resolve(pkg, '0.0.2')
var pkg023a = path.resolve(pkg, '0.2.3alpha')

var version002 = {
  "name": "package",
  "version": "0.0.2",
  "description": "just an npm test",
  "_id": "package@0.0.2",
  "dist": {
    "shasum": "c633471c3673ac68d432670cef7c5c0263ae524b",
    "tarball": "http://127.0.0.1:15984/package/-/package-0.0.2.tgz"
  },
  "_from": ".",
  "_npmUser": {
    "name": "user",
    "email": "email@example.com"
  },
  "maintainers": [
    {
      "name": "user",
      "email": "email@example.com"
    }
  ],
  "directories": {}
}

var version023a = {
  "name": "package",
  "version": "0.2.3-alpha",
  "description": "just an npm test, but with a **markdown** readme.",
  "_id": "package@0.2.3-alpha",
  "dist": {
    "shasum": "b145d84e98f8b506d02038a6842d25c70236c6e5",
    "tarball": "http://127.0.0.1:15984/package/-/package-0.2.3-alpha.tgz"
  },
  "_from": ".",
  "_npmUser": {
    "name": "user",
    "email": "email@example.com"
  },
  "maintainers": [
    {
      "name": "user",
      "email": "email@example.com"
    }
  ],
  "directories": {}
}

var time = {}
var npmVersion = null
var env = { PATH: process.env.PATH }

test('get npm version', function(t) {
  var c = spawn('npm', [ '--version' ], { env: env })
  var v = ''
  c.stdout.on('data', function(d) {
    v += d
  })
  c.on('close', function(code) {
    npmVersion = v.trim()
    version002._npmVersion = npmVersion
    version023a._npmVersion = npmVersion
    t.notOk(code)
    t.end()
  })
})


test('first publish', function(t) {
  var c = spawn('npm', [
    '--registry=' + reg,
    '--userconf=' + conf,
    'publish'
  ], { cwd: pkg002, env: env })
  c.stderr.pipe(process.stderr)
  var out = ''
  c.stdout.setEncoding('utf8')
  c.stdout.on('data', function(d) {
    out += d
  })
  c.on('close', function(code) {
    t.notOk(code)
    t.equal(out, "+ package@0.0.2\n")
    t.end()
  })
})

test('GET after publish', function(t) {
  var expect = {
    "_id": "package",
    "name": "package",
    "description": "just an npm test",
    "dist-tags": {
      "latest": "0.0.2"
    },
    "versions": {
      "0.0.2": version002
    },
    "readme": "just an npm test\n",
    "maintainers": [
      {
        "name": "user",
        "email": "email@example.com"
      }
    ],
    "time": time,
    "readmeFilename": "README",
    "_attachments": {
      "package-0.0.2.tgz": {
        "content_type": "application/octet-stream",
        "revpos": 1,
        "digest": "md5-MpzHQbQmBCguhkRiAZECDA==",
        "length": 200,
        "stub": true
      }
    }
  }

  var http = require('http')
  http.get(reg + 'package', function(res) {
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
      t.same(c, expect)
      t.end()
    })
  })
})

test('fail to clobber', function(t) {
  var c = spawn('npm', [
    '--registry=' + reg,
    '--userconf=' + conf,
    'publish'
  ], { cwd: pkg002, env: env })
  c.on('close', function(code) {
    t.ok(code)
    t.end()
  })
})

test('fail to publish as other user', function(t) {
  var c = spawn('npm', [
    '--registry=' + reg,
    '--userconf=' + conf2,
    'publish'
  ], { cwd: pkg023a, env: env })
  c.on('close', function(code) {
    t.ok(code)
    t.end()
  })
})

test('publish update', function(t) {
  var c = spawn('npm', [
    '--registry=' + reg,
    '--userconf=' + conf,
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
    t.equal(out, "+ package@0.2.3-alpha\n")
    t.end()
  })
})

test('GET after update', function(t) {
  var expect = {
    "_id": "package",
    "name": "package",
    "description": "just an npm test, but with a **markdown** readme.",
    "dist-tags": {
      "latest": "0.2.3-alpha"
    },
    "versions": {
      "0.0.2": version002,
      "0.2.3-alpha": version023a
    },
    "readme": "just an npm test, but with a **markdown** readme.\n",
    "maintainers": [
      {
        "name": "user",
        "email": "email@example.com"
      }
    ],
    "time": time,
    "readmeFilename": "README.md",
    "_attachments": {
      "package-0.0.2.tgz": {
        "content_type": "application/octet-stream",
        "revpos": 1,
        "digest": "md5-MpzHQbQmBCguhkRiAZECDA==",
        "length": 200,
        "stub": true
      },
      "package-0.2.3-alpha.tgz": {
        "content_type": "application/octet-stream",
        "revpos": 2,
        "digest": "md5-nlx0drFAVoxE+U8FjVMh7Q==",
        "length": 366,
        "stub": true
      }
    }
  }

  var http = require('http')
  http.get(reg + 'package', function(res) {
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
      t.same(c, expect)
      t.end()
    })
  })
})
