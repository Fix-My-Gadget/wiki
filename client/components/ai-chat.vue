<template lang='pug'>
  v-dialog(v-model='model', max-width='600')
    v-card
      v-card-title AI Chat
      v-card-text
        .messages
          div(v-for='(msg, idx) in messages', :key='idx', class='mb-2')
            div.font-weight-bold {{ msg.role === 'user' ? 'You' : 'AI' }}
            div {{ msg.content }}
      v-divider
      v-card-actions
        v-text-field(
          v-model='question'
          placeholder='Ask a question'
          hide-details
          clearable
          @keyup.enter='ask'
        )
        v-btn(color='primary', @click='ask', :disabled='!question') Send
</template>

<script>
import chatAsk from '../graph/chat/chat-query-ask.gql'

export default {
  name: 'AiChat',
  props: {
    value: Boolean
  },
  data () {
    return {
      question: '',
      messages: []
    }
  },
  computed: {
    model: {
      get () {
        return this.value
      },
      set (val) {
        this.$emit('input', val)
      }
    }
  },
  methods: {
    async ask () {
      const question = this.question.trim()
      if (!question) { return }
      this.messages.push({ role: 'user', content: question })
      this.question = ''
      try {
        const resp = await this.$apollo.query({
          query: chatAsk,
          variables: { question }
        })
        this.messages.push({ role: 'ai', content: resp.data.chatAsk.answer })
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
    }
  }
}
</script>

<style scoped>
.messages {
  max-height: 300px;
  overflow-y: auto;
}
</style>
