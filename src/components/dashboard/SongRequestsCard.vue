<template>
  <div class="song-requests-card">
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <v-chip
        size="small"
        variant="tonal"
        :color="state.enabled ? 'success' : undefined"
        :prepend-icon="state.enabled ? 'mdi-check-circle-outline' : 'mdi-pause-circle-outline'"
      >
        {{ state.enabled ? t('instance.songRequestsEnabled') : t('instance.songRequestsDisabled') }}
      </v-chip>
      <v-chip size="small" variant="tonal" prepend-icon="mdi-format-list-numbered">
        {{ t('instance.songRequestCount', { count: total }) }}
      </v-chip>
      <v-chip v-if="state.busy" size="small" variant="tonal" prepend-icon="mdi-progress-clock">
        {{ t('instance.songRequestsBusy') }}
      </v-chip>
    </div>

    <div v-if="items.length" class="d-flex flex-column ga-2">
      <v-card
        v-for="(item, index) in items"
        :key="itemKey(item, index)"
        variant="tonal"
        rounded="lg"
      >
        <v-card-text class="d-flex align-center ga-3 py-3">
          <v-icon :icon="item.current ? 'mdi-play-circle' : 'mdi-music-note'" :color="item.current ? 'primary' : undefined" />
          <div class="min-w-0 flex-grow-1">
            <div class="d-flex align-center ga-2 min-w-0">
              <span class="font-weight-medium text-truncate">{{ itemTitle(item) }}</span>
              <v-chip v-if="item.current" size="x-small" color="primary" variant="tonal">
                {{ t('instance.songRequestCurrent') }}
              </v-chip>
            </div>
            <div class="text-caption text-medium-emphasis text-truncate">
              <span v-if="item.username">{{ item.username }}</span>
              <span v-if="item.username && item.requested_at"> · </span>
              <span v-if="item.requested_at">{{ formatDate(item.requested_at) }}</span>
            </div>
          </div>
          <v-btn
            icon="mdi-delete-outline"
            size="small"
            variant="text"
            :title="t('instance.songRequestRemove')"
            :disabled="removing === itemKey(item, index)"
            :loading="removing === itemKey(item, index)"
            @click="removeItem(item, index)"
          />
        </v-card-text>
      </v-card>
    </div>

    <div v-else class="text-center text-medium-emphasis py-6">
      <v-icon icon="mdi-playlist-remove" size="36" class="mb-2" />
      <div>{{ t('instance.noSongRequests') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '@/i18n'

const props = defineProps<{ state:any }>()
const emit = defineEmits<{ remove:[params:Record<string,any>] }>()
const { t } = useI18n()
const removing = ref('')

const items = computed<any[]>(() => Array.isArray(props.state?.items) ? props.state.items : [])
const total = computed(() => Number.isFinite(Number(props.state?.total)) ? Number(props.state.total) : items.value.length)

watch(items, () => { removing.value = '' })

function itemKey(item:any, index:number) {
  return String(item?.id ?? item?.url ?? item?.index ?? index)
}

function itemTitle(item:any) {
  return String(item?.title ?? item?.filename ?? item?.url ?? t('instance.songRequestUnknown'))
}

function formatDate(value:any) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value ?? '') : date.toLocaleString()
}

function removeItem(item:any, index:number) {
  const params:Record<string,any> = {}
  if (item?.id !== undefined && item?.id !== null && String(item.id).trim()) params.id = item.id
  else if (item?.url) params.url = item.url
  else if (item?.index !== undefined && item?.index !== null) params.index = item.index
  else params.index = index

  removing.value = itemKey(item, index)
  emit('remove', params)
  window.setTimeout(() => {
    if (removing.value === itemKey(item, index)) removing.value = ''
  }, 5000)
}
</script>
