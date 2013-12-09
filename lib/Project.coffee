path = require 'path'
project = require path.join process.cwd(), 'project.json'

EmberHandlebarsPreprocessor = require './transformers/preprocessors/EmberHandlebarsPreprocessor'
CoffeeScriptPreprocessor = require './transformers/preprocessors/CoffeeScriptPreprocessor'

class Project

  constructor: () ->
    { @packages, @preprocessors, @compilers } = project

    for preprocessor in @preprocessors
      module.require('./transformers/preprocessors/' + filter) if typeof filter is 'string'

    @packages ?= [
#      source: 'packages/framework'
#      output: 'framework'
#    ,
      source: 'packages/appkit'
      output: 'app'
    ]

    @preprocessors ?= [ EmberHandlebarsPreprocessor, CoffeeScriptPreprocessor ]

    @compilers ?= [ ES6ConcatenationCompiler ]

    @cache =
      sources: {}
      outputs: {}

module.exports = Project
