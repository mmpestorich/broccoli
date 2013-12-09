Transformer = require('./../Transformer')

class Compiler extends Transformer
  constructor: (options) ->
    super options
    @cache = {}

exports = Compiler
