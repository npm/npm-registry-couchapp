// npmjs.org registry validation tests.
//

var fs = require('fs')
var tap = require('tap')
var test = tap.test
var util = require('util')
var path = require('path')

// Whatever, it's just testing. The ".mock" module type will pull from the module definitions
// which are fed to CouchDB.
var modules = require('../registry/modules')
require.extensions['.mock'] = function(module, filename) {
  //console.error('Not implemented: %s', util.inspect(Array.prototype.slice.apply(arguments)))
  var module_name = path.basename(filename, '.mock')
  var content = modules[module_name]
  module._compile(content, filename)
}

Object.keys(modules).forEach(function (k) {
  if(k[0] == k[0].toLowerCase()) {
    // Looks like a module name.
    var path = util.format('%s/../node_modules/%s.mock', __dirname, k)
    fs.writeFileSync(path, "", 'utf8')
  }
})


var validate_doc_update = null

test('Validation function definition', function(t) {
  t.doesNotThrow(function() {
    validate_doc_update = require('../registry/validate_doc_update.js')
  }, 'No problem importing validate_doc_update.js module')

  t.type(validate_doc_update, 'function',
         'validate_doc_update function defined correctly')

  t.equal(validate_doc_update.length, 4,
          'Good validate_doc_update arity')
  t.end()
})

test('Normal package updates', function(t) {
  var oldDoc = null
    , newDoc = mkpkg()
    , userCtx = mkctx('jason')

  valid(t, 'Create a package', newDoc, oldDoc, userCtx)

  t.end()
})

test('Creating private packages is not allowed', function(t) {
  var privDoc = mkpkg()

  privDoc.private = true
  not_valid(t, 'private packages', 'Cannot create a private package', privDoc, null, mkctx('jason'), {})
  t.end()
})

test('Admins can do anything', function(t) {
  var anonymous = mkctx()
    , user = mkctx('some_user')
    , admin = mkctx('admin')
    , newDoc = {'_id':'foo'}

  not_valid(t, 'Please log in', 'Anonymous user cannot create empty doc', newDoc, null, anonymous)
  not_valid(t, 'Normal user cannot create empty doc', newDoc, null, user)
  valid(t, 'Admin user can create empty doc', newDoc, null, admin)
  t.end()
})

//
// Utilities
//

function valid(t, description, newDoc, oldDoc, userCtx, secObj) {
  test_valid(t, null, description, newDoc, oldDoc, userCtx, secObj)
}

function not_valid(t, expected, description, newDoc, oldDoc, userCtx, secObj) {
  if(typeof description != 'string') {
    secObj = userCtx
    userCtx = oldDoc
    oldDoc = newDoc
    newDoc = description
    description = expected
    expected = true
  }
  test_valid(t, expected, description, newDoc, oldDoc, userCtx, secObj)
}

function test_valid(t, expected, description, newDoc, oldDoc, userCtx, secObj) {
  userCtx = userCtx || mkctx()
  secObj = secObj || {}

  var error = null
  try        { validate_doc_update(newDoc, oldDoc, userCtx, secObj) }
  catch (er) { error = er }

  if(error && !error.forbidden && !error.unauthorized)
    throw error // This is not a validation error. It's the real deal.

  if(error && typeof expected == 'string') {
    // This makes the TAP "found vs. wanted" output easily comprehensible.
    var message = error.forbidden || error.unauthorized
      , match = message.match(expected)
    if(match)
      t.equal(match[0], expected, description)
    else
      t.equal(message, expected, description)
  } else if(expected === true)
    t.ok(error, description) // Any error will do.
  else
    t.same(error, expected, description)
}

function mkctx() {
  var name = arguments[0] || null
    , roles = Array.prototype.slice.call(arguments, 1)

  if(name == 'admin' && !~roles.indexOf('_admin'))
    roles.push('_admin')

  return {'name':name, 'roles':roles}
}

function mkpkg() {
  return { '_id': 'my-package'
         , 'name': 'my-package'
         , 'maintainers': []
         , 'dist-tags': {}
         , 'versions': {}
         , 'time': { 'created' :'1981-03-02T02:00:00.000Z'
                   , 'modified':'1981-03-02T02:00:00.000Z'
                   }
         }
}
