var which = require('which')

exports.npmPath = process.env.npm || which.sync('npm')

var spawn = require('child_process').spawn
exports.npm = function (args, opts) {
  cmd = exports.npmPath
  if (exports.npmPath.match(/\.js$/)) {
    args = [exports.npmPath].concat(args)
    cmd = process.execPath
  }
  return spawn(cmd, args, opts)
}


if (module === require.main)
  console.log('ok')
