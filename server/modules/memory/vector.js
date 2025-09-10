/* global WIKI */
const _ = require('lodash')

module.exports = {
  async init() {
    if (_.get(WIKI, 'config.db.type') !== 'postgres') {
      WIKI.logger.info('(MEMORY) Vector store disabled: PostgreSQL required')
      return
    }
    const knex = WIKI.models.knex
    try {
      const exists = await knex.schema.hasTable('pageMemories')
      if (!exists) {
        await knex.schema.createTable('pageMemories', table => {
          table.increments('id')
          table.integer('pageId').notNullable().unique()
          table.integer('memoryPageId').notNullable()
          table.specificType('embedding', 'vector(1536)')
        })
      }
    } catch (err) {
      WIKI.logger.warn('(MEMORY) Failed to ensure table', err)
    }
  },
  async store({ pageId, memoryPageId, embedding }) {
    if (!embedding || embedding.length === 0) { return }
    const knex = WIKI.models.knex
    try {
      await knex('pageMemories').insert({ pageId, memoryPageId, embedding }).onConflict('pageId').merge()
    } catch (err) {
      WIKI.logger.warn('(MEMORY) Failed to store embedding', err)
    }
  },
  async search(embedding, opts = {}) {
    if (!embedding || embedding.length === 0) { return [] }
    const knex = WIKI.models.knex
    try {
      const limit = _.get(opts, 'limit', 5)
      const results = await knex('pageMemories')
        .select('pageId', 'memoryPageId')
        .select(knex.raw('embedding <-> ? as distance', [embedding]))
        .orderBy('distance', 'asc')
        .limit(limit)
      return results
    } catch (err) {
      WIKI.logger.warn('(MEMORY) Search failed', err)
      return []
    }
  }
}
