var
  http = require('http'),
  fs = require('fs'),
  path = require('path'),
  events = require('events'),
  querystring = require('querystring'),
  mime = require('../dep/mime'),
  base64 = require('../dep/base64');

// Stringify function embedded inside of objects. Useful for couch views
exports.toJSON = function(data) {
  return JSON.stringify(data, function(key, val) {
    if (typeof val == 'function') {
      return val.toString();
    }
    return val;
  });
};

// Use boolean strings since couch expects those
exports.toQuery = function(query) {
  for (var k in query) {
    if (typeof query[k] == 'boolean') {
      query[k] = String(query[k]);
    }
  }
  return querystring.stringify(query);
};

// Helps turning a file into an inline CouchDB attachment
exports.toAttachment = function(file) {
  var promise = new events.Promise();

  fs
    .readFile(file, 'binary')
    .addCallback(function(data) {
      var ext = path.extname(file).substr(1);

      promise.emitSuccess({
        content_type: mime.lookup(ext),
        data: base64.encode(data)
      });
    })
    .addErrback(function(e) {
      promise.emitError(e);
    });

  return promise;
};

exports.createClient = function(port, host) {
  port = port || 5984;
  host = host || 'localhost';

  var
    httpClient = http.createClient(port, host),
    couchClient = new Client();

  couchClient.__defineGetter__('host', function() {
    return host;
  });

  couchClient.__defineGetter__('port', function() {
    return port;
  });

  couchClient._queueRequest = function(options) {
    if (options.query) {
      options.path += '?'+exports.toQuery(options.query);
      delete options.query;
    }

    var
      promise = new events.Promise,
      request = httpClient.request(
        options.method.toUpperCase(),
        options.path,
        options.headers
      ),
      onClose = function(hadError, reason) {
        if (hadError && !promise.hasFired) {
          promise.emitError(reason);
        }
        httpClient.removeListener('close', onClose);
      };

    httpClient.addListener('close', onClose);

    if (options.data && typeof options.data != 'string') {
      options.data = exports.toJSON(options.data);
    }

    if (options.data) {
      request.write(options.data, options.requestEncoding || 'utf8');
    }
    request.addListener("response", function (res) {
      request.close(function() {
        var buffer = '';
        res.setBodyEncoding(options.responseEncoding || 'utf8');
        res
          .addListener('data', function(chunk) {
            buffer += (chunk || '');
          })
          .addListener('end', function() {
            if(options.responseEncoding == 'binary') {
              promise.emitSuccess(buffer);
            }

            var json;
            try {
              json = JSON.parse(buffer);
            } catch (e) {
              return promise.emitError('invalid json: '+json);
            }

            if ('error' in json) {
              return promise.emitError(json);
            }

            if (!options.full) {
              promise.emitSuccess(json);
            }

            promise.emitSuccess({
              headers: res.headers,
              json: json,
            });
          });

      });
    })
    return promise;
  };

  return couchClient;
};

var Client = exports.Client = function() {

}; 

function requestOptions(method, path, data) {
  var options;

  if (typeof method == 'object') {
    options = method;
  } else if (typeof method == 'string' && typeof path != 'string') {
    options = {
      path: method,
      query: path
    };
  } else {
    options = {
      method: method,
      path: path,
      data: data
    }
  }

  return options;
}

Client.prototype.request = function(method, path, data) {
  var
    defaults = {
      method: 'get',
      path: '/',
      headers: {},
      data: null,
      query: null,
      full: false
    },
    options = requestOptions(method, path, data);

  options = process.mixin(defaults, options);
  options.headers.host = options.headers.host || this.host;

  return this._queueRequest(options);
};

Client.prototype.allDbs = function() {
  return this.request({
    path: '/_all_dbs'
  });
};

Client.prototype.config = function() {
  return this.request({
    path: '/_config'
  });
};

Client.prototype.uuids = function(count) {
  return this.request({
    path: '/_uuids'+(count ? '?count='+count : '')
  });
};

Client.prototype.replicate = function(source, target, options) {
  options = process.mixin({
    source: source,
    target: target,
  }, options || {});

  return this.request({
    method: 'POST',
    path: '/_replicate',
    data: options
  });
};

Client.prototype.stats = function() {
  var args = Array.prototype.slice.call(arguments);

  return this.request({
    path: '/_stats'+((args) ? '/'+args.join('/') : '')
  });
};

Client.prototype.activeTasks = function() {
  return this.request({
    path: '/_active_tasks'
  });
};

Client.prototype.db = function(name) {
  var
    couchClient = this,
    couchDb = new Db();

  couchDb.__defineGetter__('name', function() {
    return name;
  });

  couchDb.__defineGetter__('client', function() {
    return couchClient;
  });

  couchDb.request = function(method, path, data) {
    var options = requestOptions(method, path, data);
    options.path = '/'+name+(options.path || '');
    return couchClient.request(options);
  };

  return couchDb;
};

var Db = exports.Db = function() {
  
}; 

Db.prototype.exists = function() {
  var promise = new events.Promise();
  this
    .request({path: ''})
    .addCallback(function(r) {
      promise.emitSuccess(true);
    })
    .addErrback(function(r) {
      if (r.error == 'not_found') {
        return promise.emitSuccess(false);
      }

      promise.emitError(r);
    });

  return promise;
};

Db.prototype.info = function() {
  return this.request({});
};

Db.prototype.create = function() {
  return this.request({
    method: 'PUT'
  });
};

Db.prototype.remove = function() {
  return this.request('DELETE', '');
};

Db.prototype.getDoc = function(id) {
  return this.request({
    path: '/'+id
  });
};

Db.prototype.saveDoc = function(id, doc) {
  if (typeof id == 'object') {
    return this.request({
      method: 'POST',
      path: '/',
      data: id,
    });
  }

  return this.request({
    method: 'PUT',
    path: '/'+id,
    data: doc,
  });
};

Db.prototype.removeDoc = function(id, rev) {
  return this.request({
    method: 'DELETE',
    path: '/'+id,
    query: {rev: rev}
  });
};

Db.prototype.copyDoc = function(srcId, destId, destRev) {
  if (destRev) {
    destId += '?rev='+destRev;
  }

  return this.request({
    method: 'COPY',
    path: '/'+srcId,
    headers: {
      'Destination': destId
    }
  });
}

Db.prototype.bulkDocs = function(data) {
  return this.request({
    method: 'POST',
    path: '/_bulk_docs',
    data: data,
  });
};

Db.prototype.saveDesign = function(design, doc) {
  if (typeof design == 'object') {
    if (design._id && !design._id.match(/^_design\//)) {
      design._id = '_design/'+design._id;
    }
    return this.saveDoc(design, doc);
  }

  return this.saveDoc('_design/' + design, doc);
};

Db.prototype.saveAttachment = function(file, docId, options) {
  var
    self = this,
    ext = path.extname(file).substr(1),
    promise = new events.Promise();

  options = process.mixin({
    name: path.basename(file),
    contentType: mime.lookup(ext),
    rev: null
  }, options || {});

  // We could stream the file here, but I doubt people store big enough files
  // in couch to make this worth it?
  fs
    .readFile(file, 'binary')
    .addCallback(function(data) {
      self
        .request({
          method: 'PUT',
          requestEncoding: 'binary',
          path: '/'+docId+'/'+options.name+(options.rev ? '?'+options.rev : ''),
          headers: {
            'Content-Type': options.contentType
          },
          data: data,
        })
        .addCallback(function() {
          promise.emitSuccess.apply(promise, arguments);
        })
        .addErrback(function(e) {
          promise.emitError(e);
        });
    })
    .addErrback(function(e) {
      promise.emitError(e);
    });

  return promise;
};

Db.prototype.removeAttachment = function(docId, attachmentId, docRev) {
  return this.request({
    method: 'DELETE',
    path: '/'+docId+'/'+attachmentId,
    query: {rev: docRev}
  })
};

Db.prototype.getAttachment = function(docId, attachmentId) {
  return this.request({
    path: '/'+docId+'/'+attachmentId,
    responseEncoding: 'binary',
  });
};

Db.prototype.allDocs = function(query) {
  return this.request({
    path: '/_all_docs',
    query: query
  });
};

Db.prototype.allDocsBySeq = function(query) {
  return this.request({
    path: '/_all_docs_by_seq',
    query: query
  });
};

Db.prototype.compact = function(design) {
  return this.request({
    method: 'POST',
    path: '/_compact'+(design ? '/'+design : ''),
  });
};

Db.prototype.tempView = function(data, query) {
  return this.request({
    method: 'POST',
    path: '/_temp_view',
    data: data,
    query: query
  });
};

Db.prototype.viewCleanup = function() {
  return this.request({
    method: 'POST',
    path: '/_view_cleanup',
  });
};

Db.prototype.view = function(design, view, query) {
  return this.request({
    path: '/_design/'+design+'/_view/'+view,
    query: query
  });
};

Db.prototype.changes = function(query) {
  return this.request({
    path: '/_changes',
    query: query
  });
};

Db.prototype.changesStream = function(query, options) {
  query = process.mixin({
    feed: "continuous",
    heartbeat: 1 * 1000
  }, query || {});

  options = process.mixin({
    timeout: 0,
  }, options);

  var
    stream = new events.EventEmitter(),
    client = http.createClient(this.client.port, this.client.host),
    path = '/'+this.name+'/_changes?'+exports.toQuery(query),
    headers = {'Host': this.client.host},
    request = client.request('GET', path, headers),
    buffer = '';

  client.setTimeout(options.timeout);
  request.addListener("response", function (res) {
    request.close(function() {
      res
        .addListener('data', function(chunk) {
          buffer += (chunk || '');

          var offset, change;
          while ((offset = buffer.indexOf("\n")) >= 0) {
            change = buffer.substr(0, offset);
            buffer = buffer.substr(offset +1);

            // Couch sends an empty line as the "heartbeat"
            if (change == '') {
              return stream.emit('heartbeat');
            }

            try {
              change = JSON.parse(change);
            } catch (e) {
              return stream.emit('error', 'invalid json: '+change);
            }

            stream.emit('change', change);
          }
        });
    });
  })
  

  client.addListener('close', function(hadError) {
    stream.emit('end', hadError);
  });

  stream.close = function() {
    return client.forceClose();
  };

  return stream;
};