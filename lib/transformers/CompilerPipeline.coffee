async = require 'async'
fs = require 'fs'
mkdirp = require 'mkdirp'
path = require 'path'
helpers = require './../helpers'
Pipeline = require './../Pipeline'
Transformer = require './Transformer'

class CompilerPipeline extends Transformer

  transform: (srcDir, destDir, callback) ->
    @copyStaticFiles srcDir, destDir, @staticFiles

    async.eachSeries @compilers, (compiler, compilerCallback) =>
      try
        compiler.compile srcDir, destDir, (err) =>
          process.nextTick ->
            compilerCallback(err)
      catch err
        compilerCallback err
    (err) ->
      callback(err)

exports = CompilerPipeline
