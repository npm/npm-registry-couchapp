[ 
    {
         "from": "/:pkg",
         "to": "/_show/package/:pkg",
         "method": "GET"
    },
    {
         "from": "/:pkg/:version",
         "to": "_show/package/:pkg",
         "method": "GET",
         "query": 
        {
             "version": ":version"
        }
    },
    {
         "from": "/:pkg",
         "to": "/_show/package/:pkg",
         "method": "POST"
    },
    {  
         "from": "/:pkg/:version",        
         "to": "_show/package/:pkg",        
         "method": "PUT",        
         "query": 
        {            
             "version": ":version"         
        }
    }
]