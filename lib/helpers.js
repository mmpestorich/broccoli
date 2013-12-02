var jshashes = require('jshashes');


var statsHash = function(key, path, stats) {
  'use strict';
  var keys = [
        key,
        path,
        stats.mode,
        stats.size,
        stats.mtime.getTime()
      ],
      joinedKeys = keys.join('\n'),
      hash = new jshashes.SHA256().hex(joinedKeys);

  return hash;
};
exports.statsHash = statsHash;


// CoffeeScript inheritance
var __extends = function(child, parent) {

  for (var key in parent) {
    if (parent.hasOwnProperty(key)) {
      child[key] = parent[key];
    }
  }

  function C() {
    this.constructor = child;
  }

  C.prototype = parent.prototype;
  child.prototype = new C();
  child.__super__ = parent.prototype;
  return child;
};
exports.__extends = __extends;
