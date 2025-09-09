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
    await this.setupSchema()
    await this.syncAuthGraph()
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
  },
  async setupSchema () {
    if (!driver) { return }
    const session = driver.session()
    try {
      await session.run('CREATE CONSTRAINT IF NOT EXISTS ON (p:Page) ASSERT p.id IS UNIQUE')
      await session.run('CREATE CONSTRAINT IF NOT EXISTS ON (u:User) ASSERT u.id IS UNIQUE')
      await session.run('CREATE CONSTRAINT IF NOT EXISTS ON (g:Group) ASSERT g.id IS UNIQUE')
      await session.run('CREATE CONSTRAINT IF NOT EXISTS ON (perm:Permission) ASSERT perm.name IS UNIQUE')
    } catch (err) {
      WIKI.logger.warn('(MEMORY) Failed to ensure schema', err)
    } finally {
      await session.close()
    }
  },
  async syncAuthGraph () {
    if (!driver || !WIKI.models || !WIKI.models.users) { return }
    const session = driver.session()
    try {
      const users = await WIKI.models.users.query().withGraphFetched('groups')
      for (const user of users) {
        await session.run('MERGE (u:User {id: $id}) SET u.name = $name', { id: user.id, name: user.name })
        for (const group of user.groups) {
          await session.run('MERGE (g:Group {id: $gid}) SET g.name = $gname', { gid: group.id, gname: group.name })
          await session.run('MATCH (u:User {id: $uid}), (g:Group {id: $gid}) MERGE (u)-[:MEMBER_OF]->(g)', { uid: user.id, gid: group.id })
          const perms = _.get(group, 'permissions', [])
          for (const perm of perms) {
            await session.run('MERGE (p:Permission {name: $perm})', { perm })
            await session.run('MATCH (g:Group {id: $gid}), (p:Permission {name: $perm}) MERGE (g)-[:GRANTS]->(p)', { gid: group.id, perm })
          }
        }
      }
    } catch (err) {
      WIKI.logger.warn('(MEMORY) Failed to sync auth graph', err)
    } finally {
      await session.close()
    }
  }
}
