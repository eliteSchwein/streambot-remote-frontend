<template>
  <PageShell :title="t('dashboard.title')" :subtitle="t('dashboard.subtitle')">
    <v-row>
      <v-col cols="12" md="6" lg="4">
        <StatusCard icon="mdi-account-outline" :title="t('dashboard.account')" :value="accountName" :status="t('dashboard.twitchLogin')" :ok="true" />
      </v-col>
      <v-col cols="12" md="6" lg="4">
        <StatusCard icon="mdi-server-network" :title="t('dashboard.instances')" :value="String(store.instances.length)" :status="instanceStatus" :ok="onlineCount > 0" />
      </v-col>
    </v-row>

    <v-card rounded="lg" class="mt-2">
      <v-card-title class="d-flex align-center ga-2">
        <v-icon>mdi-server-network</v-icon>
        {{ t('dashboard.remoteInstances') }}
        <v-spacer />
      </v-card-title>
      <v-card-text>
        <div v-if="store.instances.length === 0" class="empty-state py-8">{{ t('dashboard.empty') }}</div>
        <v-list v-else lines="two" bg-color="transparent">
          <v-list-item
            v-for="instance in store.instances"
            :key="instanceKey(instance)"
            :to="`/instances/${encodeURIComponent(instanceKey(instance))}`"
            :title="instanceName(instance)"
            :subtitle="instanceSubtitle(instance)"
          >
            <template #prepend>
              <v-icon :color="instanceOnline(instance) ? 'success' : undefined">{{ instanceOnline(instance) ? 'mdi-lan-connect' : 'mdi-lan-disconnect' }}</v-icon>
            </template>
            <template #append>
              <v-chip size="small" :color="instanceOnline(instance) ? 'success' : undefined" variant="tonal">{{ instanceOnline(instance) ? t('common.online') : t('common.offline') }}</v-chip>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </PageShell>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PageShell from '@/components/PageShell.vue'
import StatusCard from '@/components/StatusCard.vue'
import { instanceKey, useAppStore } from '@/stores/app'
import { useI18n } from '@/i18n'

const store = useAppStore()
const { t, formatDateTime } = useI18n()
const accountName = computed(() => store.me?.display_name ?? store.me?.login ?? store.me?.username ?? t('common.signedIn'))
const onlineCount = computed(() => store.instances.filter(instanceOnline).length)
const instanceStatus = computed(() => store.instances.length ? t('dashboard.onlineCount', { count: onlineCount.value }) : t('dashboard.noAccess'))

function instanceName(instance: any) { return instance?.name ?? instance?.hostname ?? instance?.display_name ?? `${t('common.instance')} ${instanceKey(instance)}` }
function instanceOnline(instance: any) { return Boolean(instance?.online ?? instance?.connected ?? instance?.is_connected) }
function instanceSubtitle(instance: any) {
  if (instance?.channel_display_name) return instance.channel_display_name
  if (instance?.channel_login) return `@${instance.channel_login}`
  if (instance?.last_seen) return t('dashboard.lastSeen', { date: formatDateTime(instance.last_seen) })
  return t('dashboard.remoteInstance')
}

</script>
