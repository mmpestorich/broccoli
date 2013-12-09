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
      mkdirp.sync(path.join(destDir, relativePath));
      process.nextTick(pathCallback); // async to avoid long stack traces
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
        hash = helpers.hashStats('preprocess', fullPath, fs.statSync(fullPath)),
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
