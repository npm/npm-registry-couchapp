var couchdb = require('./dep/couchdb');
var fs = require('fs');

var ddoc = {shows:{},updates:{}}

function GroupPromise () {
  this.promises = [];
  this.successCount = 0;
  this.failCount = 0;
}
GroupPromise.prototype.newPromise = function () {
  var p = new events.Promise();
  var gp = this;
  p.addCallback(function () {
    p.successCount += 1; 
    if (gp.whenFunc && gp.successCount.length == (gp.failCount + gp.successCount)) {
      gp.whenFunc();
    }
  });
  p.addErrback(function () {p.failCount += 1});
  return p;
}
GroupPromise.prototype.when = function (callback) {
  if (gp.whenFunc && gp.successCount.length == (gp.failCount + gp.successCount)) {
    callback();
  } else {
    this.whenFunc = callback;
  }
}

function attach (file, group, callback) {
  var p = group.newPromise();
  fs.readFile(file)
    .addCallback(function (data) {
      callback(data)
    })
  return p;
}

var group = new GroupPromise();
attach('design/rewrites.json', group, function (data) {ddoc.rewrite = JSON.parse(data)})
attach('design/shows/package.js', group, function (data) {ddoc.shows.package = data})


fs.readFile('design/rewrites.json').addCallback(function (data) {
  ddoc.rewrites = JSON.parse(data);
})
fs.readFile('')
