var os = require('osenv');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var mktemp = require('mktemp');
var rimraf = require('rimraf');
var synchronized = require('synchronized');


exports.Builder = Builder;
function Builder (options) {
  var self = this,
      baseTempDir = require('config').broccoli.out || os.tmpdir();

  mkdirp(baseTempDir);
  this.tmpDir = mktemp.createDirSync(path.join(baseTempDir, 'broccoli-XXXXXX.tmp'));

  this.reader = options.reader;
  this.transformer = options.transformer;

  process.on('exit', function () {
    self.cleanupTmpDir();
  });

  this.cacheDir = path.join(this.tmpDir, 'cache.tmp');
  fs.mkdirSync(this.cacheDir);

  this.buildScheduled = false
}

// outputDir is optional
Builder.prototype.build = function (outputDir, callback) {
  var self = this;

  if (this.buildScheduled) {
    return;
  }
  this.buildScheduled = true;

  //noinspection ReservedWordAsName
  synchronized(this, function (done) {
    var startTime = Date.now();

    self.buildScheduled = false;
    self.buildError = null;

    self.cleanupBuildProducts(); // remove last builds' directories

    if (outputDir == null) { // jshint ignore:line
      self.outputTmpDir = mktemp.createDirSync(path.join(self.tmpDir, 'output-XXXXXX.tmp'));
      outputDir = self.outputTmpDir;
    }

    self.buildTmpDir = mktemp.createDirSync(path.join(self.tmpDir, 'build-XXXXXX.tmp'));

    var readerDest = mktemp.createDirSync(path.join(self.buildTmpDir, 'reader-XXXXXX.tmp'));

    self.reader._setup({
      tmpDir: self.buildTmpDir,
      cacheDir: self.cacheDir
    });

    self.reader.read(readerDest, function (err) {
      if (err) {
        finish(err);
        return;
      }

      self.transformer._setup({
        tmpDir: self.buildTmpDir,
        cacheDir: self.cacheDir
      });

      self.transformer.transform(readerDest, outputDir, function (err) {
        finish(err);
      });
    });

    function finish (err) {
      if (err) self.buildError = err;
      console.log('Built ' + (err ? 'with error ' : '') + '(' + (Date.now() - startTime) + ' ms)');
      done();
      if (callback != null) {
        callback();
      }
    }
  });
};

Builder.prototype.cleanupTmpDir = function() {
  if (this.tmpDir != null) { // jshint ignore:line
    //noinspection JSUnresolvedFunction
    rimraf.sync(this.tmpDir);
  }
};

Builder.prototype.cleanupBuildProducts = function () {
  var fields = ['buildTmpDir', 'outputTmpDir'];

  for (var i = 0; i < fields.length; i++) {
    if (this[fields[i]] != null) { // jshint ignore:line
      //noinspection JSUnresolvedFunction
      rimraf.sync(this[fields[i]]);
      this[fields[i]] = null;
    }
  }
};
