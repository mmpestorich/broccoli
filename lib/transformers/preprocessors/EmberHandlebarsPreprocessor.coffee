EmberHandlebars = require('./../../../vendor/ember-template-compiler.js').EmberHandlebars;
Preprocessor = require './Preprocessor'

class EmberHandlebarsPreprocessor extends Preprocessor
  constructor: () ->
    @compileFunction = ''
    @extensions = []
    @targetExtension = 'js'

  process: () ->
    fileContents = fs.readFileSync(srcFilePath).toString()
    moduleContents = 'export default Ember.Handlebars.template(' + EmberHandlebars.precompile(fileContents).toString() + ');\n'

    fs.writeFileSync(destFilePath, moduleContents)
    callback()

module.exports = EmberHandlebarsPreprocessor;
