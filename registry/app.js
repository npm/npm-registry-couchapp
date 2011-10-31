var ddoc = module.exports =
  { _id:'_design/app'
  , shows: require("./shows.js")
  , updates: require("./updates.js")
  , rewrites: require("./rewrites.js")
  , views: require("./views.js")
  , lists: require("./lists.js")
  , validate_doc_update: require("./validate_doc_update.js")
  , language: "javascript"
  }

var modules = require("./modules.js")
for (var i in modules) ddoc[i] = modules[i]
