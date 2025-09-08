const https = require('https')
const _ = require('lodash')

/* global WIKI */

module.exports = {
  async activate() {
    // not used
  },
  async deactivate() {
    // not used
  },
  async init() {
    WIKI.logger.info('(LLM/OPENAI) Initialization...')
  },
  async generate(prompt, contextDocs = [], options = {}) {
    const model = _.get(this.config, 'model', 'gpt-3.5-turbo')
    const apiKey = this.config.apiKey
    if (!apiKey) {
      throw new Error('Missing OpenAI API Key')
    }
    const messages = []
    if (options.system) {
      messages.push({ role: 'system', content: options.system })
    }
    const context = contextDocs.length > 0 ? `\n\nContext:\n${contextDocs.join('\n')}` : ''
    messages.push({ role: 'user', content: `${prompt}${context}` })
    const postData = JSON.stringify({ model, messages })
    const requestOptions = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    }
    const response = await new Promise((resolve, reject) => {
      const req = https.request(requestOptions, res => {
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            if (res.statusCode < 200 || res.statusCode >= 300 || json.error) {
              const errMsg = _.get(json, 'error.message', `OpenAI request failed with status ${res.statusCode}`)
              reject(new Error(errMsg))
              return
            }
            resolve(_.get(json, 'choices[0].message.content', ''))
          } catch (err) {
            reject(err)
          }
        })
      })
      req.on('error', reject)
      req.write(postData)
      req.end()
    })
    return response
  }
}
