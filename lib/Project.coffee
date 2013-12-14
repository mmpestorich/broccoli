path = require 'path'
project = require path.join process.cwd(), 'project.json'

Package = require './Package'
CoffeeScriptPreprocessor = require './transformers/preprocessors/CoffeeScriptPreprocessor'
EmberTemplateCompiler = require './transformers/compilers/EmberTemplateCompiler'
ES6ConcatenateCompiler = require './transformers/compilers/ES6ConcatenateCompiler'

class Project

  constructor: () ->
    { @source, @vendor, @output, @packages } = project

    @packages = for pkg in @packages
      source = path.join(project.source, pkg.source)
      output = pkg.output
      preprocessors = (new (module.require('./transformers/preprocessors/' + preprocessor.type))(preprocessor.options) for preprocessor in pkg['preprocessors'])
      compilers = (new (module.require('./transformers/compilers/' + compiler.type))(compiler.options) for compiler in pkg['compilers'])
      new Package(source, output, preprocessors, compilers)

module.exports = Project
