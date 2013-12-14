EmberHandlebars = require('./../../../vendor/ember-template-compiler.js').EmberHandlebars;
Compiler = require './Compiler'

class EmberTemplateCompiler extends Compiler
  constructor: () ->
    @extensions = [ 'hbs', 'handlebars' ]
    @targetExtension = 'js'

  process: () ->
    fileContents = fs.readFileSync(srcFilePath).toString()
    moduleContents = 'export default Ember.Handlebars.template(' + EmberHandlebars.precompile(fileContents).toString() + ');\n'

    fs.writeFileSync(destFilePath, moduleContents)
    callback()

module.exports = EmberTemplateCompiler
