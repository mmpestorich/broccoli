class Pipeline

  process: (context, filters) ->
    for filter in filters
      filter.process(context)

module.exports = Pipeline
