/* global WIKI */
const _ = require('lodash')

module.exports = {
  Query: {
    async chatAsk(obj, args, context) {
      return chatAskResolver(obj, args, context)
    }
  },
  Mutation: {
    async chatAsk(obj, args, context) {
      return chatAskResolver(obj, args, context)
    }
  }
}

async function chatAskResolver(obj, args, context) {
  if (!context.req.user || !WIKI.auth.checkAccess(context.req.user, ['read:pages'])) {
    throw new Error('Forbidden')
  }

  let contextDocs = []
  if (WIKI.memory && _.isFunction(WIKI.llm.embed)) {
    try {
      const qEmbedding = await WIKI.llm.embed(args.question)
      const memories = await WIKI.memory.search(qEmbedding, { limit: 5 })
      for (const mem of memories) {
        try {
          const page = await WIKI.models.pages.getPageFromDb(mem.pageId)
          if (page && WIKI.auth.checkAccess(context.req.user, ['read:pages'], { path: page.path, locale: page.localeCode, tags: page.tags })) {
            const memoryPage = await WIKI.models.pages.getPageFromDb(mem.memoryPageId)
            if (memoryPage && memoryPage.content) {
              contextDocs.push(memoryPage.content)
            }
          }
        } catch (err) {
          WIKI.logger.warn('(CHAT) Failed to fetch memory page', err)
        }
      }
    } catch (err) {
      WIKI.logger.warn('(CHAT) Memory search failed', err)
    }
  } else if (WIKI.data.searchEngine) {
    try {
      const resp = await WIKI.data.searchEngine.query(args.question, {})
      const permitted = resp.results.filter(r => {
        return WIKI.auth.checkAccess(context.req.user, ['read:pages'], {
          path: r.path,
          locale: r.locale,
          tags: r.tags
        })
      })

      for (const res of permitted.slice(0, 5)) {
        try {
          const page = await WIKI.models.pages.getPage({ path: res.path, locale: res.locale })
          if (page && page.render) {
            contextDocs.push(WIKI.models.pages.cleanHTML(page.render))
          }
        } catch (err) {
          WIKI.logger.warn('(CHAT) Failed to fetch page for context', err)
        }
      }
    } catch (err) {
      WIKI.logger.warn('(CHAT) Search failed', err)
    }
  }

  const llmResp = await WIKI.llm.generate(args.question, contextDocs, { pageDraft: args.pageDraft })
  if (_.isString(llmResp)) {
    return { answer: llmResp }
  }
  return {
    answer: _.get(llmResp, 'answer', ''),
    draft: _.get(llmResp, 'draft', null)
  }
}

