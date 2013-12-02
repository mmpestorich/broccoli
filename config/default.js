module.exports = {
  broccoli: {
    src: 'assets',
    preprocessors: [
      {
        type: 'ES6TemplatePreprocessor',
        options: {
          extensions: [ 'handlebars', 'hbs' ],
          compileFunction: 'Ember.Handlebars.compile'
        }
      },
      {
        type: 'CoffeeScriptPreprocessor',
        options: {
          options: {
            bare: true
          }
        }
      }
    ],
    compilers: [
      {
        type: 'ES6ConcatenationCompiler',
        options: {
          loaderFile: 'almond.js',
          ignoredModules: [
            'resolver'
          ],
          inputFiles: [
            'appkit/**/*.js'
          ],
          legacyFilesToAppend: [
            'jquery.js',
            'handlebars.js',
            'ember.js',
            'ember-data.js',
            'ember-resolver.js'
          ],
          outputFile: 'app.js'
        }
      }
    ],
    staticFiles: [
      'index.html'
    ],
    useBower: true
  }
};
