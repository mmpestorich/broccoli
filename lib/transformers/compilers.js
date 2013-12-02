var fs = require('fs');
var path = require('path');
var async = require('async');
var mkdirp = require('mkdirp');
var jsStringEscape = require('js-string-escape');
var ES6Transpiler = require('es6-module-transpiler').Compiler;
var transformers = require('../transformers');
var helpers = require('../helpers');

var __extends = helpers.__extends;


exports.CompilerPipeline = CompilerPipeline;
__extends(CompilerPipeline, transformers.Transformer);
function CompilerPipeline (options) {
  for (var key in options) {
    if (options.hasOwnProperty(key)) {
      this[key] = options[key];
    }
  }
}

CompilerPipeline.prototype.transform = function (srcDir, destDir, callback) {
  this.copyStaticFiles(srcDir, destDir, this.staticFiles);

  async.eachSeries(this.compilers, function (compiler, compilerCallback) {
    compiler.compile(srcDir, destDir, function (err) {
      process.nextTick(function () { // async to avoid long stack traces
        compilerCallback(err);
      });
    });
  }, function (err) {
    callback(err);
  });
};

CompilerPipeline.prototype.copyStaticFiles = function (srcDir, destDir, staticFiles) {
  var paths = helpers.multiGlob(staticFiles, {cwd: srcDir});

  for (var i = 0; i < paths.length; i++) {
    var srcPath = path.join(srcDir, paths[i]),
        destPath = path.join(destDir, paths[i]),
        contents = fs.readFileSync(srcPath);

    mkdirp.sync(path.dirname(destPath));
    fs.writeFileSync(destPath, contents);
  }
};


exports.Compiler = Compiler;
function Compiler(options) {
  for (var key in options) {
    if (options.hasOwnProperty(key)) {
      this[key] = options[key];
    }
  }
}


// The ES6ConcatenationCompiler automatically includes modules referenced by import statements.
// TODO: Add caching if necessary
exports.ES6ConcatenationCompiler = ES6ConcatenationCompiler;
__extends(ES6ConcatenationCompiler, Compiler);
function ES6ConcatenationCompiler (options) {
  Compiler.call(this, options);
}

ES6ConcatenationCompiler.prototype.compile = function (srcDir, destDir, callback) {
  var self = this,
      modulesAdded = {},
      output = [];

  addLegacyFile(this.loaderFile);

  var inputFiles = helpers.multiGlob(this.inputFiles, {cwd: srcDir});

  for (var i = 0; i < inputFiles.length; i++) {
    var inputFile = inputFiles[i];

    try {
      if (inputFile.slice(-3) !== '.js') {
        throw new Error('ES6 file does not end in .js: ' + inputFile);
      }

      var moduleName = inputFile.slice(0, -3);

      addModule(moduleName);
    } catch (err) { // we should not have to catch here; invoker should catch
      callback(err);
      return;
    }
  }

  var legacyFiles = helpers.multiGlob(this.legacyFilesToAppend, {cwd: srcDir});

  for (i = 0; i < legacyFiles.length; i++) {
    addLegacyFile(legacyFiles[i]);
  }

  fs.writeFileSync(path.join(destDir, this.outputFile), output.join(''));
  callback();

  function addModule (moduleName) {
    if (modulesAdded[moduleName]) {
      return;
    }

    if (self.ignoredModules.indexOf(moduleName) !== -1) {
      return;
    }

    var modulePath = moduleName + '.js',
        fileContents = fs.readFileSync(path.join(srcDir, modulePath)).toString(),
        compiler = new ES6Transpiler(fileContents, moduleName);

    output.push(wrapInEval(compiler.toAMD(), modulePath));

    modulesAdded[moduleName] = true;

    var imports = compiler.imports.map(function (importNode) {
      if (importNode.type !== 'ImportDeclaration' ||
        importNode.source.type !== 'Literal' ||
        !importNode.source.value) {
        throw new Error('Internal error: Esprima import node has unexpected structure');
      }

      return importNode.source.value;
    });

    for (var i = 0; i < imports.length; i++) {
      addModule(imports[i]);
    }
  }

  function addLegacyFile (filePath) {
    var fileContents = fs.readFileSync(path.join(srcDir, filePath)).toString();
    output.push(wrapInEval(fileContents, filePath));
  }
};


function wrapInEval (fileContents, fileName) {
  // Should pull out copyright comment headers
  // Eventually we want source maps instead of sourceURL
  return 'eval("' + jsStringEscape(fileContents) + '//# sourceURL=' + jsStringEscape(fileName) + '");\n';
}
