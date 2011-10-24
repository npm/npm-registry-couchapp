module.exports =
  [ { from: "/", to:"_list/short/listAll", method: "GET" }
  , { from: "/-/jsonp/:jsonp", to:"_list/short/listAll", method: "GET" }

  , { from: "/-/all/since", to:"_list/index/modified", method: "GET" }

  , { from: "/-/rss", to: "_list/rss/modified"
    , method: "GET" }

  , { from: "/-/all", to:"_list/index/listAll", method: "GET" }
  , { from: "/-/all/-/jsonp/:jsonp", to:"_list/index/listAll", method: "GET" }

  , { from: "/-/short", to:"_list/short/listAll", method: "GET" }
  , { from: "/-/scripts", to:"_list/scripts/scripts", method: "GET" }
  , { from: "/-/by-field", to:"_list/byField/byField", method: "GET" }
  , { from: "/-/fields", to:"_list/sortCount/fieldsInUse", method: "GET",
      query: { group: "true" } }

  , { from: "/-/needbuild", to:"_list/needBuild/needBuild", method: "GET" }
  , { from: "/-/prebuilt", to:"_list/preBuilt/needBuild", method: "GET" }
  , { from: "/-/nonlocal", to:"_list/short/nonlocal", method: "GET" }

  , { from : "/favicon.ico", to:"../../npm/favicon.ico", method:"GET" }

  , { from: "/-/users", to:"../../../_users/_design/_auth/_list/index/listAll"
    , method: "GET" }
  , { from: "/-/user/:user", to:"../../../_users/:user", method: "PUT" }
  , { from: "/-/user/:user/-rev/:rev", to:"../../../_users/:user"
    , method: "PUT" }

  , { from: "/-/user/:user", to:"../../../_users/:user", method: "GET" }

  , { from: "/-/user-by-email/:email"
    , to:"../../../_users/_design/_auth/_list/email/listAll"
    , method: "GET" }

  , { from: "/-/by-user/:user", to: "_list/byUser/byUser", method: "GET" }

  , { from: "/:pkg", to: "/_show/package/:pkg", method: "GET" }
  , { from: "/:pkg/-/jsonp/:jsonp", to: "/_show/package/:pkg", method: "GET" }
  , { from: "/:pkg/:version", to: "_show/package/:pkg", method: "GET" }
  , { from: "/:pkg/:version/-/jsonp/:jsonp", to: "_show/package/:pkg"
    , method: "GET" }

  , { from: "/:pkg/-/:att", to: "../../:pkg/:att", method: "GET" }
  , { from: "/:pkg/-/:att/:rev", to: "../../:pkg/:att", method: "PUT" }
  , { from: "/:pkg/-/:att/-rev/:rev", to: "../../:pkg/:att", method: "PUT" }
  , { from: "/:pkg/-/:att/:rev", to: "../../:pkg/:att", method: "DELETE" }
  , { from: "/:pkg/-/:att/-rev/:rev", to: "../../:pkg/:att", method: "DELETE" }

  , { from: "/:pkg", to: "/_update/package/:pkg", method: "PUT" }
  , { from: "/:pkg/-rev/:rev", to: "/_update/package/:pkg", method: "PUT" }

  , { from: "/:pkg/:version", to: "_update/package/:pkg", method: "PUT" }
  , { from: "/:pkg/:version/-rev/:rev", to: "_update/package/:pkg"
    , method: "PUT" }

  , { from: "/:pkg/:version/-tag/:tag", to: "_update/package/:pkg"
    , method: "PUT" }
  , { from: "/:pkg/:version/-tag/:tag/-rev/:rev", to: "_update/package/:pkg"
    , method: "PUT" }

  , { from: "/:pkg/:version/-pre/:pre", to: "_update/package/:pkg"
    , method: "PUT" }
  , { from: "/:pkg/:version/-pre/:pre/-rev/:rev", to: "_update/package/:pkg"
    , method: "PUT" }

  , { from: "/:pkg/-rev/:rev", to: "../../:pkg", method: "DELETE" }
  ]
