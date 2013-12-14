fs = require 'fs'
path = require 'path'
helpers = require './../../helpers'
Compiler = require './Compiler'

class StaticFileCompiler extends Compiler

  ###*
  @param {object} context The current package being processed  
  ###
  process: (context) ->
    
    paths = helpers.multiGlob staticFiles, cwd: srcDir
  
    for _path in paths
      srcPath = path.join(srcDir, _path)
      destPath = path.join(destDir, _path)
      contents = fs.readFileSync(srcPath)
  
    mkdirp.sync(path.dirname(destPath))
    fs.writeFileSync(destPath, contents)

module.exports = StaticFileCompiler
