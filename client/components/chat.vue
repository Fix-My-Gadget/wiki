<template lang="pug">
  v-container
    v-text-field(v-model='question', label='Ask a question')
    v-btn.mt-2(color='primary', @click='ask') Ask
    div(v-if='answer')
      .mt-4 {{ answer }}
    div(v-if='draft')
      v-divider.my-4
      h3 {{ draft.title }}
      pre {{ draft.content }}
      v-btn.mt-2(color='green', @click='createPage') Create Page from Draft
</template>

<script>
import chatAsk from 'gql/chat/chat-ask.gql'
import { Base64 } from 'js-base64'

export default {
  data() {
    return {
      question: '',
      answer: '',
      draft: null
    }
  },
  methods: {
    async ask() {
      const resp = await this.$apollo.query({
        query: chatAsk,
        variables: { question: this.question, draft: true },
        fetchPolicy: 'no-cache'
      })
      this.answer = resp.data.chatAsk.answer
      this.draft = resp.data.chatAsk.pageDraft
    },
    createPage() {
      if (!this.draft) return
      const slug = this.draft.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const content = Base64.encode(this.draft.content)
      const title = encodeURIComponent(this.draft.title)
      const url = `/e/en/${slug}?draftTitle=${title}&draftContent=${encodeURIComponent(content)}`
      window.location.assign(url)
    }
  }
}
</script>
