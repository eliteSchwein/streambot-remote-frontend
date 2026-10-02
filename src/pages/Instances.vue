<template>
  <PageShell :title="t('instances.title')" :subtitle="t('instances.subtitle')">
    <v-card rounded="lg">
      <v-card-title class="d-flex align-center ga-2">
        <v-icon>mdi-server-network</v-icon>
        {{ t('instances.available') }}
        <v-spacer />
      </v-card-title>
      <v-card-text>
        <div v-if="store.instances.length === 0" class="empty-state py-10">
          {{ t('instances.empty') }}
        </div>
        <v-list v-else lines="two" bg-color="transparent">
          <v-list-item
            v-for="instance in store.instances"
            :key="instanceKey(instance)"
            :to="`/instances/${encodeURIComponent(instanceKey(instance))}`"
            :title="instanceName(instance)"
            :subtitle="instanceSubtitle(instance)"
          >
            <template #prepend>
              <v-avatar :color="online(instance) ? 'success' : undefined" variant="tonal">
                <v-icon>{{ online(instance) ? 'mdi-lan-connect' : 'mdi-lan-disconnect' }}</v-icon>
              </v-avatar>
            </template>
            <template #append>
              <v-chip size="small" :color="online(instance) ? 'success' : undefined" variant="tonal" class="mr-2">
                {{ online(instance) ? t('common.online') : t('common.offline') }}
              </v-chip>
              <v-icon>mdi-chevron-right</v-icon>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <v-alert type="info" variant="tonal" class="mt-4">
      {{ t('instances.info') }}
    </v-alert>
  </PageShell>
</template>

<script setup lang="ts">

import PageShell from '@/components/PageShell.vue'
import { instanceKey, useAppStore } from '@/stores/app'
import { useI18n } from '@/i18n'

const store = useAppStore()
const { t, formatDateTime } = useI18n()
function instanceName(instance: any) {
  return instance?.name ?? instance?.hostname ?? instance?.display_name ?? `${t('common.instance')} ${instanceKey(instance)}`
}

function online(instance: any) {
  return Boolean(instance?.online ?? instance?.connected ?? instance?.is_connected)
}

function instanceSubtitle(instance: any) {
  if (instance?.channel_display_name) return instance.channel_display_name
  if (instance?.channel_login) return `@${instance.channel_login}`
  if (instance?.last_seen) return t('instances.lastSeen', { date: formatDateTime(instance.last_seen) })
  return `ID ${instanceKey(instance)}`
}

</script>
