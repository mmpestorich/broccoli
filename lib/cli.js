#!/usr/bin/env node

var a_push = Array.prototype.push;

var pkg = require('../package.json');
var fs = require('fs');
var path = require('path');
var findup = require('findup-sync');
var is = require('iz');
var program = require('commander').version(pkg.version);
var broccoli = require('./index');


var config = require('config');

config.setModuleDefaults('broccoli', {
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
});

var bConfig = config.broccoli;


function noop1(arg) {
  return arg;
}


function builderFactory() {

  // Builder
  //    |
  //    PackageReader > Reader (Package...)
  //                            |
  //                            srcDir, PreprocessorCollection > Transformer > Component (Preprocessor(options)...), options
  //    |
  //    CompilerCollection > Transformer > Component (Compiler(options)...)

  var packages = [],
      preprocessors,
      compilers;

  // Process bower packages first since src should be able to override anything in bower_components
  if (bConfig.useBower) {
    a_push.apply(packages, broccoli.readers.bowerPackages());
  }

  preprocessors = bConfig.preprocessors.map(function(preprocessor) {
    return new broccoli.transformers.preprocessors[preprocessor.type](preprocessor.options || {});
  });

  packages.push(new broccoli.readers.Package(bConfig.src, new broccoli.transformers.preprocessors.PreprocessorCollection(preprocessors)));

  compilers = bConfig.compilers.map(function(compiler) {
    return new broccoli.transformers.compilers[compiler.type](compiler.options || {});
  });

  return new broccoli.Builder({
    reader: new broccoli.readers.PackageReader(packages),
    compilerCollection: new broccoli.transformers.compilers.CompilerCollection(compilers)
  });
}


program
  .command('build [dir]')
  .action(function(dir) {
    var builder, outputDir = dir || 'public';

    try {
      fs.mkdirSync(outputDir);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
      console.error('Error: Directory "' + outputDir + '" already exists. Refusing to overwrite files.');
      process.exit(1);
    }

    builder = builderFactory();

    builder.build(outputDir, function () {
      if (builder.buildError) {
        // We should report this nicely
        console.error('Some error occurred; use "serve" to see the error message :/');
        process.exit(1);
      } else {
        process.exit(0);
      }
    });
  });

//noinspection JSValidateTypes
program
  .command('serve')
  .option('-a, --addr <addr>', 'The address to run the server on', noop1, 'localhost')
  .option('-p, --port <port>', 'The port to run the server on', parseInt, 8000)
  .action(function(opts) {
    var builder = builderFactory();

    opts.addr = is(opts.addr).ip() ? opts.addr : '127.0.0.1';
    opts.port = is(opts.port).between(0, 65535) ? opts.port : 8000;

    broccoli.server.serve(builder, opts.addr, opts.port);
  });

program.parse(process.argv);
