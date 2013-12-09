path = require('path');
mktemp = require('mktemp');
rimraf = require('rimraf');

class Component
  constructor: (options) ->
    for own key, value of options
      @[key] = value

  getCacheDir: () ->
    if @cacheDir == null
      tempDir = path.join @setupOptions.cacheDir, 'tree-transform-XXXXXX.tmp' #FIX setupOptions not right
      @cacheDir = mktemp.createDirSync tempDir
    return @cacheDir

  removeCacheDir: () ->
    if @cacheDir != null
      rimraf.sync @cacheDir
    @cacheDir = null

  getTmpDir: () ->
    return @tmpDir

exports = Component
