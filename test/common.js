var which = require('which')
exports.npmPath = process.env.npm || which.sync('npm')

var spawn = require('child_process').spawn
exports.npm = function (args, opts) {
  return spawn(exports.npmPath, args, opts)
}


if (module === require.main)
  console.log('ok')
