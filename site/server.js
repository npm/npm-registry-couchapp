var path = require('path')
  , http = require('http')
  , fs = require('fs')
  , filed = require('filed')
  , follow = require('follow')
  , request = require('request').defaults({json:true})
  , handlebars = require('./handlebars')
  , build = path.join(__dirname, 'build')
  , registry = 'http://isaacs.iriscouch.com:5984/registry'
  , template = fs.readFileSync(path.join(__dirname, 'package.html')).toString()
  , port = process.env.NPMJSPORT || 8000
  ;

  
try {
  fs.mkdirSync(build, 0755)
} catch(e) {
  // already there most likely
}

http.createServer(function (req, resp) {
  var f = filed(path.join(build, req.url.slice(1)))
  req.pipe(f)
  f.pipe(resp)
})
.listen(port)

var follower = follow(registry, function(error, change) {
  request(registry + '/' + encodeURIComponent(change.id), function (e, resp, doc) {
    if (resp.statusCode !== 200) return // most likely deleted
    var f = filed(path.join(build, change.id+'.html'))
    f.write(handlebars.compile(template)(doc))
    f.end()
    console.log(doc)
  })
})

// while debugging only generate a few docs
follower.limit = 2 
follower.since = 4000