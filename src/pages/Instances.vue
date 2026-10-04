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
              <v-btn
                v-if="isOwner(instance)"
                icon="mdi-delete-outline"
                size="small"
                variant="text"
                color="error"
                :title="t('instances.remove')"
                :disabled="deletingId === instanceKey(instance)"
                :loading="deletingId === instanceKey(instance)"
                class="mr-1"
                @click.prevent.stop="askRemove(instance)"
              />
              <v-icon>mdi-chevron-right</v-icon>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <v-alert type="info" variant="tonal" class="mt-4">
      {{ t('instances.info') }}
    </v-alert>

    <v-dialog v-model="removeDialog" max-width="520">
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon color="error">mdi-delete-alert-outline</v-icon>
          {{ t('instances.removeTitle') }}
        </v-card-title>
        <v-card-text>
          {{ t('instances.removeConfirm', { name: pendingInstance ? instanceName(pendingInstance) : '' }) }}
          <v-alert v-if="removeError" type="error" variant="tonal" density="compact" class="mt-4">
            {{ removeError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="Boolean(deletingId)" @click="closeRemoveDialog">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn color="error" variant="flat" :loading="Boolean(deletingId)" @click="removeInstance">
            {{ t('instances.remove') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </PageShell>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PageShell from '@/components/PageShell.vue'
import { instanceIsOwner, instanceKey, useAppStore } from '@/stores/app'
import { useI18n } from '@/i18n'

const store = useAppStore()
const { t, formatDateTime } = useI18n()
const removeDialog = ref(false)
const pendingInstance = ref<any | null>(null)
const deletingId = ref('')
const removeError = ref('')

function instanceName(instance: any) {
  return instance?.name ?? instance?.hostname ?? instance?.display_name ?? `${t('common.instance')} ${instanceKey(instance)}`
}

function online(instance: any) {
  return Boolean(instance?.online ?? instance?.connected ?? instance?.is_connected)
}

function isOwner(instance: any) {
  return instanceIsOwner(instance, store.me)
}

function instanceSubtitle(instance: any) {
  if (instance?.channel_display_name) return instance.channel_display_name
  if (instance?.channel_login) return `@${instance.channel_login}`
  if (instance?.last_seen) return t('instances.lastSeen', { date: formatDateTime(instance.last_seen) })
  return `ID ${instanceKey(instance)}`
}

function askRemove(instance: any) {
  if (!isOwner(instance)) return
  pendingInstance.value = instance
  removeError.value = ''
  removeDialog.value = true
}

function closeRemoveDialog() {
  if (deletingId.value) return
  removeDialog.value = false
  pendingInstance.value = null
  removeError.value = ''
}

async function removeInstance() {
  const instance = pendingInstance.value
  const id = instanceKey(instance)
  if (!id || !isOwner(instance)) return

  deletingId.value = id
  removeError.value = ''
  try {
    await store.deleteInstance(id)
    removeDialog.value = false
    pendingInstance.value = null
  } catch (error: any) {
    removeError.value = String(error?.message ?? t('instances.removeError'))
  } finally {
    deletingId.value = ''
  }
}
</script>
