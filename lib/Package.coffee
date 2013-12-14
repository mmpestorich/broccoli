class Package
  
  ###*
  @param {String} source
  @param {String} [output]
  @param {Array} [preprocessors]
  @param {Array} [compilers]
  ###
  constructor: (@source, @output, @preprocessors, @compilers) ->
    @cache =
      sources: {}
      outputs: {}

module.exports = Package 
