/* global WIKI */

module.exports = {
  Query: {
    async chatAsk(obj, args, context) {
      if (!context.req.user || !WIKI.auth.checkAccess(context.req.user, ['read:pages'])) {
        throw new Error('Forbidden')
      }
      const raw = await WIKI.llm.generate(args.question, [], { draft: args.draft })
      let response = { answer: raw }
      if (args.draft) {
        try {
          const data = JSON.parse(raw)
          response = {
            answer: data.answer || '',
            pageDraft: {
              title: data.title || '',
              content: data.content || ''
            }
          }
        } catch (err) {
          response = { answer: raw }
        }
      }
      return response
    }
  },
  Mutation: {
    async chatAsk(obj, args, context) {
      if (!context.req.user || !WIKI.auth.checkAccess(context.req.user, ['read:pages'])) {
        throw new Error('Forbidden')
      }
      const raw = await WIKI.llm.generate(args.question, [], { draft: args.draft })
      let response = { answer: raw }
      if (args.draft) {
        try {
          const data = JSON.parse(raw)
          response = {
            answer: data.answer || '',
            pageDraft: {
              title: data.title || '',
              content: data.content || ''
            }
          }
        } catch (err) {
          response = { answer: raw }
        }
      }
      return response
    }
  }
}

