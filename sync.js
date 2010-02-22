var couchdb = require('../node-couchdb/lib/couchdb');
var fs = require('fs');
var sys = require('sys');
var url = require('url');

var ddoc = {_id:"_design/app",shows:{},updates:{}}

var argumentsToArray = function (args) {
  var newargs = []
  for (i=0;i<args.length;i+=1) {
    newargs.push(args[i]);
  }
  return newargs;
}

function Promise () {
  var p = this;
  this.addListener("error", function () {
    if (p.listeners("error").length == 1) {
      throw "Unhandled error event."
    }
  })
}
sys.inherits(Promise, process.EventEmitter)
Promise.prototype.addCallback = function (callback) {
  this.addListener("success", callback);
}
Promise.prototype.addErrback = function (callback) {
  this.addListener("error", callback);
}
Promise.prototype.emitSuccess = function () {
  var args = argumentsToArray(arguments);
  args.unshift("success");
  this.emit.apply(this, args);
}
Promise.prototype.emitError = function () {
  var args = argumentsToArray(arguments);
  args.unshift("error");
  this.emit.apply(this, args);
}

function GroupPromise () {
  this.promises = [];
  this.successCount = 0;
  this.failCount = 0;
}
GroupPromise.prototype.newPromise = function () {
  var p = new Promise();
  var gp = this;
  p.addCallback(function () {
    gp.successCount += 1; 
    if (gp.whenFunc && gp.promises.length == (gp.failCount + gp.successCount)) {
      gp.whenFunc();
    }
  });
  p.addErrback(function () {gp.failCount += 1});
  this.promises.push(p);
  return p;
}
GroupPromise.prototype.when = function (callback) {
  if (this.whenFunc && this.successCount.length == (this.failCount + this.successCount)) {
    callback();
  } else {
    this.whenFunc = callback;
  }
}

dev = false;
dburl = "http://localhost:5984/jsregistry"

for (i=0;i<process.argv.length;i+=1) {
  if (process.argv[i].slice(0,4) == 'http') {
    dburl = process.argv[i];
  }
  if (process.argv[i] == 'dev') {
    dev = true;
  }
}

function attach (file, group, callback) {
  var p = group.newPromise();
  fs.readFile(file, undefined, function (error, data) {
    callback(data)
    if (dev) {
      process.watchFile(file, {persistent: true, interval: 100}, sync);
    }
    p.emitSuccess();
  });
  return p;
}

var sync = function () {
  var group = new GroupPromise();
  attach('design/rewrites.json', group, function (data) {ddoc.rewrites = JSON.parse(data)})
  attach('design/shows/package.js', group, function (data) {ddoc.shows.package = data})
  attach('design/updates/package.js', group, function (data) {ddoc.updates.package = data})
  group.when(function () {
    var uri = url.parse(dburl)
    var client = couchdb.createClient(uri.port, uri.hostname);
    db = client.db(uri.pathname.replace('/', ''));
    var p = db.getDoc('_design/app', function (error, doc) {
      if (!error) {
        ddoc._rev = doc._rev;
      }
      db.saveDoc(ddoc, function (error, info) {
        if (error) {
          sys.puts("Failed to save "+JSON.stringify(error))
        } else {
          sys.puts("Saved "+JSON.stringify(info))
        }
      })
    })
  }) 
}

sync();



