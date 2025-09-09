<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row, wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-process.svg', alt='LLM', style='width: 80px;')
          .admin-header-title
            .headline.primary--text.animated.fadeInLeft {{$t('admin:llm.title')}}
            .subtitle-1.grey--text.animated.fadeInLeft.wait-p2s {{$t('admin:llm.subtitle')}}
          v-spacer
          v-btn.animated.fadeInDown.wait-p2s(icon, outlined, color='grey', @click='refresh')
            v-icon mdi-refresh
          v-btn.animated.fadeInDown(color='success', @click='save', depressed, large)
            v-icon(left) mdi-check
            span {{$t('common:actions.apply')}}

      v-flex(lg3, xs12)
        v-card.animated.fadeInUp
          v-toolbar(flat, color='primary', dark, dense)
            .subtitle-1 {{$t('admin:llm.providers')}}
          v-list.py-0(two-line, dense)
            template(v-for='(prov, idx) in providers')
              v-list-item(:key='prov.key', @click='selectedProvider = prov.key', :disabled='!prov.isAvailable')
                v-list-item-avatar(size='24')
                  v-icon(color='grey', v-if='!prov.isAvailable') mdi-minus-box-outline
                  v-icon(color='primary', v-else-if='prov.key === selectedProvider') mdi-checkbox-marked-circle-outline
                  v-icon(color='grey', v-else) mdi-checkbox-blank-circle-outline
                v-list-item-content
                  v-list-item-title.body-2(:class='!prov.isAvailable ? `grey--text` : (selectedProvider === prov.key ? `primary--text` : ``)') {{ prov.title }}
                  v-list-item-subtitle: .caption(:class='!prov.isAvailable ? `grey--text text--lighten-1` : (selectedProvider === prov.key ? `blue--text ` : ``)') {{ prov.description }}
                v-list-item-avatar(v-if='selectedProvider === prov.key', size='24')
                  v-icon.animated.fadeInLeft(color='primary', large) mdi-chevron-right
              v-divider(v-if='idx < providers.length - 1')

      v-flex(lg9, xs12)
        v-card.animated.fadeInUp.wait-p2s
          v-toolbar(color='primary', dense, flat, dark)
            .subtitle-1 {{provider.title}}
          v-card-info(color='blue')
            div
              div {{provider.description}}
              span.caption: a(:href='provider.website') {{provider.website}}
            v-spacer
            .admin-providerlogo
              img(:src='provider.logo', :alt='provider.title')
          v-card-text
            v-text-field(
              outlined,
              :label="$t('admin:llm.vectorStore')",
              v-model='vectorStore',
              prepend-icon='mdi-database',
              required
            )
            .overline.mb-5 {{$t('admin:llm.providerConfig')}}
            .body-2.ml-3(v-if='!provider.config || provider.config.length < 1'): em {{$t('admin:llm.providerNoConfig')}}
            template(v-else, v-for='cfg in provider.config')
              v-select(
                v-if='cfg.value.type === "string" && cfg.value.enum'
                outlined
                :items='cfg.value.enum'
                :key='cfg.key'
                :label='cfg.value.title'
                v-model='cfg.value.value'
                prepend-icon='mdi-cog-box'
                :hint='cfg.value.hint ? cfg.value.hint : ""'
                persistent-hint
                :class='cfg.value.hint ? "mb-2" : ""'
              )
              v-switch.mb-3(
                v-else-if='cfg.value.type === "boolean"'
                :key='cfg.key'
                :label='cfg.value.title'
                v-model='cfg.value.value'
                color='primary'
                prepend-icon='mdi-cog-box'
                :hint='cfg.value.hint ? cfg.value.hint : ""'
                persistent-hint
                inset
                )
              v-textarea(
                v-else-if='cfg.value.type === "string" && cfg.value.multiline'
                outlined
                auto-grow
                :key='cfg.key'
                :label='cfg.value.title'
                v-model='cfg.value.value'
                prepend-icon='mdi-cog-box'
                :hint='cfg.value.hint ? cfg.value.hint : ""'
                persistent-hint
                :class='cfg.value.hint ? "mb-2" : ""'
              )
              v-text-field(
                v-else
                outlined
                :key='cfg.key'
                :label='cfg.value.title'
                v-model='cfg.value.value'
                prepend-icon='mdi-cog-box'
                :hint='cfg.value.hint ? cfg.value.hint : ""'
                persistent-hint
                :class='cfg.value.hint ? "mb-2" : ""'
              )

</template>

<script>
import _ from 'lodash'
import providersQuery from 'gql/admin/llm/llm-query-providers.gql'
import saveProviderMutation from 'gql/admin/llm/llm-mutation-save-provider.gql'

export default {
  i18nOptions: { namespaces: 'admin' },
  data () {
    return {
      providers: [],
      selectedProvider: '',
      vectorStore: ''
    }
  },
  computed: {
    provider () { return _.find(this.providers, ['key', this.selectedProvider]) || {} }
  },
  methods: {
    refresh () {
      this.$apollo.queries.providers.refetch()
    },
    async save () {
      this.$store.commit(`loadingStart`, 'admin-llm-save')
      try {
        const resp = await this.$apollo.mutate({
          mutation: saveProviderMutation,
          variables: {
            provider: {
              key: this.selectedProvider,
              config: this.provider.config.map(cfg => ({ ...cfg, value: JSON.stringify({ v: cfg.value.value }) }))
            },
            vectorStore: this.vectorStore
          }
        })
        if (_.get(resp, 'data.llm.updateProvider.responseResult.succeeded', false)) {
          this.$store.commit('showNotification', {
            message: this.$t('admin:llm.configSaveSuccess'),
            style: 'success',
            icon: 'check'
          })
        } else {
          throw new Error(_.get(resp, 'data.llm.updateProvider.responseResult.message', this.$t('common:error.unexpected')))
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
      this.$store.commit(`loadingStop`, 'admin-llm-save')
    }
  },
  apollo: {
    providers: {
      query: providersQuery,
      fetchPolicy: 'network-only',
      update (data) {
        this.vectorStore = _.get(data, 'llm.vectorStore', '')
        return _.cloneDeep(data.llm.providers).map(prov => ({
          ...prov,
          config: _.sortBy(prov.config.map(cfg => ({ ...cfg, value: JSON.parse(cfg.value) })), [t => t.value.order])
        }))
      },
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-llm-refresh')
      }
    }
  }
}
</script>

<style lang='scss' scoped>
.admin-providerlogo {
  width: 250px;
  height: 85px;
  float: right;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  img {
    max-width: 100%;
    max-height: 50px;
  }
}
</style>

