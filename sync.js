
var couchdb = require('./deps/node-couchdb/lib/couchdb'),
  fs = require('fs'),
  sys = require('sys'),
  url = require('url'),

  ddoc = {_id:"_design/app",shows:{},updates:{}},

  dev = false,
  dburl = "http://localhost:5984/jsregistry",

   // filename : cb
  files = {
    "design/rewrites.json" : function (data) {
      ddoc.rewrites = JSON.parse(data);
    },
    "design/shows/package.js" : function (data) {
      ddoc.shows.package = data;
    },
    "design/updates/package.js" : function (data) {
      ddoc.updates.package = data;
    }
  },

  // be gentle.
  firstTime = true;
  
// parse args
for (var i=0;i<process.argv.length;i+=1) {
  if (process.argv[i].slice(0,4) == 'http') {
    dburl = process.argv[i];
  }
  if (process.argv[i] == 'dev') {
    dev = true;
  }
}

// do it!
sync();

////// worker functions below.

function sync () {
  var saw = 0, expect = 0;
  // extra function to trap the value of cb,
  // so it's not changing the closed-over value.
  for (var file in files) (function (file, cb) {
    expect ++;
    fs.readFile(file, function (er, data) {
      if (er) throw er;
      saw ++;
      cb(data);
      if (saw >= expect) done();
    });

    // if a file changes, then update that bit of the ddoc, and push it up.
    if (dev && firstTime) {
      process.watchFile(file, {persistent: true, interval: 100}, function (o, n) {
        if (o.mtime.getTime() === n.mtime.getTime()) return;
        sys.error("Changed: "+file);
        fs.readFile(file, function (er, data) {
          if (er) throw er;
          cb(data);
          done();
        });
      });
    }
  })(file, files[file]);
  if (dev && firstTime) sys.error("Starting up in dev mode");
  firstTime = false;
}

// this gets called when all the files get read
function done () {
  var uri = url.parse(dburl)
  var client = couchdb.createClient(uri.port || 5984, uri.hostname || "localhost");
  db = client.db((uri.pathname || "jsregistry").replace('/', ''));
  db.getDoc('_design/app', function (error, doc) {
    if (!error) {
      ddoc._rev = doc._rev;
    }
    db.saveDoc(ddoc, function (error, info) {
      if (error) {
        sys.error("Failed to save "+JSON.stringify(error))
      } else {
        sys.error("Saved "+JSON.stringify(info))
      }
    });
  });
}
