#!/usr/bin/env node

//var a_push = Array.prototype.push;

//var fs = require('fs');
var is = require('iz');
//var path = require('path');
var program = require('commander').version(require('../package.json').version);
var server = require('./server');

var Project = require('./Project');

function noop1(arg) {
  return arg;
}


//var path = require('path');

//require(path.join(process.cwd(), 'bower.json'))
//require('config').setModuleDefaults('broccoli', {
//  broccoli: {
//    src: 'assets',
//    out: 'build',
//    preprocessors: [
//      {
//        type: 'ES6TemplatePreprocessor',
//        options: {
//          extensions: [ 'handlebars', 'hbs' ],
//          compileFunction: 'Ember.Handlebars.compile'
//        }
//      },
//      {
//        type: 'CoffeeScriptPreprocessor',
//        options: {
//          options: {
//            bare: true
//          }
//        }
//      }
//    ],
//    compilers: [
//      {
//        type: 'ES6ConcatenationCompiler',
//        options: {
//          loaderFile: 'almond.js',
//          ignoredModules: [
//            'resolver'
//          ],
//          inputFiles: [
//            'appkit/**/*.js'
//          ],
//          legacyFilesToAppend: [
//            'jquery.js',
//            'handlebars.js',
//            'ember.js',
//            'ember-data.js',
//            'ember-resolver.js'
//          ],
//          outputFile: 'app.js'
//        }
//      }
//    ],
//    staticFiles: [
//      'index.html'
//    ],
//    useBower: true
//  }
//});

//var broccoli = require('./index');

//function builderFactory() {
//
//  // Builder
//  //    |
//  //    PackageReader > Reader (Package...)
//  //                            |
//  //                            srcDir, PreprocessorPipeline > Transformer > Component (Preprocessor(options)...), options
//  //    |
//  //    CompilerPipeline > Transformer > Component (Compiler(options)...)
//
//  var packages = [],
//      preprocessors,
//      compilers;
//
//  // Process bower packages first since src should be able to override anything in bower_components
//  if (broccoli.config.useBower) {
//    a_push.apply(packages, broccoli.readers.bowerPackages());
//  }
//
//  preprocessors = broccoli.config.preprocessors.map(function(preprocessor) {
//    return new broccoli.transformers.preprocessors[preprocessor.type](preprocessor.options || {});
//  });
//
//  packages.push(new broccoli.readers.Package(broccoli.config.src, new broccoli.transformers.preprocessors.PreprocessorPipeline(preprocessors)));
//
//  compilers = broccoli.config.compilers.map(function(compiler) {
//    return new broccoli.transformers.compilers[compiler.type](compiler.options || {});
//  });
//
//  return new broccoli.Builder({
//    reader: new broccoli.readers.PackageReader(packages),
//    transformer: new broccoli.transformers.compilers.CompilerPipeline({
//      staticFiles: broccoli.config.staticFiles,
//      compilers: compilers
//    })
//  });
//}


//program
//  .command('build [dir]')
//  .action(function(dir) {
//    var builder, outputDir = dir || 'public';
//
//    try {
//      fs.mkdirSync(outputDir);
//    } catch (err) {
//      if (err.code !== 'EEXIST') {
//        throw err;
//      }
//      console.error('Error: Directory "' + outputDir + '" already exists. Refusing to overwrite files.');
//      process.exit(1);
//    }
//
//    builder = builderFactory();
//
//    builder.build(outputDir, function () {
//      if (builder.buildError) {
//        // We should report this nicely
//        console.error('Some error occurred; use "serve" to see the error message :/');
//        process.exit(1);
//      } else {
//        process.exit(0);
//      }
//    });
//  });

//noinspection JSValidateTypes
program
  .command('serve')
  .option('-a, --addr <addr>', 'The address to run the server on', noop1, 'localhost')
  .option('-p, --port <port>', 'The port to run the server on', parseInt, 8000)
  .action(function(opts) {
//    var builder = builderFactory();

    opts.addr = is(opts.addr).ip() ? opts.addr : '127.0.0.1';
    opts.port = is(opts.port).between(0, 65535) ? opts.port : 8000;

    server.serve(new Project()/*builder*/, opts.addr, opts.port);
  });

program.parse(process.argv);
