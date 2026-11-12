<template>
  <div>
    <div class="audio-grid mb-5">
      <v-card v-for="item in interfaces" :key="item.name" variant="tonal" rounded="lg">
        <v-card-text>
          <div class="d-flex align-center ga-2 mb-2">
            <strong>{{ item.name }}</strong>
            <v-spacer />
            <span v-if="!isPerLink(item)">{{ Math.round(interfaceVolume(item) * 100) }}%</span>
            <v-btn :icon="interfaceMuted(item) ? 'mdi-volume-off' : 'mdi-volume-high'" :color="interfaceMuted(item) ? 'error' : undefined" variant="text" size="small" @click="setInterfaceMute(item, !interfaceMuted(item))" />
          </div>
          <v-switch
            v-if="isPipewireSink(item)"
            :model-value="isPerLink(item)"
            :label="t('instance.audioPerLink')"
            color="primary"
            density="compact"
            hide-details
            class="per-link-switch"
            @update:model-value="(enabled:any) => setPerLink(item, Boolean(enabled))"
          />
          <!-- Per-link control: one slider per linked output. -->
          <template v-if="isPerLink(item)">
            <div v-for="output in linkedOutputs(item)" :key="output" class="link-row" :title="output">
              <div class="d-flex align-center ga-2 min-w-0">
                <v-icon icon="mdi-arrow-right-thin" size="16" class="text-medium-emphasis" />
                <span class="text-caption text-truncate flex-grow-1">{{ outputNameLabel(output) }}</span>
                <span class="text-caption text-medium-emphasis">{{ Math.round(linkVolume(item, output) * 100) }}%</span>
              </div>
              <v-slider :model-value="linkVolume(item, output)" :min="Number(item.data.min_range ?? 0)" :max="Number(item.data.max_range ?? 1)" :step="Number(item.data.steps_range ?? .01)" :disabled="interfaceMuted(item)" hide-details thumb-label density="compact" @update:model-value="(v:any) => { linkDraft[linkKey(item, output)] = Number(v) }" @end="(v:any) => setLinkVolume(item, output, Number(v))" />
            </div>
            <div v-if="!linkedOutputs(item).length" class="text-caption text-medium-emphasis">{{ t('instance.audioNoLinks') }}</div>
          </template>
          <v-slider v-else :model-value="interfaceVolume(item)" :min="Number(item.data.min_range ?? 0)" :max="Number(item.data.max_range ?? 1)" :step="Number(item.data.steps_range ?? .01)" hide-details thumb-label @end="(v:any) => setInterfaceVolume(item, Number(v))" />
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
import { useI18n } from '@/i18n'
const props = defineProps<{audio:any}>()
const emit = defineEmits<{command:[method:string,params:any]; method:[method:string,params:any]}>()
const interfaceDraft = reactive<Record<string,{volume?:number;muted?:boolean}>>({})
const outputDraft = reactive<Record<string,{volume?:number;muted?:boolean}>>({})
const linkDraft = reactive<Record<string,number>>({})
const { t } = useI18n()
const interfaces = computed(() => Object.entries(props.audio?.data ?? {}).map(([name,data]) => ({name,data:data as any})))
const outputs = computed(() => Array.isArray(props.audio?.outputs) ? props.audio.outputs : [])
watch(() => props.audio, () => {
  for (const item of interfaces.value) {
    const d = interfaceDraft[item.name]; if (!d) continue
    if (d.volume != null && Math.abs(Number(item.data.current_volume ?? 0) - d.volume) < .005) delete d.volume
    if (d.muted != null && Boolean(item.data.muted) === d.muted) delete d.muted
  }
  for (const item of interfaces.value) {
    for (const output of linkedOutputs(item)) {
      const key = linkKey(item, output)
      const actual = Number(item.data?.link_volumes?.[output])
      if (linkDraft[key] != null && Number.isFinite(actual) && Math.abs(actual - linkDraft[key]) < .005) delete linkDraft[key]
    }
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
function isPipewireSink(item:any){ const v=item.data?.pipewire_sink; return v === true || v === 'true' || v === 1 || v === '1' }
function isPerLink(item:any){ return item.data?.per_link_control === true }
// Only links to connected outputs; disconnected devices are hidden from the
// cloud (they are managed locally).
// Sorted like the output list, so all panels show the same order.
function linkedOutputs(item:any): string[] {
  const v=item.data?.linked_outputs
  if (!Array.isArray(v)) return []
  const order=outputs.value.map((entry:any) => String(entry?.name ?? ''))
  return v.map(String).filter(isOutputConnected).sort((a:string, b:string) => order.indexOf(a) - order.indexOf(b))
}
function linkKey(item:any, output:string){ return `${item.name}\u0000${output}` }
function findOutput(output:string){ return outputs.value.find((entry:any) => String(entry?.name ?? '') === output) }
function isOutputConnected(output:string){ return Boolean(findOutput(output)) }
function outputNameLabel(output:string){ const out=findOutput(output); return out ? outputLabel(out) : output }
function linkVolume(item:any, output:string){
  const draft=linkDraft[linkKey(item, output)]; if (draft != null) return draft
  const v=Number(item.data?.link_volumes?.[output]); return Number.isFinite(v) ? v : interfaceVolume(item)
}
function setLinkVolume(item:any, output:string, value:number){ const volume=Math.max(0,Math.min(1,Number(value))); linkDraft[linkKey(item, output)]=volume; emit('method','set_link_volume',{interface:item.name,output,volume}) }
function setPerLink(item:any, enabled:boolean){ emit('method','set_per_link_control',{interface:item.name,enabled}) }
function outputVolume(out:any){ return outputDraft[outputKey(out)]?.volume ?? Number(out.volume ?? 0) }
function outputMuted(out:any){ return outputDraft[outputKey(out)]?.muted ?? Boolean(out.muted) }
function outputLabel(out:any){ return String(out.virtual_audio_cable_name ?? out.description ?? out.name ?? 'Audio output') }
function setInterfaceVolume(item:any, value:number){ const volume=Math.max(0,Math.min(1,Number(value))); ;(interfaceDraft[item.name] ??= {}).volume=volume; ;(interfaceDraft[item.name] ??= {}).muted=volume<=0; emit('method','set_volume',{interface:item.name,volume}) }
function setInterfaceMute(item:any, muted:boolean){ const current=interfaceVolume(item); const restore=Number(item.data?.current_volume ?? item.data?.default_volume ?? .2); const volume=muted ? 0 : (current > 0 ? current : (restore > 0 ? restore : .2)); ;(interfaceDraft[item.name] ??= {}).muted=muted; ;(interfaceDraft[item.name] ??= {}).volume=volume; emit('method','set_volume',{interface:item.name,volume}) }
function setOutputVolume(out:any, value:number){ const volume=Math.max(0,Math.min(1,Number(value))); ;(outputDraft[outputKey(out)] ??= {}).volume=volume; emit('method','set_audio_output_volume',{output:out.name,volume}) }
function setOutputMute(out:any, muted:boolean){ ;(outputDraft[outputKey(out)] ??= {}).muted=muted; emit('method','set_audio_output_mute',{output:out.name,muted}) }
</script>

<style scoped>
.per-link-switch { margin: -4px 0 2px 8px; }
.per-link-switch :deep(.v-label) { font-size: .8rem; }
.link-row { padding-left: 4px; }
</style>
