if (!Object.keys) {
  Object.keys = function (obj) {
    var keys = [];
    for (i in obj) keys.push(i);
    return keys;
  }
}
if (!Array.prototype.forEach) {
  Array.prototype.forEach = function (cb) {
    for (var i=0;i<this.length;i++) {
      cb(this[i]);
    }
  }
}

var request = function (options, callback) {
  options.success = function (obj) {
    callback(null, obj);
  }
  options.error = function (err) {
    if (err) callback(err);
    else callback(true);
  }
  if (options.data && typeof options.data == 'object') {
    options.data = JSON.stringify(options.data)
  }
  if (!options.dataType) options.processData = false;
  if (!options.dataType) options.contentType = 'application/json';
  if (!options.dataType) options.dataType = 'json';
  $.ajax(options)
}

function prettyDate(time) {
  if (time.indexOf('.') !== -1) time = time.slice(0, time.indexOf('.'))+'Z'
	var date = new Date((time || "").replace(/-/g,"/").replace(/[TZ]/g," ")),
	    date = new Date(date.getTime() - (date.getTimezoneOffset() * 1000 * 60))
  		diff = (((new Date()).getTime() - date.getTime()) / 1000),
  		day_diff = Math.floor(diff / 86400)
  		;
  
  if (day_diff === -1) return "now"
	if ( day_diff >= 31) return day_diff + ' days ago';
	if ( isNaN(day_diff) || day_diff < 0 || day_diff >= 31 ) return;
	
	return day_diff == 0 && (
			diff < 60 && "just now" ||
			diff < 120 && "1 minute ago" ||
			diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
			diff < 7200 && "1 hour ago" ||
			diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
		day_diff == 1 && "Yesterday" ||
		day_diff < 7 && day_diff + " days ago" ||
		day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago";
}

$.expr[":"].exactly = function(obj, index, meta, stack){ 
  return ($(obj).text() == meta[3])
}

var param = function( a ) {
  // Query param builder from jQuery, had to copy out to remove conversion of spaces to +
  // This is important when converting datastructures to querystrings to send to CouchDB.
	var s = [];
	if ( jQuery.isArray(a) || a.jquery ) {
		jQuery.each( a, function() { add( this.name, this.value ); });		
	} else { 
	  for ( var prefix in a ) { buildParams( prefix, a[prefix] ); }
	}
  return s.join("&");
	function buildParams( prefix, obj ) {
		if ( jQuery.isArray(obj) ) {
			jQuery.each( obj, function( i, v ) {
				if (  /\[\]$/.test( prefix ) ) { add( prefix, v );
				} else { buildParams( prefix + "[" + ( typeof v === "object" || jQuery.isArray(v) ? i : "") +"]", v )}
			});				
		} else if (  obj != null && typeof obj === "object" ) {
			jQuery.each( obj, function( k, v ) { buildParams( prefix + "[" + k + "]", v ); });				
		} else { add( prefix, obj ); }
	}
	function add( key, value ) {
		value = jQuery.isFunction(value) ? value() : value;
		s[ s.length ] = encodeURIComponent(key) + "=" + encodeURIComponent(value);
	}
}

function clearContent () {
  $('div#content').html('')
  $('div#totals').html('')
}

var app = {};
app.index = function () {
  var currentTerms = []
    , searchResults = {}
    , docs = {}
    , currentSearch = ''
    , lastSearchForPage = ''
    , limit = 15
    ;
  clearContent();
  $('div#content').html(
    '<div id="search-box">' +
      '<div id="search-box-title">Find packages...</div>' +
      '<div id="search-box-input">' +
        '<input id="search-input"></input>' +
      '</div>' +
    '</div>' +
    '<div id="results"></div>' +
    '<div class="spacer"></div>' +
    '<div id="top-packages">' +
      '<div id="latest-packages"><div class="top-title">Latest Updates</div></div>' +
      '<div id="top-dep-packages"><div class="top-title">Most Dependended On</div></div>' +
    '</div>'
  )
  
  request({url:'/api/_all_docs?limit=0'}, function (err, resp) {
    $('div#totals').html('<a href="/#/_all">' + (resp.total_rows - 1) +' total modules</a>')
  })
  
  request({url:'/_view/updated?descending=true&limit='+limit+'&include_docs=true'}, function (err, resp) {
    resp.rows.forEach(function (row) {
      docs[row.doc._id] = row.doc;
      $('<div class="top-package"></div>')
      .append('<div class="top-package-title"><a href="#/'+row.doc._id+'">'+row.doc._id+'</a></div>')
      .append('<div class="top-package-updated">'+prettyDate(row.doc.time.modified) +'</div>')
      .append('<div class="spacer"></div>')
      .appendTo('div#latest-packages')
    })
  })
  
  request({url:'/_view/dependencies?group=true'}, function (err, resp) {
    var results = {};
    resp.rows.forEach(function (row) {
      if (!results[row.value]) results[row.value] = [];
      results[row.value].push(row.key);
    })
    var keys = Object.keys(results);
    keys.sort(function(a,b){return a - b;});
    keys.reverse();
    for (var i=0;i<limit;i++) {
      if ($('div.top-package-dep').length == limit) return;
      results[keys[i]].forEach(function (r) {
        if ($('div.top-package-dep').length == limit) return;
        $('<div class="top-package"></div>')
        .append('<div class="top-package-title"><a href="#/'+r+'">'+r+'</a></div>')
        .append('<div class="top-package-dep">'+keys[i]+'</div>')
        .append('<div class="spacer"></div>')
        .appendTo('div#top-dep-packages')
      });
    }
  })
    
  var updateResults = function () {
    currentSearch = $('input#search-input').val().toLowerCase();
    currentTerms = currentSearch.split(' ');
    if (lastSearchForPage === currentSearch) return;
    if (currentSearch == '') $('div#top-packages').show();
    else $('div#top-packages').hide();
    var docsInPage = {}
      , ranked = {}
      ;
    currentTerms.forEach(function (term) {
      if (searchResults[term] && searchResults[term] !== 'pending') {
        searchResults[term].forEach(function (id) {
          if (docs[id] !== 'pending') docsInPage[id] = docs[id]
        });
      }
    })
    for (i in docsInPage) {
      var doc = docsInPage[i];
      doc.rank = 0
      doc.tagsInSearch = [];
      if (doc.description) doc.htmlDescription = doc.description;
      
      if (doc._id.toLowerCase() === currentSearch) doc.rank += 1000      
      
      if (doc['dist-tags'] && doc['dist-tags'].latest) {
        var tags = doc.versions[doc['dist-tags'].latest].keywords || doc.versions[doc['dist-tags'].latest].tags || [];
      } else { 
        var tags = [];
      }
      
      currentTerms.forEach(function (t) {
        t = t.toLowerCase();
        if (doc._id.toLowerCase().indexOf(t.toLowerCase()) !== -1) doc.rank += 750;
        if (tags.indexOf(t) !== -1) {
          doc.rank += 300;
          doc.tagsInSearch.push(t);
        }
        if (doc.description && doc.description.toLowerCase().indexOf(t) !== -1) {
          doc.rank += 100;
          var i = 0;
          while (doc.htmlDescription.toLowerCase().indexOf(t, i) !== -1) {
            var i = doc.htmlDescription.toLowerCase().indexOf(t, i);
            doc.htmlDescription = 
                                ( doc.htmlDescription.slice(0, i) 
                                + '<span class="desc-term">'
                                + doc.htmlDescription.slice(i, i+t.length)
                                + '</span>'
                                + doc.htmlDescription.slice(i + t.length)
                                )
                                ;
            i = i + t.length + '<span class="desc-term"></span>'.length
          }
          
        }
        doc.tags = tags;
      })
      
      if (!ranked[doc.rank]) ranked[doc.rank] = [];
      ranked[doc.rank].push(doc);
    }
    
    $('div#results').html('');
    var keys = Object.keys(ranked);
    for (var i=0;i<keys.length;i++) keys[i] = parseInt(keys[i])
    keys.sort(function(a,b){return a - b;});
    keys.reverse();
    keys.forEach(function (i) { ranked[i].forEach(function (doc) {
      var result = $(
        '<div class="result-container">' +
          '<div class="result">' + 
            '<span class="result-name"><a href="#/'+doc._id+'">'+doc._id+'</a></span>' + 
            '<span class="result-desc">'+(doc.htmlDescription || '') + '</span>' +
            '<div class="result-tags"></div>' +
            '<div class="spacer"></div>' +
          '</div>' +
        '</div>' +
        '<div class="spacer"></div>'
      )
      
      if (doc.tags.length > 0) {
        doc.tags.forEach(function (tag) {
          result.find('div.result-tags').append('<span class="tag">'+tag+'</span>')
        })
      }
      
      result.appendTo('div#results')
      $('span.tag').click(function () {
        $('input#search-input').val($(this).text()).change();
      })
    })})
    
    // $('span.result-tags').each(function () {
    //   var p = $(this).parent();
    //   $(this).css({right: p.position().left+p.width(), top:p.position().top})
    // })
    
    lastSearchForPage = currentSearch;
  }  
  
  var handleChange = function () {
    currentSearch = $('input#search-input').val().toLowerCase();
    currentTerms = currentSearch.split(' ')
    if (currentSearch === '') {
      $('div#results').html('')
      $('div#top-packages').show();
    }
    lastSearchForPage = ''
    var terms = currentTerms
      , c = currentSearch
      , tlength = terms.length
      ;
    terms.forEach(function (term) {
      if (!searchResults[term]) {
        searchResults[term] = 'pending'
        var qs = param(
          { startkey: JSON.stringify(term)
          , endkey: JSON.stringify(term+'ZZZZZZZZZZZZZZZZZZZ')
          , reduce: 'false'
          }
        )
        ;
        request({url:'/_view/search?'+qs}, function (err, resp) {
          var docids = [];
          searchResults[term] = [];
          resp.rows.forEach(function (row) {
            searchResults[term].push(row.id);
            if (docids.indexOf(row.id) === -1 && !docs[row.id]) {
              docs[row.id] = 'pending';
              docids.push(row.id);
            }
          })
          if (docids.length === 0) {
            lastSearchForPage = '';
            updateResults();
            return 
          }
          
          request({url:'/api/_all_docs?include_docs=true', type:'POST', data:{keys:docids} }, function (err, resp) {
            resp.rows.forEach(function (row) {
              row.doc.name = row.doc.name.toLowerCase();
              if (row.doc.description) row.doc.description = row.doc.description;
              docs[row.id] = row.doc;
            })
            lastSearchForPage = ''
            updateResults();
          })
        })
      } else {tlength -= 1}
    })
    if (tlength == 0) {lastSearchForPage = ''; updateResults()}
  }
  
  $('input#search-input').change(handleChange);
  $('input#search-input').keyup(handleChange)
  $("input#search-input").focus();
};

app.showPackage = function () {
  var id = this.params.id;
  clearContent();
  $('div#content').html('<div class="package"></div>')
  request({url:'/api/'+id}, function (err, doc) {
    var package = $('div.package')
    package.append('<div class="package-title">'+doc._id+'</div>')
    package.append('<div class="package-description">'+doc.description+'</div>')
    
    if (doc.repository && doc.repository.type === 'git' && (
          doc.repository.url.slice(0, 'http://github.com'.length) === 'http://github.com' ||
          doc.repository.url.slice(0, 'https://github.com'.length) === 'https://github.com'
          ) 
        ) {
          package.append('<a class="github" href="'+doc.repository.url.replace('.git', '')+'">github</a>')
    }
    
    if (doc['dist-tags'] && doc['dist-tags'].latest && (doc.versions[doc['dist-tags'].latest].keywords || doc.versions[doc['dist-tags'].latest].tags)) {
      package.append(
        '<div class="package-tags">tags: ' +
        (doc.versions[doc['dist-tags'].latest].keywords || doc.versions[doc['dist-tags'].latest].tags).join(', ') +
        '</div>'
      )
    }
    
    if (doc.author) {
      package.append('<div class="author">author: '+doc.author.name+'</div>')
    }
    
    if (doc.maintainers && doc.maintainers.length > 0) {
      var maintainers = $('<div class="package-maintainers"></div>').appendTo(package);
      doc.maintainers.forEach(function (m) {
        maintainers.append('<div class="package-maintainer">maintainer: '+m.name+'   </div>')
      })
    }
    
    if (doc['dist-tags'] && doc['dist-tags'].latest) {
      if (doc.versions[doc['dist-tags'].latest].dependencies) {
        var deps = $('<div class="package-deps">dependencies: </div>');
        for (i in doc.versions[doc['dist-tags'].latest].dependencies) {
          deps.append('<a class="dep-link" href="#/'+i+'">'+i+'</a>')
        }
        deps.appendTo(package);
      }
    }
    
    if (doc['dist-tags']) {
      for (i in doc['dist-tags']) {
        package.append(
          '<div class="package-download">' +
            '<a href="'+doc.versions[doc['dist-tags'][i]].dist.tarball.replace('jsregistry:5984', 'registry.npmjs.org').replace('packages:5984', 'registry.npmjs.org')+'">'+i+'</a> ('+doc.versions[doc['dist-tags'][i]].version+')' + 
          '</div>'
        )
      }
      package.append('<br/>')
      
    }
    
    if (doc.versions) {
      for (i in doc.versions) {
        package.append(
          '<div class="package-download">' +
            '<a href="'+doc.versions[i].dist.tarball.replace('jsregistry:5984', 'registry.npmjs.org').replace('packages:5984', 'registry.npmjs.org')+'">'+i+'</a>' + 
          '</div>'
        )
      }
    }

    request({url:'/_view/dependencies?reduce=false&key="'+id+'"'}, function (e, resp) {
      if (resp.rows.length === 0) return;
      var deps = ''
      deps += '<h4>Packages that depend on '+id+'</h4><div class="dependencies">'
      for (var i=0;i<resp.rows.length;i++) {
        deps += '<div class="dep"><a class="dep" href="/#/' +
                 resp.rows[i].id+'">'+resp.rows[i].id+'</a></div>'
      }
      deps += '</div>'
      package.append(deps)
    })
  })
}

app.alldoc = function () {
  var c = $('div#content')
    , limit = 100
    ;
  clearContent();
  var fetch = function () {
    $('div#more-all').remove();
    request({url:'/api/_all_docs?include_docs=true&limit='+limit+'&skip='+(limit - 100)}, function (err, resp) {
      var h = ''
      resp.rows.forEach(function (row) {
        if (row.id[0] !== '_') {
          h += (
            '<div class="all-package">' + 
              '<div class="all-package-name"><a href="/#/'+row.id+'">' + row.id + '</a></div>' +
              '<div class="all-package-desc">' + row.doc.description + '</div>' +
            '</div>' +
            '<div class="spacer"></div>'
          )
        }
      })
      c.append(h);
      limit += 100;
      $('<div id="more-all">Load 100 more</div>')
        .click(function () {fetch();})
        .appendTo(c)
        ;
    })
  }
  fetch();
  
}

$(function () { 
  app.s = $.sammy(function () {
    // Index of all databases
    this.get('', app.index);
    this.get("#/", app.index);
    this.get("#/_all", app.alldoc);
    this.get("#/:id", app.showPackage);
  })
  app.s.run();
});
