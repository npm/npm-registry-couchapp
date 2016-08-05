# Follow: CouchDB changes notifier for NodeJS

Follow (upper-case *F*) comes from an internal Iris Couch project used in production for over a year.

## Objective

The API must be very simple: notify me every time a change happens in the DB. Also, never fail.

If an error occurs, Follow will internally retry without notifying your code.

Specifically, this should be possible:

1. Begin a changes feed. Get a couple of change callbacks
2. Shut down CouchDB
3. Go home. Have a nice weekend. Come back on Monday.
4. Start CouchDB with a different IP address
5. Make a couple of changes
6. Update DNS so the domain points to the new IP
7. Once DNS propagates, get a couple more change callbacks

## Failure Mode

If CouchDB permanently crashes, there is an option of failure modes:

* **Default:** Simply never call back with a change again
* **Optional:** Specify an *inactivity* timeout. If no changes happen by the timeout, Follow will signal an error.

## Very Simple API

This looks much like the `request` package.

    var follow = require('follow');
    follow("https://example.iriscouch.com/boogie", function(error, change) {
      if(!error) {
        console.log("Got change number " + change.seq + ": " + change.id);
      }
    })

The `error` parameter to the callback will basically always be `null`.

The first argument can be an object, useful to include the documents in the feed.

    follow({db:"https://example.iriscouch.com/boogie", include_docs:true}, function(error, change) {
      if(!error) {
        console.log("Change " + change.seq + " has " + Object.keys(change.doc).length + " fields");
      }
    })

### follow(options, callback)

The first argument is an options object. The only required option is `db`. Instead of an object, you can use a string to indicate the `db` value.

All of the CouchDB _changes options are allowed. See http://guide.couchdb.org/draft/notifications.html.

* `db` | Fully-qualified URL of a couch database. (Basic auth URLs are ok.)
* `since` | The sequence number to start from. Use `"now"` to start from the latest change in the DB.
* `heartbeat` | Milliseconds within which CouchDB must respond (default: **30000** or 30 seconds)
* `feed` | **Optional but only "continuous" is allowed**
* `filter` |
  * **Either** a path to design document filter, e.g. `app/important`
  * **Or** a Javascript `function(doc, req) { ... }` which should return true or false

Besides the CouchDB options, more are available:

* `headers` | Object with HTTP headers to add to the request
* `inactivity_ms` | Maximum time to wait between **changes**. Omitting this means no maximum.

## Object API

The main API is a thin wrapper around the EventEmitter API.

    var follow = require('follow');

    var opts = {}; // Same options paramters as before
    var feed = new follow.Feed(opts);

    // You can also set values directly.
    feed.db            = "http://example.iriscouch.com/boogie";
    feed.since         = 3;
    feed.heartbeat     = 30    * 1000
    feed.inactivity_ms = 86400 * 1000;

    feed.filter = function(doc, req) {
      // req.query is the parameters from the _changes request.
      console.log('Filtering for query: ' + JSON.stringify(req.query));

      if(doc.stinky || doc.ugly)
        return false;
      return true;
    }

    feed.on('change', function(change) {
      console.log('Doc ' + change.id + ' in change ' + change.seq + ' is neither stinky nor ugly.');
    })

    feed.on('error', function(er) {
      console.error('Since Follow always retries on errors, this must be serious');
      throw er;
    })

    feed.follow();

## Error conditions

Follow is happy to retry over and over, for all eternity. It will only emit an error if it thinks your whole application might be in trouble.

* *DB confirmation* failed: Follow confirms the DB with a preliminary query, which must reply properly.
* *Your inactivity timer* expired: This is a last-ditch way to detect possible errors. What if couch is sending heartbeats just fine, but nothing has changed for 24 hours? You know that for your app, 24 hours with no change is impossible. Maybe your filter has a bug? Maybe you queried the wrong DB? Whatever the reason, Follow will emit an error.
* JSON parse error, which should be impossible from CouchDB
* Invalid change object format, which should be impossible from CouchDB
* Internal error, if the internal state seems wrong, e.g. cancelling a timeout that already expired, etc. Follow tries to fail early.
