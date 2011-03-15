// sync to $host/_users/_design/_auth

var ddoc = {_id:"_design/_auth", language:"javascript"}

module.exports = ddoc

ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {
  if ((oldDoc || newDoc).type != 'user') {
    throw({forbidden : 'doc.type must be user'});
  }
  // we only validate user docs for now
  if (newDoc._deleted === true) {
    // allow deletes by admins and matching users
    // without checking the other fields
    if ((userCtx.roles.indexOf('_admin') != -1)
        || (userCtx.name == oldDoc.name)) {
      return;
    } else {
      throw({forbidden : 'Only admins may delete other user docs.'});
    }
  }
  if (!newDoc.name) {
    throw({forbidden : 'doc.name is required'});
  }
  if (!(newDoc.roles && (typeof newDoc.roles.length != 'undefined') )) {
    throw({forbidden : 'doc.roles must be an array'});
  }
  if (newDoc._id != 'org.couchdb.user:'+newDoc.name) {
    throw({forbidden : 'Docid must be of the form org.couchdb.user:name'});
  }
  if (oldDoc) {
    // validate all updates
    if (oldDoc.name != newDoc.name) {
      throw({forbidden : 'Usernames may not be changed.'});
    }
  }
  // don't allow unsafe URI chars.
  // grandfather in any existing usernames, though.
  if (!oldDoc && encodeURIComponent(newDoc.name).indexOf("%") !== -1) {
    throw({forbidden: 'name cannot contain any non-urlsafe characters'})
  }
  if (!oldDoc && newDoc.name.toLowerCase() !== newDoc.name) {
    throw({forbidden: 'name must be lowercase'})
  }
  if (newDoc.password_sha && !newDoc.salt) {
    throw({forbidden : 'Users with password_sha must have a salt.'
          +'See /_utils/script/couch.js for example code.'});
  }
  if (userCtx.roles.indexOf('_admin') == -1) {
    // not an admin
    if (oldDoc) {
      // validate non-admin updates
      if (userCtx.name != newDoc.name) {
        throw({forbidden : 'You may only update your own user document.'
              +'('+userCtx.name+')'});
      }
      // validate role updates
      var oldRoles = oldDoc.roles.sort();
      var newRoles = newDoc.roles.sort();
      if (oldRoles.length != newRoles.length) {
        throw({forbidden : 'Only _admin may edit roles'});
      }
      for (var i=0; i < oldRoles.length; i++) {
        if (oldRoles[i] != newRoles[i]) {
          throw({forbidden : 'Only _admin may edit roles'});
        }
      }
    } else if (newDoc.roles.length > 0) {
      throw({forbidden : 'Only _admin may set roles'});
    }
  }
  // no system roles in users db
  for (var i=0; i < newDoc.roles.length; i++) {
    if (newDoc.roles[i][0] == '_') {
      throw({forbidden : 'No system roles (starting with underscore) in users db.'});
    }
  };
  // no system names as names
  if (newDoc.name[0] == '_') {
    throw({forbidden : 'Username may not start with underscore.'});
  }
}
ddoc.lists = {
  index: function (head,req) {
    var row
      , out = {}
      , id, data
    while (row = getRow()) {
      id = row.id.replace(/^org\.couchdb\.user:/, '')
      data = row.value
      delete data._id
      delete data._rev
      delete data.salt
      delete data.password_sha
      delete data.type
      delete data.roles
      delete data._deleted_conflicts
      out[id] = data
    }
    send(toJSON(out))
  },
  email:function (head, req) {
    var row
      , data
      , id
      , email = req.query.email || undefined
      , out = []
    while (row = getRow()) {
      id = row.id.replace(/^org\.couchdb\.user:/, '')
      data = row.value
      var dm = data.email || undefined
      if (data.email !== email) continue
      out.push(row.value.name)
    }
    send(toJSON(out))
  }

}
ddoc.views = {
  listAll : { map : function (doc) { return emit(doc._id, doc) } }
}

