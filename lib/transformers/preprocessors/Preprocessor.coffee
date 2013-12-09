Filter = require './../../Filter'

class Preprocessor extends Filter

#var fs = require('fs');
#var path = require('path');
#var glob = require('glob');
#var async = require('async');
#var mkdirp = require('mkdirp');
#var mktemp = require('mktemp');
#var rimraf = require('rimraf');
#
#var transformers = require('.');
#var helpers = require('../../helpers');
#var __extends = helpers.__extends;
#
#exports.Preprocessor = Preprocessor;
#function Preprocessor (options) {
#  if (options != null) { // jshint ignore:line
#    for (var key in options) {
#      if (options.hasOwnProperty(key)) {
#        this[key] = options[key];
#      }
#    }
#  }
#}
#
#Preprocessor.prototype.getDestFileName = function (fileName) {
#  var extension = path.extname(fileName).replace(/^\./, '');
#
#  if ((this.extensions || []).indexOf(extension) !== -1) {
#    return fileName.slice(0, -extension.length) + this.targetExtension;
#  }
#  return null;
#};
#
#// Special pass-through preprocessor that applies when no other preprocessor
#// matches
#exports.CopyPreprocessor = CopyPreprocessor;
#__extends(CopyPreprocessor, Preprocessor);
#function CopyPreprocessor () {
#  CopyPreprocessor.__super__.constructor.apply(this, arguments);
#}
#
#CopyPreprocessor.prototype.process = function (srcFilePath, destFilePath, info, callback) {
#  var fileContents = fs.readFileSync(srcFilePath);
#
#  fs.writeFileSync(destFilePath, fileContents);
#  callback();
#};
#
#CopyPreprocessor.prototype.getDestFileName = function (fileName) {
#  return fileName;
#};

