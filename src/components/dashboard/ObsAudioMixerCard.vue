<template>
  <div class="obs-audio-mixer">
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

    <div v-if="globalAudioDevices.length" class="obs-audio-mixer__list">
      <ObsAudioControl
        v-for="device in globalAudioDevices"
        :key="device.inputUuid"
        :device="device"
        show-name
        class="obs-audio-mixer__row"
        @send="send"
      />
    </div>
    <div v-else class="text-medium-emphasis">{{ t('instance.noObsAudioInputs') }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import ObsAudioControl from './ObsAudioControl.vue'
import { getAudioDevices, getGlobalAudioDevices } from './obsAudio'

// Global OBS audio devices (Desktop Audio, Mic/Aux, ...). Audio sources that
// are part of a scene are controlled under the source in the scenes card.
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

const globalAudioDevices = computed(() => getGlobalAudioDevices(
  getAudioDevices(props.obs?.audio?.[props.connection]),
  props.obs?.scenes?.[props.connection],
))

function send(method: string, data: any) {
  emit('command', 'obs.command', { connection: props.connection, method, data })
}
</script>

<style scoped>
.obs-audio-mixer { min-width: 0; }
.obs-audio-mixer__list { display: flex; flex-direction: column; }
.obs-audio-mixer__row { padding: 10px 2px; }
.obs-audio-mixer__row + .obs-audio-mixer__row {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
