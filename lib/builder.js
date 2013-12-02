var fs = require('fs');
var mktemp = require('mktemp');
var rimraf = require('rimraf');
var synchronized = require('synchronized');


exports.Builder = Builder;
function Builder (options) {
  var self = this;

  this.reader = options.reader;
  this.compilerCollection = options.compilerCollection;
  this.tmpDir = mktemp.createDirSync('broccoli-XXXXXX.tmp');

  process.on('exit', function () {
    self.cleanupTmpDir();
  });

  this.cacheDir = this.tmpDir + '/cache.tmp';

  fs.mkdirSync(this.cacheDir);

  // Debounce logic; should probably be extracted
  //this.postBuildLock = {};
  this.buildScheduled = false;
  this.lockReleaseTimer = null;
  this.lockReleaseFunction = null;
  this.lockReleaseFirstScheduledAt = null;
}

// outputDir is optional
Builder.prototype.build = function (outputDir, callback) {
  var self = this,
      debounceDelay = 0;

  if (outputDir == null) { // jshint ignore:line
    // We are watching and serving; refactor this logic
    debounceDelay = 100;
  }

  function scheduleLockReleaseTimer () {
    if (!self.lockReleaseFirstScheduledAt) {
      self.lockReleaseFirstScheduledAt = Date.now();
    }

    self.lockReleaseTimer = setTimeout(self.lockReleaseFunction, debounceDelay);
  }

  if (self.lockReleaseTimer && Date.now() < self.lockReleaseFirstScheduledAt + 1000) {
    // Reschedule running timer because we keep getting events, but never put
    // off more than 1000 milliseconds in total
    clearTimeout(self.lockReleaseTimer);
    scheduleLockReleaseTimer();
  }

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
      self.outputTmpDir = mktemp.createDirSync(self.tmpDir + '/output-XXXXXX.tmp');
      outputDir = self.outputTmpDir;
    }

    self.buildTmpDir = mktemp.createDirSync(self.tmpDir + '/build-XXXXXX.tmp');

    var readerDest = mktemp.createDirSync(self.buildTmpDir + '/reader-XXXXXX.tmp');

    self.reader._setup({
      tmpDir: self.buildTmpDir,
      cacheDir: self.cacheDir
    });

    self.reader.read(readerDest, function (err) {
      if (err) {
        finish(err);
        return;
      }

      self.compilerCollection._setup({
        tmpDir: self.buildTmpDir,
        cacheDir: self.cacheDir
      });

      self.compilerCollection.run(readerDest, outputDir, function (err) {
        finish(err);
      });
    });

    function finish (err) {
      if (err) {
        self.buildError = err;
      }

      console.log('Built ' + (err ? 'with error ' : '') + '(' + (Date.now() - startTime) + ' ms)');

      releaseAfterDelay();
    }

    function releaseAfterDelay () {
      self.lockReleaseFunction = function () {
        self.lockReleaseTimer = null;
        self.lockReleaseFunction = null;
        self.lockReleaseFirstScheduledAt = null;

        done();

        if (callback != null) { // jshint ignore:line
          callback();
        }
      };

      scheduleLockReleaseTimer();
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
