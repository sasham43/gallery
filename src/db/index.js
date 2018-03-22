var _config = require('../config');
var assert = require('assert'); // get this
var q = require('q');
var massive = require('massive');

var config = _config.get();
var connections;

module.exports = function(name, thing){
  connections = connections || {};
  var d = q.defer();

  console.log('connections:',thing, Object.keys(connections))
  // console.time('connect');

  if(connections[name]){
    console.log('using existing connect:', thing)
    d.resolve(connections[name])
  } else {
    console.log('connecting to db',require('path').join(__dirname, '../db'))

    massive({
      connectionString: config[name].connection
    },{
      scripts: require('path').join(__dirname, '../db')
    }).then(function(db){
        // console.log('connected to db:',db.loader.scripts)
        connections[name] = db;
        // console.log('connections2:', thing,Object.keys(connections))
        // console.timeEnd('connect');
        d.resolve(db);
    }).catch(function(err){
      console.log('err connecting to db:', err)
      d.reject(err);
    })
  }

  return d.promise;
}
