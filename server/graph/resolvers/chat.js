/* global WIKI */

module.exports = {
  Query: {
    async chatAsk(obj, args, context) {
      if (!context.req.user || !WIKI.auth.checkAccess(context.req.user, ['read:pages'])) {
        throw new Error('Forbidden')
      }
      const answer = await WIKI.llm.generate(args.question)
      return { answer }
    }
  },
  Mutation: {
    async chatAsk(obj, args, context) {
      if (!context.req.user || !WIKI.auth.checkAccess(context.req.user, ['read:pages'])) {
        throw new Error('Forbidden')
      }
      const answer = await WIKI.llm.generate(args.question)
      return { answer }
    }
  }
}

