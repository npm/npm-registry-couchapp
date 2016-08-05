// Copyright 2011 Iris Couch
//
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
//
//        http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.

exports.scrub_creds = function scrub_creds(url) {
  return url.replace(/^(https?:\/\/)[^:]+:[^@]+@(.*)$/, '$1$2'); // Scrub username and password
}

exports.JP = JSON.parse;
exports.JS = JSON.stringify;
exports.JDUP = function(obj) { return JSON.parse(JSON.stringify(obj)) };

// Wrap log4js so it will not be a dependency.
var VERBOSE;
if(require.isBrowser)
  VERBOSE = true;
else
  verbose = (process.env.verbose === 'true');

var noop = function() {};
var noops = { "trace": noop
            , "debug": VERBOSE ? console.log   : noop
            , "info" : VERBOSE ? console.info  : noop
            , "warn" : VERBOSE ? console.warn  : noop
            , "error": VERBOSE ? console.error : noop
            , "fatal": VERBOSE ? console.error : noop

            , "setLevel": noop
            }

try {
  exports.log4js = require('log4js');
} catch(e) {
  exports.log4js = null;
}

if(typeof exports.log4js !== 'function')
  exports.log4js = function() {
    return { 'getLogger': function() { return noops }
           }
  }
