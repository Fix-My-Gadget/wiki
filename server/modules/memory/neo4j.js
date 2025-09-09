/* global WIKI */
const _ = require('lodash')
let driver = null

module.exports = {
  async init () {
    let neo4j
    try {
      neo4j = require('neo4j-driver')
    } catch (err) {
      WIKI.logger.warn('(MEMORY) Neo4j driver not available')
      return
    }
    const url = _.get(WIKI.config, 'llm.neo4j.url', '')
    const username = _.get(WIKI.config, 'llm.neo4j.username', '')
    const password = _.get(WIKI.config, 'llm.neo4j.password', '')
    if (!url) {
      WIKI.logger.info('(MEMORY) Neo4j vector store disabled: missing connection URL')
      return
    }
    driver = neo4j.driver(url, neo4j.auth.basic(username, password))
  },
  async store ({ pageId, memoryPageId, embedding }) {
    if (!driver || !embedding || embedding.length === 0) { return }
    const session = driver.session()
    try {
      await session.run(
        'MERGE (p:Page {id: $pageId}) SET p.embedding = $embedding, p.memoryPageId = $memoryPageId',
        { pageId, memoryPageId, embedding }
      )
    } catch (err) {
      WIKI.logger.warn('(MEMORY) Failed to store embedding', err)
    } finally {
      await session.close()
    }
  },
  async search (embedding, opts = {}) {
    if (!driver || !embedding || embedding.length === 0) { return [] }
    const session = driver.session()
    const limit = _.get(opts, 'limit', 5)
    try {
      const res = await session.run(
        'MATCH (p:Page) WHERE p.embedding IS NOT NULL WITH p, gds.similarity.cosine(p.embedding, $embedding) AS score RETURN p.id AS pageId, p.memoryPageId AS memoryPageId ORDER BY score DESC LIMIT $limit',
        { embedding, limit }
      )
      return res.records.map(r => ({ pageId: r.get('pageId'), memoryPageId: r.get('memoryPageId') }))
    } catch (err) {
      WIKI.logger.warn('(MEMORY) Search failed', err)
      return []
    } finally {
      await session.close()
    }
  }
}
