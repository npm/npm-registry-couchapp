module.exports =
  { _id:'_design/ghost'
  , rewrites: ghostRewrites()
  , language: "javascript"
  }

function ghostRewrites () {
  return require("./rewrites.js").map(function (rule) {

    var to = rule.to
    if (rule.to.match(/\/_users(?:\/|$)/)) {
      if (rule.method === "GET") {
        to = to.replace(/\/_users(\/|$)/, "/public_users$1")
      }
    } else {
      to = "../app/" + to
    }
    to = to.replace(/\/\/+/g, '/')

    return { from: rule.from
           , method: rule.method
           , query: rule.query
           , to: to
           }
  })
}
