module.exports = {
  broccoli: {
    src: 'assets',
    preprocessors: [
      {
        type: 'ES6TemplatePreprocessor',
        options: {
          extensions: [
            'handlebars',
            'hbs'
          ],
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
      },
      {
        type: 'ES6TranspilerPreprocessor'
      }
    ],
    compilers: [
      {
        type: 'JavaScriptConcatenationCompiler',
        options: {
          outputPath: 'app.js',
          useSourceURL: false, // s/b minify, uglify, etc...
          files: [
            'appkit/**/*.js'
          ]
        }
      },
      {
        type: 'StaticFileCompiler',
        options: {
          files: [
            'modernizr.js',
            'almond.js',
            'bootstrap.js',
            'jquery.js',
            'handlebars.runtime.js',
            'ember.js',
            'ember-data.js',
            'ember-resolver.js',
            'index.html'
          ]
        }
      }
    ],
    useBower: true
  }
};
