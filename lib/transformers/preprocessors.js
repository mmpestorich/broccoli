var fs = require('fs');
var path = require('path');
var glob = require('glob');
var async = require('async');
var mkdirp = require('mkdirp');
var mktemp = require('mktemp');
var rimraf = require('rimraf');
var jsStringEscape = require('js-string-escape');

var transformers = require('../transformers');
var helpers = require('../helpers');
var __extends = helpers.__extends;


var jsdom = require('jsdom').jsdom;
var document = global.document = jsdom();
var window = global.window = global.document.parentWindow;
var $ = global.$ = global.jQuery = global.jquery = require('../../bower_components/jquery/jquery.js'); //require('../../node_modules/jquery/dist/jquery.js')(window); // For newer jquery 2.1 beta and above
require('../../bower_components/handlebars/handlebars.js');
require('../../bower_components/ember/ember.js');
var Ember = global.Ember;


exports.PreprocessorPipeline = PreprocessorPipeline;
__extends(PreprocessorPipeline, transformers.Transformer);
function PreprocessorPipeline (preprocessors) {
  this.preprocessors = preprocessors;
}

PreprocessorPipeline.prototype.transform = function(srcDir, destDir, callback) {
  var self = this;

  var paths = glob.sync('**', {
    cwd: srcDir,
    dot: true, // should we ignore .dotfiles?
    mark: true, // trailing slash for directories; requires additional stat calls
    strict: true
  });

  async.eachSeries(paths, function (relativePath, pathCallback) {
    var fullPath = path.join(srcDir, relativePath);

    if (relativePath.slice(-1) === '/') {
      mkdirp.sync(path.join(destDir, relativePath))
      process.nextTick(pathCallback) // async to avoid long stack traces
    } else {
      processFile(fullPath, relativePath, self.preprocessors, function (err) {
        process.nextTick(function () { // async to avoid long stack traces
          pathCallback(err);
        });
      });
    }
  }, function (err) {
    callback(err);
  });

  function preprocessorsForFile (allPreprocessors, fileName) {
    allPreprocessors = allPreprocessors.slice();
    var applicablePreprocessors = [],
        destFileName;

    while (allPreprocessors.length > 0) {
      var preprocessor = null;

      for (var i = 0; i < allPreprocessors.length; i++) {
        destFileName = allPreprocessors[i].getDestFileName(fileName);
        if (destFileName != null) { // jshint ignore:line
          preprocessor = allPreprocessors[i];
          allPreprocessors.splice(i, 1);
          break;
        }
      }

      if (preprocessor != null) { // jshint ignore:line
        applicablePreprocessors.push(preprocessor);
        fileName = destFileName;
      } else {
        // None of the remaining preprocessors are applicable
        break;
      }
    }

    if (applicablePreprocessors.length === 0) {
      applicablePreprocessors.push(new CopyPreprocessor());
    }

    return applicablePreprocessors;
  }

  function processFile (fullPath, relativePath, preprocessors, callback) {
    // For now, we support generating only one output file per input file, but
    // in the future we may support more (e.g. to add source maps, or to
    // convert media to multiple formats)
    var relativeDir = path.dirname(relativePath),
        fileName = path.basename(relativePath),
        hash = helpers.statsHash('preprocess', fullPath, fs.statSync(fullPath)),
        preprocessCacheDir = path.join(self.getCacheDir(), hash),
        cachedFiles;

    // If we have cached preprocessing output for this file, link the cached
    // file(s) in place. Else, run all the preprocessors in sequence, cache
    // the final output, and then link the cached file(s) in place.
    try {
      cachedFiles = fs.readdirSync(preprocessCacheDir);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }

    if (cachedFiles) {
      linkFilesFromCache(cachedFiles);
      callback();
    } else {
      runPreprocessors(function (err, cachedFiles) {
        if (err) {
          callback(err);
          return;
        }
        linkFilesFromCache(cachedFiles);
        callback();
      });
    }

    function runPreprocessors (callback) {
      var preprocessorsToApply = preprocessorsForFile(preprocessors, relativePath),
          preprocessTmpDir = mktemp.createDirSync(path.join(self.getCacheDir(), 'preprocess-XXXXXX.tmp')),
          i = 0,
          preprocessStageDestDir,
          currentFileName = fileName, newFileName,
          currentFullPath = fullPath, newFullPath;

      async.eachSeries(preprocessorsToApply, function (preprocessor, eachCallback) {
        newFileName = preprocessor.getDestFileName(currentFileName);

        if (newFileName == null) { // jshint ignore:line
          throw new Error('Unexpectedly could not find destination file path anymore for ' + currentFileName + ' using ' + preprocessor.constructor.name);
        }

        preprocessStageDestDir = path.join(preprocessTmpDir, '' + i++);
        fs.mkdirSync(preprocessStageDestDir);
        newFullPath = path.join(preprocessStageDestDir, newFileName);

        var info = {
          moduleName: path.join(relativeDir, currentFileName.replace(/\.([^.\/]+)$/, ''))
        };

        preprocessor.process(currentFullPath, newFullPath, info, function (err) {
          if (err) {
            err.file = relativePath; // augment
            eachCallback(err);
          } else {
            currentFileName = newFileName;
            currentFullPath = newFullPath;
            eachCallback();
          }
        });
      }, function (err) {
        if (err) {
          callback(err);
          return;
        }

        // preprocessStageDestDir is now the directory with the output from
        // the last preprocessor
        var entries = linkFilesToCache(preprocessStageDestDir);

        rimraf.sync(preprocessTmpDir);
        callback(null, entries);
      });
    }

    function linkFilesToCache (dirPath) {
      fs.mkdirSync(preprocessCacheDir);

      var entries = fs.readdirSync(dirPath);
      for (var i = 0; i < entries.length; i++) {
        fs.linkSync(path.join(dirPath, entries[i]), path.join(preprocessCacheDir, entries[i]));
      }

      return entries; // return entries for performance
    }

    // Extract me, see PackageReader
    function linkFilesFromCache (entries) {
      for (var i = 0; i < entries.length; i++) {
        var srcFilePath = path.join(preprocessCacheDir, entries[i]),
            destFilePath = path.join(destDir, relativeDir, entries[i]);

        try {
          fs.linkSync(srcFilePath, destFilePath);
        } catch (err) {
          if (err.code !== 'EEXIST') {
            throw err;
          }

          fs.unlinkSync(destFilePath);
          fs.linkSync(srcFilePath, destFilePath);
        }
      }
    }
  }
};


exports.Preprocessor = Preprocessor;
function Preprocessor (options) {
  if (options != null) { // jshint ignore:line
    for (var key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  }
}

Preprocessor.prototype.getDestFileName = function (fileName) {
  var extension = path.extname(fileName).replace(/^\./, '');

  if ((this.extensions || []).indexOf(extension) !== -1) {
    return fileName.slice(0, -extension.length) + this.targetExtension;
  }
  return null;
};


// Special pass-through preprocessor that applies when no other preprocessor
// matches
exports.CopyPreprocessor = CopyPreprocessor;
__extends(CopyPreprocessor, Preprocessor);
function CopyPreprocessor () {
  CopyPreprocessor.__super__.constructor.apply(this, arguments);
}

CopyPreprocessor.prototype.process = function (srcFilePath, destFilePath, info, callback) {
  var fileContents = fs.readFileSync(srcFilePath);

  fs.writeFileSync(destFilePath, fileContents);
  callback();
};

CopyPreprocessor.prototype.getDestFileName = function (fileName) {
  return fileName;
};


exports.CoffeeScriptPreprocessor = CoffeeScriptPreprocessor;
__extends(CoffeeScriptPreprocessor, Preprocessor);
function CoffeeScriptPreprocessor () {
  this.options = {};
  CoffeeScriptPreprocessor.__super__.constructor.apply(this, arguments);
}

CoffeeScriptPreprocessor.prototype.extensions = ['coffee'];
CoffeeScriptPreprocessor.prototype.targetExtension = 'js';

CoffeeScriptPreprocessor.prototype.process = function (srcFilePath, destFilePath, info, callback) {
  // Copy options; https://github.com/jashkenas/coffee-script/issues/1924
  var optionsCopy = {};

  for (var key in this.options) {
    if (this.options.hasOwnProperty(key)) {
      optionsCopy[key] = this.options[key];
    }
  }

  var code = fs.readFileSync(srcFilePath).toString(),
      output;

  try {
    output = require('coffee-script').compile(code, optionsCopy);
  } catch (err) {
    /* jshint camelcase: false */
    err.line = err.location && err.location.first_line;
    err.column = err.location && err.location.first_column;
    /* jshint camelcase: true */
    callback(err);
    return;
  }

  fs.writeFileSync(destFilePath, output);
  callback();
};


exports.ES6TemplatePreprocessor = ES6TemplatePreprocessor;
__extends(ES6TemplatePreprocessor, Preprocessor);
function ES6TemplatePreprocessor () {
  ES6TemplatePreprocessor.__super__.constructor.apply(this, arguments);
}

ES6TemplatePreprocessor.prototype.compileFunction = '';
ES6TemplatePreprocessor.prototype.extensions = []; // set when instantiating
ES6TemplatePreprocessor.prototype.targetExtension = 'js';

ES6TemplatePreprocessor.prototype.process = function (srcFilePath, destFilePath, info, callback) {

  var fileContents = fs.readFileSync(srcFilePath).toString(),
      moduleContents = 'export default ' + this.compileFunction + '("' + jsStringEscape(fileContents) + '");\n';
//      moduleContents = 'export default ' + jsStringEscape(Ember.Handlebars.precompile(fileContents).toString()) + '");\n';

  fs.writeFileSync(destFilePath, moduleContents);
  callback();
};
