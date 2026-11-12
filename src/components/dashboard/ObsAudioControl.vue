<template>
  <div class="obs-audio-control">
    <template v-if="showName">
      <div class="font-weight-medium text-truncate">{{ input.name }}</div>
      <div class="text-caption text-medium-emphasis text-truncate">{{ input.kind || input.uuid }}</div>
    </template>

    <div class="d-flex align-center ga-1">
      <v-btn
        density="compact"
        elevation="0"
        variant="text"
        :color="muted ? 'red' : undefined"
        :icon="muted ? 'mdi-volume-variant-off' : 'mdi-volume-source'"
        @click.stop="toggleMute"
      />
      <v-btn
        density="compact"
        elevation="0"
        variant="text"
        icon="mdi-minus"
        :disabled="muted"
        @click.stop="stepVolume(-1)"
      />
      <v-slider
        :model-value="volume"
        :min="-100"
        :max="0"
        :step="input.step"
        :disabled="muted"
        density="compact"
        hide-details
        class="flex-grow-1"
        @update:model-value="(v:any) => { draft.volume = Number(v) }"
        @end="(v:any) => setVolume(Number(v))"
      />
      <v-btn
        density="compact"
        elevation="0"
        variant="text"
        icon="mdi-plus"
        :disabled="muted"
        @click.stop="stepVolume(1)"
      />
      <span class="text-caption text-medium-emphasis obs-audio-control__percent">{{ volumePercent }}%</span>
    </div>

    <div v-if="input.balance !== null" class="d-flex align-center ga-1">
      <span class="text-caption text-medium-emphasis obs-audio-control__label">{{ t('instance.obsAudioBalance') }}</span>
      <v-slider
        :model-value="balance"
        :min="0"
        :max="1"
        :step="0.01"
        density="compact"
        hide-details
        class="flex-grow-1"
        @update:model-value="(v:any) => { draft.balance = Number(v) }"
        @end="(v:any) => setBalance(Number(v))"
      />
      <span class="text-caption text-medium-emphasis obs-audio-control__percent">{{ Math.round(balance * 100) }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from '@/i18n'
import { normalizeObsAudioInput } from './obsAudio'

const props = defineProps<{
  device: any
  showName?: boolean
}>()

const emit = defineEmits<{
  send: [method: string, data: any]
}>()

const { t } = useI18n()

// Optimistic values until the next OBS update confirms them.
const draft = reactive<{ muted?: boolean; volume?: number; balance?: number }>({})

const input = computed(() => normalizeObsAudioInput(props.device))
const muted = computed(() => draft.muted ?? input.value.muted)
const volume = computed(() => draft.volume ?? input.value.volume)
const balance = computed(() => draft.balance ?? Number(input.value.balance ?? 0.5))
const volumePercent = computed(() => {
  if (draft.volume == null && Number.isFinite(input.value.volumeMul)) return Math.round(input.value.volumeMul * 100)
  return Math.round(Math.pow(10, volume.value / 20) * 100)
})

watch(input, (value) => {
  if (draft.muted != null && value.muted === draft.muted) delete draft.muted
  if (draft.volume != null && Math.abs(value.volume - draft.volume) < 0.05) delete draft.volume
  if (draft.balance != null && value.balance != null && Math.abs(value.balance - draft.balance) < 0.005) delete draft.balance
}, { deep: true })

function toggleMute() {
  draft.muted = !muted.value
  emit('send', 'SetInputMute', { inputUuid: input.value.uuid, inputMuted: draft.muted })
}
function setVolume(value: number) {
  draft.volume = Math.max(-100, Math.min(0, value))
  emit('send', 'SetInputVolume', { inputUuid: input.value.uuid, inputVolumeDb: draft.volume })
}
function stepVolume(direction: number) {
  setVolume(volume.value + input.value.step * direction)
}
function setBalance(value: number) {
  draft.balance = Math.max(0, Math.min(1, value))
  emit('send', 'SetInputAudioBalance', { inputUuid: input.value.uuid, inputAudioBalance: draft.balance })
}
</script>

<style scoped>
.obs-audio-control { min-width: 0; }
.obs-audio-control__percent { min-width: 40px; text-align: right; }
.obs-audio-control__label { min-width: 64px; padding-left: 4px; }
</style>
