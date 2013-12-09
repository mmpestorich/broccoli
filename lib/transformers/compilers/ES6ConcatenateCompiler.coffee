fs = require 'fs'
path = require 'path'
helpers = require './../../helpers'
Compiler = require './Compiler'

class ES6ConcatenationCompiler extends Compiler

  run: (srcDir, destDir, callback) ->
    # When we are done compiling, we replace this.cache with newCache,
    # so that unused cache entries are garbage-collected
    modulesAdded = {}
    newCache = {}
    output = []

    addLegacyFile @loaderFile

    inputFiles = helpers.multiGlob @inputFiles, cwd: srcDir
    for inputFile in inputFiles
      if inputFile.slice(-3) isnt '.js'
        throw new Error "ES6 file does not end in .js: #{inputFile}"
      moduleName = inputFile.slice 0, -3
      addModule moduleName

    legacyFiles = helpers.multiGlob @legacyFilesToAppend, cwd: srcDir
    addLegacyFile legacyFile for legacyFile in legacyFiles

    fs.writeFileSync path.join destDir, @outputFile, output.join ''

    self.cache = newCache
    callback()

    addModule = (moduleName) =>
      return if modulesAdded[moduleName]
      return if @ignoredModules.indexOf(moduleName) isnt -1

      modulePath = "#{moduleName}.js"
      fullPath = path.join srcDir, modulePath

      try
        statsHash = helpers.hashStats 'es6Transpile', modulePath, fs.statSync fullPath
        cacheObject = self.cache[statsHash]

        if cacheObject? # cache miss
          fileContents = fs.readFileSync(fullPath).toString()
          compiler = new ES6Transpiler(fileContents, moduleName)

          # Resolve relative imports by mutating the compiler's list of import nodes
          for importNode in compiler.imports
            if (importNode.type isnt 'ImportDeclaration' and importNode.type isnt 'ModuleDeclaration') or
                importNode.source?.type isnt 'Literal' or importNode.source.value?
              throw new Error 'Internal error: Esprima import node has unexpected structure'

            # Mutate node
            if importNode.source.value.slice(0, 1) is '.'
              importNode.source.value = "#{path.join moduleName}..#{importNode.source.value}"

          cacheObject =
            output: wrapInEval compiler.toAMD(), modulePath
            imports: compiler.imports.map (importNode) ->
              return importNode.source.value

        newCache[statsHash] = cacheObject
        output.push cacheObject.output
        modulesAdded[moduleName] = true
      catch err
        err.file = modulePath
        throw err

      addModule importName for importName in cacheObject.imports

    addLegacyFile = (filePath) ->
      fileContents = fs.readFileSync path.join srcDir, filePath
      output.push wrapInEval fileContents.toString(), filePath

wrapInEval = (fileContents, fileName) ->
  # Should pull out copyright comment headers
  # Eventually we want source maps instead of sourceURL
  return "eval('#{jsStringEscape(fileContents)} //#sourceURL=#{jsStringEscape(fileName)}');\n";

exports = ES6ConcatenationCompiler
