<template>
  <div class="obs-scenes-control">
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

    <div v-if="canvases.length" class="canvas-list">
      <section v-for="canvas in canvases" :key="canvasKey(canvas)" class="canvas-block">
        <div class="canvas-heading">
          <div class="d-flex align-center ga-2 min-w-0">
            <v-icon size="small">mdi-monitor-dashboard</v-icon>
            <span class="font-weight-medium text-truncate">{{ canvasLabel(canvas) }}</span>
          </div>
        </div>

        <div class="scene-list">
          <article
            v-for="scene in canvasScenes(canvas)"
            :key="sceneKey(scene)"
            class="scene-card"
            :class="{ 'scene-card--active': isActiveScene(scene) }"
          >
            <div class="scene-card__header">
              <button class="scene-card__expand" type="button" @click="toggleExpanded(scene)">
                <v-icon size="small" :color="isActiveScene(scene) ? 'primary' : undefined">
                  {{ isActiveScene(scene) ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank' }}
                </v-icon>
                <span class="scene-card__name">{{ sceneLabel(scene) }}</span>
                <v-chip v-if="isActiveScene(scene)" size="x-small" color="primary" variant="tonal">Live</v-chip>
              </button>
              <div class="scene-card__actions">
                <v-btn
                  v-if="!isActiveScene(scene)"
                  class="scene-card__switch"
                  size="small"
                  variant="tonal"
                  color="primary"
                  prepend-icon="mdi-play"
                  @click.stop="switchScene(scene)"
                >
                  {{ t('instance.obsSwitchTo') }}
                </v-btn>
                <v-btn
                  :icon="expanded.has(sceneKey(scene)) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                  size="x-small"
                  variant="text"
                  @click.stop="toggleExpanded(scene)"
                />
              </div>
            </div>

            <div v-if="expanded.has(sceneKey(scene))" class="source-tree">
              <div
                v-for="source in flattenedSources(scene)"
                :key="sourceKey(source)"
                class="source-row"
                :style="{ '--depth': String(Math.max(0, Number(source.depth ?? 0))) }"
              >
                <div class="source-indent"></div>
                <v-icon size="small" class="source-icon">{{ source.isGroup ? 'mdi-folder-outline' : sourceIcon(source) }}</v-icon>
                <span class="source-name">{{ sourceLabel(source) }}</span>
                <v-switch
                  class="source-toggle mr-3"
                  hide-details
                  density="compact"
                  color="primary"
                  :model-value="sourceEnabled(source)"
                  @click.stop
                  @update:model-value="(enabled) => toggleSource(scene, source, Boolean(enabled))"
                />
              </div>
              <div v-if="!flattenedSources(scene).length" class="text-caption text-medium-emphasis pa-3">{{ t('instance.noSceneItems') }}</div>
            </div>
          </article>
        </div>
      </section>
    </div>
    <div v-else class="text-medium-emphasis">{{ t('instance.noObsScenes') }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
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
const expanded = ref(new Set<string>())
const sourceDraft = reactive<Record<string, boolean>>({})

const canvases = computed(() => {
  const raw = props.obs?.scenes?.[props.connection]
  if (!Array.isArray(raw)) return []
  if (raw.some((entry: any) => Array.isArray(entry?.scenes))) return raw
  return [{ name: 'Main', uuid: '__flat__', scenes: raw, __synthetic: true }]
})

watch(() => props.obs, () => {
  for (const canvas of canvases.value) {
    for (const scene of canvasScenes(canvas)) {
      if (isActiveScene(scene) && !expanded.value.has(sceneKey(scene))) {
        const next = new Set(expanded.value)
        next.add(sceneKey(scene))
        expanded.value = next
      }
      for (const source of flattenedSources(scene)) {
        const key = sourceKey(source)
        if (Object.prototype.hasOwnProperty.call(sourceDraft, key) && Boolean(source?.sceneItemEnabled ?? source?.enabled) === sourceDraft[key]) {
          delete sourceDraft[key]
        }
      }
    }
  }
}, { deep: true, immediate: true })

function send(method: string, data: any) {
  emit('command', 'obs.command', { connection: props.connection, method, data })
}
function canvasKey(canvas: any) { return String(canvas?.uuid ?? canvas?.canvasUuid ?? canvas?.name ?? canvas?.index ?? 'canvas') }
function canvasLabel(canvas: any) { return String(canvas?.name ?? canvas?.canvasName ?? canvas?.uuid ?? 'Canvas') }
function canvasScenes(canvas: any) { return Array.isArray(canvas?.scenes) ? canvas.scenes : [] }
function sceneKey(scene: any) { return String(scene?.uuid ?? scene?.sceneUuid ?? scene?.name ?? scene?.sceneName) }
function sceneLabel(scene: any) { return String(scene?.name ?? scene?.sceneName ?? scene?.uuid ?? 'Scene') }
function sourceKey(source: any) { return String(source?.uuid ?? source?.sourceUuid ?? `${source?.parentSceneUuid ?? ''}:${source?.sceneItemId ?? source?.id ?? source?.name ?? source?.sourceName}`) }
function sourceLabel(source: any) { return String(source?.name ?? source?.sourceName ?? source?.inputName ?? `#${source?.sceneItemId ?? source?.id ?? ''}`) }
function sourceEnabled(source: any) {
  const key = sourceKey(source)
  return Object.prototype.hasOwnProperty.call(sourceDraft, key) ? sourceDraft[key] : Boolean(source?.sceneItemEnabled ?? source?.enabled)
}
function isActiveScene(scene: any) { return Boolean(scene?.active ?? scene?.current ?? scene?.isActive ?? scene?.isCurrentProgramScene) }
function flattenedSources(scene: any) {
  const roots = Array.isArray(scene?.items) ? scene.items : Array.isArray(scene?.sources) ? scene.sources : Array.isArray(scene?.sceneItems) ? scene.sceneItems : []
  const output: any[] = []
  const visit = (item: any, depth: number) => {
    output.push({ ...item, depth: item?.depth ?? depth })
    if (Array.isArray(item?.children)) for (const child of item.children) visit(child, depth + 1)
  }
  for (const item of roots) visit(item, 0)
  return output
}
function sourceIcon(source: any) {
  const kind = String(source?.inputKind ?? '').toLowerCase()
  if (kind.includes('v4l2')) return 'mdi-camera-outline'
  if (kind.includes('browser')) return 'mdi-web'
  if (kind.includes('game_capture')) return 'mdi-controller-classic-outline'
  if (kind.includes('window_capture')) return 'mdi-application-outline'
  if (kind.includes('display_capture') || kind.includes('monitor_capture')) return 'mdi-monitor-screenshot'
  if (kind.includes('video_capture') || kind.includes('camera')) return 'mdi-video-outline'
  if (kind.includes('audio_input')) return 'mdi-microphone-outline'
  if (kind.includes('audio_output')) return 'mdi-volume-high'
  if (kind.includes('image')) return 'mdi-image-outline'
  if (kind.includes('media')) return 'mdi-play-box-outline'
  if (kind.includes('text')) return 'mdi-format-text'
  if (kind.includes('color')) return 'mdi-palette-outline'
  return 'mdi-checkbox-blank-outline'
}
function switchScene(scene: any) {
  const sceneName = sceneLabel(scene).trim()
  if (sceneName) send('SetCurrentProgramScene', { sceneName })
}
function toggleExpanded(scene: any) {
  const key = sceneKey(scene)
  const next = new Set(expanded.value)
  next.has(key) ? next.delete(key) : next.add(key)
  expanded.value = next
}
function toggleSource(scene: any, source: any, enabled: boolean) {
  sourceDraft[sourceKey(source)] = enabled
  const data: any = { sceneItemId: Number(source?.sceneItemId ?? source?.id), sceneItemEnabled: enabled }
  const sceneUuid = source?.parentSceneUuid ?? scene?.uuid ?? scene?.sceneUuid
  const sceneName = source?.parentSceneName ?? scene?.name ?? scene?.sceneName
  if (sceneUuid) data.sceneUuid = sceneUuid
  else if (sceneName) data.sceneName = sceneName
  send('SetSceneItemEnabled', data)
}
</script>

