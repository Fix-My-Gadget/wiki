const _ = require('lodash')

/* global WIKI */

module.exports = async () => {
  WIKI.logger.info('(MEMORY) Generating page memories...')
  try {
    WIKI.models = require('../core/db').init()
    await WIKI.configSvc.loadFromDb()
    await WIKI.configSvc.applyFlags()

    const memoryNS = _.get(WIKI.config, 'memory.namespace', 'Memory:')
    const pages = await WIKI.models.pages.query().select('id', 'path', 'title', 'content', 'localeCode', 'updatedAt').where('isPublished', true)

    for (const page of pages) {
      const memoryPath = `${memoryNS}${page.path}`
      const memoryPage = await WIKI.models.pages.query().select('id', 'updatedAt').where('path', memoryPath).where('localeCode', page.localeCode).first()
      if (!memoryPage || new Date(memoryPage.updatedAt) < new Date(page.updatedAt)) {
        const summaryPrompt = `Summarize the following content:\n\n${page.content}`
        let summary = ''
        try {
          summary = await WIKI.llm.generate(summaryPrompt)
        } catch (err) {
          WIKI.logger.warn('(MEMORY) Failed to generate summary', err)
          continue
        }
        let memoryId
        if (memoryPage) {
          await WIKI.models.pages.query().patch({ content: summary, title: `Memory: ${page.title}` }).where('id', memoryPage.id)
          memoryId = memoryPage.id
        } else {
          const inserted = await WIKI.models.pages.query().insert({
            path: memoryPath,
            localeCode: page.localeCode,
            title: `Memory: ${page.title}`,
            description: '',
            isPublished: true,
            content: summary,
            contentType: 'markdown'
          }).returning('id')
          memoryId = _.get(inserted, '[0].id', inserted.id)
        }
        const embedding = await WIKI.llm.embed(summary)
        await WIKI.memory.store({ pageId: page.id, memoryPageId: memoryId, embedding })
      }
    }
    await WIKI.models.knex.destroy()
  } catch (err) {
    WIKI.logger.error('(MEMORY) Job failed', err)
    throw err
  }
}
