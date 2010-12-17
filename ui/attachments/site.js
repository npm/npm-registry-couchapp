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

var app = {};
app.index = function () {
  var currentTerms = []
    , searchResults = {}
    , docs = {}
    , currentSearch = ''
    , lastSearchForPage = ''
    ;
    
  $('div#content').html(
    '<div id="search-box">' +
      '<div id="search-box-title">Find packages...</div>' +
      '<div id="search-box-input">' +
        '<input id="search-input"></input>' +
      '</div>' +
    '</div>' +
    '<div id="results"></div>'
  )
    
  var updateResults = function () {
    currentSearch = $('input#search-input').val().toLowerCase();
    currentTerms = currentSearch.split(' ');
    if (lastSearchForPage === currentSearch) return;
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
        var tags = doc.versions[doc['dist-tags'].latest].keywords || [];
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
            '<span class="result-tags"></span>' +
          '</div>' +
        '</div>' +
        '<div class="spacer"></div>'
      )
      
      if (doc.tags.length > 0) {
        doc.tags.forEach(function (tag) {
          result.find('span.result-tags').append('<span class="tag">'+tag+'</span>')
        })
      }
      
      result.appendTo('div#results')
      $('span.tag').click(function () {
        $('input#search-input').val($(this).text()).change();
      })
    })})
    lastSearchForPage = currentSearch;
  }  
  
  var handleChange = function () {
    currentSearch = $('input#search-input').val().toLowerCase();
    currentTerms = currentSearch.split(' ')
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
            console.log('calling refresh')
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
  $('div#content').html('<div class="package"></div>')
  request({url:'/api/'+id}, function (err, doc) {
    var package = $('div.package')
    .append('<div class="package-title">'+doc._id+'</div>')
    .append('<div class="package-description">'+doc.description+'</div>')
    console.log(doc.versions[doc['dist-tags'].latest])
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
    
    if (doc['dist-tags']) {
      for (i in doc['dist-tags']) {
        package.append(
          '<div class="package-download">' +
            '<a href="'+doc.versions[doc['dist-tags'][i]].dist.tarball+'">'+i+'</a>' + 
          '</div>'
        )
      }
    }
    
    if (doc.versions) {
      for (i in doc.versions) {
        package.append(
          '<div class="package-download">' +
            '<a href="'+doc.versions[i].dist.tarball+'">'+i+'</a>' + 
          '</div>'
        )
      }
    }
    
    
  })
}

$(function () { 
  app.s = $.sammy(function () {
    // Index of all databases
    this.get('', app.index);
    this.get("#/", app.index);
    this.get("#/:id", app.showPackage);
  })
  app.s.run();
});
