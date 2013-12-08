var fs = require('fs');
var path = require('path');
var glob = require('glob');
var mktemp = require('mktemp');
var async = require('async');
var mkdirp = require('mkdirp');

var broccoli = require('./index');
var helpers = require('./helpers');
var __extends = helpers.__extends;

exports.Reader = Reader;
__extends(Reader, broccoli.Component);
function Reader() {

}

Reader.prototype._setup = function(options) {
  this.setupOptions = options;
};

Reader.prototype.read = function(destDir, callback) {
  throw new Error('not implemented');
};

// This method is good for polling, but the interface will have to change once
// we implement inotify-based watching
Reader.prototype.statsHash = function () {
  throw new Error('not implemented');
};


exports.PackageReader = PackageReader;
__extends(PackageReader, Reader);
function PackageReader (packages) {
  this.packages = packages;
}

PackageReader.prototype.read = function (destDir, callback) {
  var self = this;

  async.eachSeries(this.packages, function (pkg, packageCallback) {
    try {
      var fullPathRelativePathTuples = pkg.getFullPathRelativePathTuples();

      if (pkg.transformer == null) {
        copyTuples(fullPathRelativePathTuples, destDir);
        packageCallback();
      } else {
        var intermediateDir = mktemp.createDirSync(path.join(self.getTmpDir(), 'package-reader-XXXXXX.tmp'));
        copyTuples(fullPathRelativePathTuples, intermediateDir);
        pkg.transformer._setup(self.setupOptions);
        pkg.transformer.transform(intermediateDir, destDir, function (err) {
          packageCallback(err);
        });
        // We should perhaps have a target dir and then link from there, so the
        // package's transformer doesn't have to support overwriting
      }
    } catch (err) { // this is also catching errors bubbling up from nested callbacks
      callback(err);
    }
  }, function (err) {
    callback(err);
  });

  // This can probably be generalized somehow
  function copyTuples(fullPathRelativePathTuples, destDir) {
    for (var i = 0; i < fullPathRelativePathTuples.length; i++) {
      var fullPath = fullPathRelativePathTuples[i][0],
          relativePath = fullPathRelativePathTuples[i][1],
          destPath = path.join(destDir, relativePath);

      if (relativePath.slice(-1) === '/') {
        mkdirp.sync(destPath);
      } else {
        try {
          fs.linkSync(fullPath, destPath);
        } catch (err) {
          if (err.code !== 'EEXIST') {
            throw err;
          }
          fs.unlinkSync(destPath);
          fs.linkSync(fullPath, destPath);
        }
      }
    }
  }
};

PackageReader.prototype.statsHash = function () {
  return helpers.hashStrings(this.packages.map(function (pkg) {
    return pkg.statsHash();
  }));
};


exports.Package = Package;
function Package(baseDirectory, transformer, options) {
  this.baseDirectory = baseDirectory;
  this.transformer = transformer;
  this.options = options || {};
}

Package.prototype.assetDirectory = null;

Package.prototype.getAssetDirectory = function() {
  var assetDirectory = this.assetDirectory;
  if (assetDirectory == null) {
    // It's not clear that this is a sensible heuristic to hard-code here
    if (fs.existsSync(path.join(this.baseDirectory, 'lib'))) {
      assetDirectory = 'lib';
    } else {
      assetDirectory = '.';
    }
  }
  return path.join(this.baseDirectory, (assetDirectory || '.'));
};

Package.prototype.setAssetDirectory = function(assetDirectory) {
  this.assetDirectory = assetDirectory;
};

Package.prototype.setTransformer = function(transformer) {
  this.transformer = transformer;
};

Package.prototype.getFullPathRelativePathTuples = function() {
  if (this.options.main) {
    var fullPathRelativePathTuples = [];
    for (var i = 0; i < this.options.main.length; i++) {
      glob.sync('**/' + this.options.main[i], { cwd: this.baseDirectory }).forEach(function(match) {
		var fullPath = path.join(this.baseDirectory, match),
			relativePath = path.basename(match);
		fullPathRelativePathTuples.push([fullPath, relativePath]);
	  }, this);	// jshint ignore:line
              // Bug in IntelliJ: http://youtrack.jetbrains.com/issue/WEB-6667
    }
    return fullPathRelativePathTuples;
  } else {
    var relativePaths = glob.sync('**', {
      cwd: this.getAssetDirectory(),
      dot: true, // should we ignore .dotfiles?
      mark: true, // trailing slash for directories; requires additional stat calls
      strict: true
    });
    return relativePaths.map(function(relativePath) {
      return [path.join(this.getAssetDirectory(), relativePath), relativePath];
    }, this);
  }
};

Package.prototype.statsHash = function() {
  // Race conditions, race conditions everywhere!
  return helpers.hashStrings(this.getFullPathRelativePathTuples().map(function(tuple) {
    var fullPath = tuple[0];
    return helpers.hashStats('', fullPath, fs.statSync(fullPath))
  }))
};


exports.bowerPackages = bowerPackages;
function bowerPackages(bowerDir, packageOptions) {
  var files = [],
      directories = [],
      packages = [];

  if (typeof bowerDir !== 'string' && packageOptions == null) {
    // bowerDir is optional
    packageOptions = bowerDir;
    bowerDir = null;
  }
  if (bowerDir == null) {
    bowerDir = 'bower_components';
  }

  try {
    files = fs.readdirSync(bowerDir);
    directories = files.filter(function(f) {
      return fs.statSync(path.join(bowerDir, f)).isDirectory()
    }, this);
  } catch(error) {
    // bowerDir: No such file or directory
  }

  for (var i = 0; i < directories.length; i++) {
    var pkg = helpers.loadBroccoliPackage(path.join(bowerDir, directories[i]));
    packages.push(pkg)
  }

  return packages
}
