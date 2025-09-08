const _ = require('lodash')

/* global WIKI */

module.exports = {
  engine: null,
  init() {
    const provider = _.get(WIKI.config, 'llm.provider', null)
    if (!provider) {
      WIKI.logger.warn('No LLM provider configured.')
      return this
    }
    try {
      this.engine = require(`../modules/llm/${provider}/engine`)
      this.engine.config = _.get(WIKI.config.llm, provider, {})
      if (_.isFunction(this.engine.init)) {
        this.engine.init()
      }
    } catch (err) {
      WIKI.logger.error('Failed to initialize LLM provider:', err.message)
    }
    return this
  },
  async generate(prompt, contextDocs = [], options = {}) {
    if (!this.engine || !_.isFunction(this.engine.generate)) {
      throw new Error('LLM provider not initialized')
    }
    return this.engine.generate(prompt, contextDocs, options)
  }
}
