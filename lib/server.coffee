path = require 'path'
hapi = require 'hapi'
synchronized = require 'synchronized'

Filter = require './Filter'
Pipeline = require './Pipeline'

serve = (project, addr, port) ->
#  statsHash = null;
#
#  checkForUpdates = () ->
#    newStatsHash = builder.reader.statsHash()
#    if newStatsHash isnt statsHash
#      statsHash = newStatsHash
#      builder.build()
#
#    setTimeout(checkForUpdates, 100)
#
#  checkForUpdates()

#  class TestFilter1 extends Filter
#    process: (context) ->
#      context.value += 'TestFilter1 '
#
#  class TestFilter2 extends Filter
#    process: (context) ->
#      context.value += 'TestFilter2 '

  Pipeline::process project, project.preprocessors

  console.log "Serving on http://#{addr}:#{port}/\n"

  server = hapi.createServer addr, port,
    views:
      engines:
        html: 'handlebars'
      path: path.join(__dirname, '../templates')

  server.route
    method: 'GET'
    path: '/{path*}'
    handler:
      directory:
        path: () ->
          throw new Error 'Expected builder.outputTmpDir to be set' if !builder.outputTmpDir
          throw new Error 'Did not expect builder.buildError to be set' if builder.buildError
          return builder.outputTmpDir

  server.ext 'onRequest', (request, next) ->
    # `synchronized` delays serving until we've finished building
    synchronized builder, (done) ->
      if builder.buildError
        context =
          message: builder.buildError.message
          file: builder.buildError.file
          line: builder.buildError.line
          column: builder.buildError.column
          stack: builder.buildError.stack

        # Cannot use request.generateView - https://github.com/spumko/hapi/issues/1137
        view = new hapi.response.View request.server._views, 'error', context

        next view.code 500
      else # Good to go
        next()

      done() # Release lock immediately

  # We register these so the 'exit' handler removing our tmpDir is called
  process.on 'SIGINT',  () -> process.exit 1
  process.on 'SIGTERM', () -> process.exit 1

  server.start()

exports.serve = serve;
