const fs = require('fs-extra')
const path = require('path')
const _ = require('lodash')
const yaml = require('js-yaml')
const commonHelper = require('../../helpers/common')
const graphHelper = require('../../helpers/graph')

/* global WIKI */

module.exports = {
  Query: {
    async llm () { return {} }
  },
  Mutation: {
    async llm () { return {} }
  },
  LLMQuery: {
    async providers (obj, args) {
      const providersDir = path.join(WIKI.SERVERPATH, 'modules/llm')
      const dirs = await fs.readdir(providersDir)
      const currentProvider = _.get(WIKI.config, 'llm.provider', '')
      let providers = []
      for (const dir of dirs) {
        const def = yaml.safeLoad(await fs.readFile(path.join(providersDir, dir, 'definition.yml'), 'utf8'))
        const props = commonHelper.parseModuleProps(def.props)
        const currentCfg = _.get(WIKI.config, ['llm', def.key], {})
        const config = _.map(
          _.sortBy(_.toPairs(props), ([, val]) => val.order),
          ([key, cfg]) => ({
            key,
            value: JSON.stringify({ ...cfg, value: _.get(currentCfg, key, cfg.default) })
          })
        )
        providers.push({
          ...def,
          isEnabled: currentProvider === def.key,
          isAvailable: _.get(def, 'isAvailable', true),
          config
        })
      }
      if (args.orderBy) { providers = _.sortBy(providers, [args.orderBy]) }
      return providers
    },
    async vectorStore () {
      return _.get(WIKI.config, 'llm.vectorStore', '')
    },
    async neo4jConfig () {
      const cfg = _.get(WIKI.config, 'llm.neo4j', {})
      return { url: _.get(cfg, 'url', ''), username: _.get(cfg, 'username', '') }
    }
  },
  LLMMutation: {
    async updateProvider (obj, args) {
      try {
        const cfg = _.reduce(args.provider.config, (res, val) => {
          _.set(res, val.key, _.get(JSON.parse(val.value), 'v', null))
          return res
        }, {})
        _.set(WIKI.config, 'llm.provider', args.provider.key)
        _.set(WIKI.config, ['llm', args.provider.key], cfg)
        _.set(WIKI.config, 'llm.vectorStore', args.vectorStore)
        if (args.neo4jConfig) {
          _.set(WIKI.config, 'llm.neo4j', {
            url: args.neo4jConfig.url,
            username: args.neo4jConfig.username,
            password: args.neo4jConfig.password
          })
        }
        await WIKI.configSvc.saveToDb(['llm'])
        if (WIKI.llm) { WIKI.llm.init() }
        const store = _.get(WIKI.config, 'llm.vectorStore', '')
        if (store === 'neo4j') {
          delete require.cache[require.resolve('../../modules/memory/neo4j')]
          WIKI.memory = require('../../modules/memory/neo4j')
        } else if (store === 'pgvector') {
          delete require.cache[require.resolve('../../modules/memory/vector')]
          WIKI.memory = require('../../modules/memory/vector')
        } else {
          WIKI.memory = null
        }
        if (WIKI.memory && _.isFunction(WIKI.memory.init)) { WIKI.memory.init() }
        return {
          responseResult: graphHelper.generateSuccess('LLM configuration updated successfully')
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    }
  }
}

