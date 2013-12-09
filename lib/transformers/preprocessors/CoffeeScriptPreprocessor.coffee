coffee = require 'coffee-script'
fs = require 'fs'
path = require 'path'
helpers = require './../../helpers'

Preprocessor = require './Preprocessor'

class CoffeeScriptPreprocessor extends Preprocessor

  process: (context) ->

    for pkg in context.packages
      files = helpers.multiGlob '**/*.coffee', cwd: pkg.source

      files.forEach (file) =>
        context.cache.sources[path.join path.dirname(file), path.basename(file), '.coffee'] = fs.readFileSync(file).toString()

        try
          context.cache.sources[path.join path.dirname(file), path.basename(file), '.js'] = coffee.compile(code, bare: true)
        catch err
          err.line = err.location and err.location.first_line
          err.column = err.location and err.location.first_column
          callback(err)
          return

    return

module.exports = CoffeeScriptPreprocessor
