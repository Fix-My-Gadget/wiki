const http = require('http')
const https = require('https')
const { URL } = require('url')
const _ = require('lodash')

/* global WIKI */

module.exports = {
  async activate() {},
  async deactivate() {},
  async init() {
    WIKI.logger.info('(LLM/OLLAMA) Initialization...')
  },
  async generate(prompt, contextDocs = [], options = {}) {
    const host = _.get(this.config, 'host', 'http://localhost:11434')
    const model = _.get(this.config, 'model', 'llama2')
    const url = new URL('/api/generate', host)
    const body = JSON.stringify({
      model,
      prompt: `${prompt}${contextDocs.length ? `\n\nContext:\n${contextDocs.join('\n')}` : ''}`,
      stream: false
    })
    const lib = url.protocol === 'https:' ? https : http
    const response = await new Promise((resolve, reject) => {
      const req = lib.request({
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, res => {
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            resolve(_.get(json, 'response', ''))
          } catch (err) {
            reject(err)
          }
        })
      })
      req.on('error', reject)
      req.write(body)
      req.end()
    })
    return response
  }
}
