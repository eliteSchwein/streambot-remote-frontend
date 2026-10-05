<template>
  <div class="obs-audio-control">
    <v-select
      v-if="editLayout"
      class="mb-4"
      :model-value="connection"
      :items="connectionOptions"
      :label="t('instance.obsConnection')"
      prepend-inner-icon="mdi-connection"
      variant="outlined"
      density="comfortable"
      hide-details
      @update:model-value="(value) => emit('update:connection', String(value ?? ''))"
    />

    <div v-if="audioItems.length" class="audio-list">
      <div v-for="input in audioItems" :key="input.uuid" class="obs-audio-row">
        <div class="d-flex align-center ga-2 mb-2">
          <div class="text-truncate font-weight-medium flex-grow-1">{{ input.name }}</div>
          <span class="text-caption text-medium-emphasis">{{ Math.round(inputVolume(input)) }} dB</span>
          <v-btn
            :icon="inputMuted(input) ? 'mdi-volume-off' : 'mdi-volume-high'"
            size="small"
            variant="text"
            :color="inputMuted(input) ? 'error' : undefined"
            @click="toggleMute(input)"
          />
        </div>
        <v-slider
          :model-value="inputVolume(input)"
          min="-100"
          max="0"
          step="1"
          hide-details
          thumb-label
          @end="(v:any) => setVolume(input, Number(v))"
        />
        <div v-if="input.balance !== null" class="d-flex align-center ga-3 mt-2">
          <v-icon size="small">mdi-pan-horizontal</v-icon>
          <v-slider
            :model-value="inputBalance(input)"
            min="0"
            max="1"
            step="0.01"
            hide-details
            @end="(v:any) => setBalance(input, Number(v))"
          />
        </div>
      </div>
    </div>
    <div v-else class="text-medium-emphasis">{{ t('instance.noObsAudioInputs') }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from '@/i18n'

const props = defineProps<{
  obs: any
  connection: string
  connectionOptions: string[]
  editLayout?: boolean
}>()

const emit = defineEmits<{
  command: [method: string, params: any]
  'update:connection': [connection: string]
}>()

const { t } = useI18n()
const audioDraft = reactive<Record<string, { muted?: boolean; volume?: number; balance?: number }>>({})

const audioItems = computed(() => {
  const raw = props.obs?.audio?.[props.connection] ?? {}
  return Object.entries(raw).map(([key, value]: any) => ({
    uuid: String(value?.inputUuid ?? value?.uuid ?? key),
    name: String(value?.inputName ?? value?.name ?? key),
    volume: Number(value?.volume?.inputVolumeDb ?? value?.inputVolumeDb ?? value?.volumeDb ?? -100),
    muted: Boolean(value?.inputMuted ?? value?.muted),
    balance: value?.inputAudioBalance == null && value?.balance == null
      ? null
      : Number(value?.inputAudioBalance ?? value?.balance),
  }))
})

watch(() => props.obs, () => {
  for (const input of audioItems.value) {
    const draft = audioDraft[input.uuid]
    if (!draft) continue
    if (draft.muted != null && input.muted === draft.muted) delete draft.muted
    if (draft.volume != null && Math.abs(input.volume - draft.volume) < 0.05) delete draft.volume
    if (draft.balance != null && input.balance != null && Math.abs(input.balance - draft.balance) < 0.005) delete draft.balance
  }
}, { deep: true, immediate: true })

function send(method: string, data: any) {
  emit('command', 'obs.command', { connection: props.connection, method, data })
}
function inputMuted(input: any) { return audioDraft[input.uuid]?.muted ?? input.muted }
function inputVolume(input: any) { return audioDraft[input.uuid]?.volume ?? input.volume }
function inputBalance(input: any) { return audioDraft[input.uuid]?.balance ?? Number(input.balance ?? 0.5) }
function toggleMute(input: any) {
  const muted = !inputMuted(input)
  ;(audioDraft[input.uuid] ??= {}).muted = muted
  send('SetInputMute', { inputUuid: input.uuid, inputMuted: muted })
}
function setVolume(input: any, value: number) {
  ;(audioDraft[input.uuid] ??= {}).volume = value
  send('SetInputVolume', { inputUuid: input.uuid, inputVolumeDb: value })
}
function setBalance(input: any, value: number) {
  ;(audioDraft[input.uuid] ??= {}).balance = value
  send('SetInputAudioBalance', { inputUuid: input.uuid, inputAudioBalance: value })
}
</script>

