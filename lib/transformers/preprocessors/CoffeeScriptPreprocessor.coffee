coffee = require 'coffee-script'
fs = require 'fs'
path = require 'path'
helpers = require './../../helpers'

Preprocessor = require './Preprocessor'

class CoffeeScriptPreprocessor extends Preprocessor
  
  ###*
  @param {Package} context The current package being processed  
  ###
  process: (context) ->

    files = helpers.multiGlob ['**/*.coffee'], cwd: context.source

    files.forEach (file) =>
      code = fs.readFileSync(path.join(context.source, file)).toString()

      try
        context.cache.sources[path.join context.source, file.replace(/.coffee/, '.js')] = coffee.compile(code, @options)
      catch err
        err.line = err.location and err.location.first_line
        err.column = err.location and err.location.first_column
        throw new Error(err)

module.exports = CoffeeScriptPreprocessor
