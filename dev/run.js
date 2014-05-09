var touch = require('touch')
var spawn = require('child_process').spawn
var once = require('once')

// flow control is fun!
function queue () {
  var args = [].slice.call(arguments)
  var cb = args.pop()
  go(args.shift())
  function go (fn) {
    if (!fn) return cb()
    fn(function (er) {
      if (er) return cb(er)
      go(args.shift())
    })
  }
}

var children = []
function exec (cmd, args, wait, cb) {
  console.log("Running %j %j",cmd,args)
  if (typeof wait === 'function') cb = wait, wait = 200
  cb = once(cb)

  var opts = {stdio:'inherit'}
  // windows is kind of a jerk sometimes.
  if (process.platform === 'win32') {
    args = ['/c', '"' + cmd + '"'].concat(args)
    cmd = 'cmd'
    opts.windowsVerbatimArguments = true
  }
  var child = spawn(cmd, args, opts)

  var timer = setTimeout(cb, wait)

  child.on('exit', function (code) {
    clearTimeout(timer)
    var er
    if (code) {
      msg = cmd + ' ' + args.join(' ') + ' fell over: '+code
      console.error(msg)
      er = new Error(msg)
    }
    cb(er)
  })
  children.push(child)
}

// best effort
process.on('exit', function() {
  children.forEach(function(child) {
    try {
      child.kill('SIGKILL')
    } catch (er) {}
  })
})

var mode = 'all'
var validModes = ['all','www-only','db-only']
if (process.argv[2]) {
  if (validModes.indexOf(process.argv[2]) > -1) mode = process.argv[2]
  else {
    console.log("Invalid run mode " + process.argv[2])
    exit(1)
  }
}

queue(function (cb) {
  // spawn couchdb, and make sure it stays up for a little bit
  exec('couchdb', ['-a', 'dev/couch/couch.ini'], cb)

}, function (cb) {
  // run the follower to populate couch and replicate design docs
  console.log("hey")
  exec('node',['./node_modules/registry-replicate/replicate.js','--seqfile=./dev/couch/sequence'], cb)

}, function(er) {
  // other things
})
