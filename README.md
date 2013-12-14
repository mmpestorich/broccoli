# Asparagus (a fork of Broccoli)

This started as a branch of [Broccoli](https://github.com/joliss/broccoli). It is based on some of the same ideas,
structure and code but has sense diverged in the following ways:

- Configuration is done via asparagus.json
- Uses an in-memory cache instead of one on disk
- Temporary build output is configurable
- Allows multiple source roots and an output file per root if desired
- Formalizes an interface for Preprocessors and Compilers
  - Preprocessors:
  	- LessPreprocessor
  	- ScssPreprocessor
  	- CoffeeScriptPreprocessor
  	- LicensePreprocessor
  	- StripDebugPreprocessor
  - Compilers
    - EmberTemplateCompiler (precompiles handlebars templates)
  	- JavaScriptConcatenateCompiler
    - ES6ConcatenateCompiler
    - JavaScriptMinifyCompiler
    - JavaScriptUglifyCompiler
  - Copy Files (compiled files and static files)
- Watch for changes with node-fsevents (on OS X)
- (Planned) Watch for changes with node-inotify (on Linux)
- (Planned) Only process changes files rather that rebuilding everything


## Configuration
Configuration is done by adding an 'asparagus.json' file to the root of your project with the following format (options
are explained further below):

```js
module.exports = {
  broccoli: {
    src: 'assets',
    out: '/tmp',
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
            'handlebars.runtime.js',
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
```

## Builder uses a sensible output Directory for Live-Compiled Files
Saving compiled files to a temporary broccoli folder with a name that changes every time you launch the express server
can cause problems with indexing and code completion in some IDEs (such as IntelliJ) as there is no reliable way to
exclude that temp folder from the project sources. By specifying 'out' in the config file you can locate the build
folder elsewhere. The build option to the cli will still place output files into a public folder in the root of your
project.

## Pre-Compiled Ember Templates
Templates are no longer compiled by the client in the browser, they are pre-compiled by default by the
PreprocessorPipeline. This allows the smaller handlebars.runtime.js file can be used instead of the full blown
handlebars.js file. For example, in your app.js, instead of seeing something like:

```js
Ember.Handlebars.compile("<ul>\n{{#each}}\n  <li>{{this}}</li>\n{{/each}}\n</ul>\n");
```

...you will see instead the compiled template...

```js
Ember.Handlebars.template(function anonymous(Handlebars, depth0, helpers, partials, data) {
  this.compilerInfo = [4, '>= 1.0.0'];
  helpers = this.merge(helpers, Ember.Handlebars.helpers);
  data = data || {};
  var buffer = '', stack1, hashTypes, hashContexts, escapeExpression = this.escapeExpression, self = this;

  function program1(depth0, data) {
    var buffer = '', hashTypes, hashContexts;
    data.buffer.push("\n  <li>");
    hashTypes = {};
    hashContexts = {};
    data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "", {hash: {}, contexts: [depth0], types: ["ID"], hashContexts: hashContexts, hashTypes: hashTypes, data: data})));
    data.buffer.push("</li>\n");
    return buffer;
  }

  data.buffer.push("<ul>\n");
  hashTypes = {};
  hashContexts = {};
  stack1 = helpers.each.call(depth0, {hash: {}, inverse: self.noop, fn: self.program(1, program1, data), contexts: [], types: [], hashContexts: hashContexts, hashTypes: hashTypes, data: data});
  if (stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n</ul>\n");
  return buffer;

});
```

The original [README](https://github.com/joliss/broccoli/blob/master/README.md)

A fast, reliable asset builder & server.

For the command line interface, see [broccoli-cli](https://github.com/joliss/broccoli-cli).

For a sample app, see [broccoli-sample-app](https://github.com/joliss/broccoli-sample-app).

**This is pre-alpha work-in-progress. It's not usable for building actual JavaScript applications yet.**

Windows is not yet supported.

Design goals:

* Reliable: No dodgy cache invalidation or left-over files. You should never
  have to `rm -rf tmp` or restart the server.

* Fast: Rebuilding should take less than 200ms.

* Universal: Not just for JavaScript, but also for CSS, HTML, images, and
  other types of assets.

* Package manager integration: It should not matter whether files come from
  your local repository or are supplied by a package manager (like bower).
