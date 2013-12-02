var fs = require('fs');
var path = require('path');
var glob = require('glob');
var async = require('async');
var mkdirp = require('mkdirp');
var jsStringEscape = require('js-string-escape');
var transformers = require('../transformers');
var __extends = require('../helpers').__extends;


exports.CompilerCollection = CompilerCollection;
__extends(CompilerCollection, transformers.Transformer);
function CompilerCollection (compilers) {
  this.compilers = compilers;
}

CompilerCollection.prototype.run = function (srcDir, destDir, callback) {
  async.eachSeries(this.compilers, function (compiler, compilerCallback) {
    compiler.run(srcDir, destDir, function (err) {
      process.nextTick(function () { // async to avoid long stack traces
        compilerCallback(err);
      });
    });
  }, function (err) {
    callback(err);
  });
};


exports.Compiler = Compiler;
function Compiler(options) {
  for (var key in options) {
    if (options.hasOwnProperty(key)) {
      this[key] = options[key];
    }
  }
}


exports.JavaScriptConcatenationCompiler = JavaScriptConcatenationCompiler;
__extends(JavaScriptConcatenationCompiler, Compiler);
function JavaScriptConcatenationCompiler(options) {
  Compiler.call(this, options);
}

JavaScriptConcatenationCompiler.prototype.useSourceURL = true;

JavaScriptConcatenationCompiler.prototype.outputPath = 'app.js';

JavaScriptConcatenationCompiler.prototype.run = function (srcDir, destDir, callback) {
  var output = [];

  mkdirp.sync(destDir + '/' + path.dirname(this.outputPath));

  for (var i = 0; i < this.files.length; i++) {
    var pattern = this.files[i],
        matchingFiles = glob.sync(pattern, {
          cwd: srcDir,
          nomount: true,
          strict: true
        });

    if (matchingFiles.length === 0) {
      callback(new Error('Path or pattern "' + pattern + '" did not match any files'));
      return;
    }

    for (var j = 0; j < matchingFiles.length; j++) {
      var relativePath = matchingFiles[j],
          fullPath = srcDir + '/' + relativePath,
          fileContents = fs.readFileSync(fullPath).toString();

      if (!this.useSourceURL) {
        output.push(';\n' + fileContents + '\n');
      } else {
        // Should pull out copyright comment headers
        var expr = 'eval("' + jsStringEscape(fileContents) + '//# sourceURL=' + jsStringEscape(relativePath) + '");\n';
        output.push(expr);
      }
    }
  }

  fs.writeFileSync(destDir + '/' + this.outputPath, output.join(''));
  callback();
};


exports.StaticFileCompiler = StaticFileCompiler;
__extends(StaticFileCompiler, Compiler);
function StaticFileCompiler(options) {
  Compiler.call(this, options);
}

StaticFileCompiler.prototype.files = [];

StaticFileCompiler.prototype.run = function (srcDir, destDir, callback) {
  // Constructing globs like `{**/*.html,**/*.png}` should work reliably. If
  // not, we may need to switch to some multi-glob module.
  var combinedPattern = this.files.join(',');

  if (this.files.length > 1) {
    combinedPattern = '{' + combinedPattern + '}';
  }

  var paths = glob.sync(combinedPattern, {
    cwd: srcDir,
    nomount: true,
    strict: true
  });

  for (var i = 0; i < paths.length; i++) {
    var srcPath = srcDir + '/' + paths[i],
        destPath = destDir + '/' + paths[i],
        contents = fs.readFileSync(srcPath);

    mkdirp.sync(path.dirname(destPath));
    fs.writeFileSync(destPath, contents);
  }
  callback();
};
