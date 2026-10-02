<template>
  <div>
    <div class="audio-grid mb-5">
      <v-card v-for="item in interfaces" :key="item.name" variant="tonal" rounded="lg">
        <v-card-text>
          <div class="d-flex align-center ga-2 mb-2">
            <v-icon>{{ interfaceMuted(item) ? 'mdi-volume-off' : 'mdi-volume-high' }}</v-icon>
            <strong>{{ item.name }}</strong>
            <v-spacer />
            <span>{{ Math.round(interfaceVolume(item) * 100) }}%</span>
            <v-btn :icon="interfaceMuted(item) ? 'mdi-volume-off' : 'mdi-volume-high'" :color="interfaceMuted(item) ? 'error' : undefined" variant="text" size="small" @click="setInterfaceMute(item, !interfaceMuted(item))" />
          </div>
          <v-slider :model-value="interfaceVolume(item)" :min="Number(item.data.min_range ?? 0)" :max="Number(item.data.max_range ?? 1)" :step="Number(item.data.steps_range ?? .01)" hide-details thumb-label @end="(v:any) => setInterfaceVolume(item, Number(v))" />
        </v-card-text>
      </v-card>
    </div>

    <v-card variant="tonal" rounded="lg">
      <v-card-title class="text-subtitle-1">Outputs</v-card-title>
      <v-divider />
      <v-list bg-color="transparent">
        <v-list-item v-for="out in outputs" :key="String(out.id ?? out.name)" :title="outputLabel(out)">
          <template #prepend>
            <v-chip v-if="out.virtual_audio_cable" size="x-small" variant="tonal" class="mr-3">Virtual</v-chip>
          </template>
          <template #append>
            <div class="output-actions">
              <span class="text-caption text-medium-emphasis output-volume-label">{{ Math.round(outputVolume(out) * 100) }}%</span>
              <v-slider class="output-slider" :model-value="outputVolume(out)" min="0" max="1" step=".01" hide-details @end="(v:any) => setOutputVolume(out, Number(v))" />
              <v-btn :icon="outputMuted(out) ? 'mdi-volume-off' : 'mdi-volume-high'" :color="outputMuted(out) ? 'error' : undefined" variant="text" size="small" @click="setOutputMute(out, !outputMuted(out))" />
            </div>
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
const props = defineProps<{audio:any}>()
const emit = defineEmits<{command:[method:string,params:any]}>()
const interfaceDraft = reactive<Record<string,{volume?:number;muted?:boolean}>>({})
const outputDraft = reactive<Record<string,{volume?:number;muted?:boolean}>>({})
const interfaces = computed(() => Object.entries(props.audio?.data ?? {}).map(([name,data]) => ({name,data:data as any})))
const outputs = computed(() => Array.isArray(props.audio?.outputs) ? props.audio.outputs : [])
watch(() => props.audio, () => {
  for (const item of interfaces.value) {
    const d = interfaceDraft[item.name]; if (!d) continue
    if (d.volume != null && Math.abs(Number(item.data.current_volume ?? 0) - d.volume) < .005) delete d.volume
    if (d.muted != null && Boolean(item.data.muted) === d.muted) delete d.muted
  }
  for (const out of outputs.value) {
    const d = outputDraft[outputKey(out)]; if (!d) continue
    if (d.volume != null && Math.abs(Number(out.volume ?? 0) - d.volume) < .005) delete d.volume
    if (d.muted != null && Boolean(out.muted) === d.muted) delete d.muted
  }
}, { deep:true })
function interfaceVolume(item:any){ return interfaceDraft[item.name]?.volume ?? Number(item.data?.current_volume ?? item.data?.default_volume ?? 0) }
function interfaceMuted(item:any){ return interfaceDraft[item.name]?.muted ?? Boolean(item.data?.muted) }
function outputKey(out:any){ return String(out.name ?? out.id) }
function outputVolume(out:any){ return outputDraft[outputKey(out)]?.volume ?? Number(out.volume ?? 0) }
function outputMuted(out:any){ return outputDraft[outputKey(out)]?.muted ?? Boolean(out.muted) }
function outputLabel(out:any){ return String(out.virtual_audio_cable_name ?? out.description ?? out.name ?? 'Audio output') }
function setInterfaceVolume(item:any, value:number){ ;(interfaceDraft[item.name] ??= {}).volume=value; emit('command','audio.volume',{output:item.name,volume:Math.round(value*100)}) }
function setInterfaceMute(item:any, muted:boolean){ ;(interfaceDraft[item.name] ??= {}).muted=muted; emit('command','audio.mute',{output:item.name,muted}) }
function setOutputVolume(out:any, value:number){ ;(outputDraft[outputKey(out)] ??= {}).volume=value; emit('command','audio.volume',{output:out.name,volume:Math.round(value*100)}) }
function setOutputMute(out:any, muted:boolean){ ;(outputDraft[outputKey(out)] ??= {}).muted=muted; emit('command','audio.mute',{output:out.name,muted}) }
</script>

<style scoped>
.audio-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.output-actions{display:grid;grid-template-columns:42px minmax(120px,170px) 36px;align-items:center;gap:8px}
.output-volume-label{text-align:right;font-variant-numeric:tabular-nums}
.output-slider{width:100%}
@media (max-width:700px){.output-actions{grid-template-columns:36px 110px 36px}}
</style>
