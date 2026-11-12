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

    <div v-if="canvases.length" class="d-flex flex-column ga-2">
      <div v-for="canvas in canvases" :key="canvasKey(canvas)">
        <div
          v-if="canvases.length > 1"
          class="text-caption text-medium-emphasis d-flex align-center ga-1 mb-1"
        >
          <v-icon icon="mdi-monitor-dashboard" size="x-small" />
          {{ canvasLabel(canvas) }}
        </div>

        <v-expansion-panels
          v-model="openScenes"
          multiple
          variant="accordion"
        >
          <v-expansion-panel
            v-for="scene in canvasScenes(canvas)"
            :key="sceneKey(scene)"
            :value="sceneKey(scene)"
            :color="isActiveScene(scene) ? 'primary' : undefined"
            class="obs-scene"
            :class="{
              'obs-scene--active': isActiveScene(scene),
              'obs-scene--switching': isSwitching(scene),
            }"
          >
            <v-expansion-panel-title class="obs-scene__title">
              <div class="d-flex align-center ga-2 w-100 min-w-0 pr-2">
                <span class="text-truncate flex-grow-1">{{ sceneLabel(scene) }}</span>

                <v-fade-transition mode="out-in">
                  <v-chip
                    v-if="isSwitching(scene)"
                    key="switching"
                    size="x-small"
                    :variant="isActiveScene(scene) ? 'flat' : 'tonal'"
                    :color="isActiveScene(scene) ? 'surface' : 'primary'"
                  >
                    {{ t('instance.obsSwitching') }}
                  </v-chip>
                  <v-chip
                    v-else-if="isActiveScene(scene)"
                    key="live"
                    size="x-small"
                    variant="flat"
                    color="surface"
                  >
                    {{ t('instance.obsLive') }}
                  </v-chip>
                  <v-btn
                    v-else
                    key="switch"
                    size="x-small"
                    variant="tonal"
                    color="primary"
                    icon="mdi-play"
                    density="comfortable"
                    :title="t('instance.obsSwitchTo')"
                    @click.stop="switchScene(scene)"
                  />
                </v-fade-transition>
              </div>

              <v-progress-linear
                :active="isSwitching(scene)"
                indeterminate
                absolute
                location="bottom"
                color="primary"
                height="2"
              />
            </v-expansion-panel-title>

            <v-expansion-panel-text class="obs-scene__content">
              <div
                v-if="!flattenedSources(scene).length"
                class="text-caption text-medium-emphasis py-1"
              >
                {{ t('instance.noSceneItems') }}
              </div>

              <div v-for="source in flattenedSources(scene)" :key="sourceKey(source)">
                <div
                  class="obs-source"
                  :class="{ 'obs-source--disabled': !sourceEnabled(source) }"
                  :style="{ paddingLeft: `${Math.max(0, Number(source.depth ?? 0)) * 14}px` }"
                >
                  <v-icon :icon="sourceIcon(source)" size="small" class="obs-source__icon" />
                  <span class="text-body-2 text-truncate flex-grow-1 obs-source__name">{{ sourceLabel(source) }}</span>
                  <v-btn
                    v-if="audioDeviceFor(source)"
                    size="x-small"
                    variant="tonal"
                    :color="audioMuted(source) ? 'error' : undefined"
                    :prepend-icon="audioMuted(source) ? 'mdi-volume-variant-off' : 'mdi-volume-source'"
                    :append-icon="audioOpen.has(sourceKey(source)) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                    :title="t('instance.obsAudio')"
                    @click="toggleAudio(source)"
                  />
                  <v-switch
                    :model-value="sourceEnabled(source)"
                    color="primary"
                    density="compact"
                    hide-details
                    class="obs-source__toggle"
                    @update:model-value="(enabled) => toggleSource(scene, source, Boolean(enabled))"
                  />
                </div>
                <v-expand-transition>
                  <ObsAudioControl
                    v-if="audioDeviceFor(source) && audioOpen.has(sourceKey(source))"
                    :device="audioDeviceFor(source)"
                    class="pb-1"
                    :style="{ paddingLeft: `${Math.max(0, Number(source.depth ?? 0)) * 14}px` }"
                    @send="send"
                  />
                </v-expand-transition>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
    </div>
    <div v-else class="text-medium-emphasis">{{ t('instance.noObsScenes') }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
import ObsAudioControl from './ObsAudioControl.vue'
import { findAudioDevice, getAudioDevices } from './obsAudio'

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
// Open scene panels. The live scene opens automatically.
const openScenes = ref<string[]>([])
const sourceDraft = reactive<Record<string, boolean>>({})

const canvases = computed(() => {
  const raw = props.obs?.scenes?.[props.connection]
  if (!Array.isArray(raw)) return []
  if (raw.some((entry: any) => Array.isArray(entry?.scenes))) return raw
  return [{ name: 'Main', uuid: '__flat__', scenes: raw, __synthetic: true }]
})

const audioDevices = computed(() => getAudioDevices(props.obs?.audio?.[props.connection]))
function audioDeviceFor(source: any) { return findAudioDevice(audioDevices.value, source) }
function audioMuted(source: any) { return Boolean(audioDeviceFor(source)?.muted ?? audioDeviceFor(source)?.inputMuted) }

// Per-source audio accordions, collapsed by default.
const audioOpen = ref(new Set<string>())
function toggleAudio(source: any) {
  const key = sourceKey(source)
  const next = new Set(audioOpen.value)
  next.has(key) ? next.delete(key) : next.add(key)
  audioOpen.value = next
}

// Declared before the immediate watcher below, which reads it during setup.
// Scene that was clicked and is waiting for OBS to confirm the switch.
const switchingKey = ref('')
let switchingTimer: ReturnType<typeof setTimeout> | undefined
// Backend flag (shared by all panels, incl. switches from OBS/local) or the
// local click until the backend confirms.
function isSwitching(scene: any) {
  if (scene?.switching === true) return true
  return Boolean(switchingKey.value) && !isActiveScene(scene) && sceneKey(scene) === switchingKey.value
}
function clearSwitching() {
  switchingKey.value = ''
  if (switchingTimer) clearTimeout(switchingTimer)
  switchingTimer = undefined
}
onBeforeUnmount(clearSwitching)

// When the live scene changes, the new one opens and the old one closes
// (scenes opened manually stay open).
let previousActiveKeys = new Set<string>()

watch(() => props.obs, () => {
  const activeKeys = new Set<string>()
  for (const canvas of canvases.value) {
    for (const scene of canvasScenes(canvas)) {
      if (isActiveScene(scene)) activeKeys.add(sceneKey(scene))
    }
  }
  const changed = [...activeKeys].some(key => !previousActiveKeys.has(key))
    || [...previousActiveKeys].some(key => !activeKeys.has(key))
  if (changed) {
    const next = openScenes.value.filter(key => !previousActiveKeys.has(key) || activeKeys.has(key))
    for (const key of activeKeys) if (!next.includes(key)) next.push(key)
    openScenes.value = next
    previousActiveKeys = activeKeys
    if (switchingKey.value && activeKeys.has(switchingKey.value)) clearSwitching()
  }

  for (const canvas of canvases.value) {
    for (const scene of canvasScenes(canvas)) {
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
// Same mapping as the local admin panel's scene browser.
function sourceIcon(source: any) {
  if (source?.isGroup) return 'mdi-folder-outline'
  const kind = String(source?.inputKind ?? source?.sourceType ?? source?.kind ?? '').toLowerCase()
  if (kind.includes('browser')) return 'mdi-web'
  if (kind.includes('image')) return 'mdi-image-outline'
  if (kind.includes('media')) return 'mdi-movie-open-outline'
  if (kind.includes('ffmpeg')) return 'mdi-movie-open-outline'
  if (kind.includes('vlc')) return 'mdi-playlist-play'
  if (kind.includes('text')) return 'mdi-format-text'
  if (kind.includes('audio')) return 'mdi-volume-high'
  if (kind.includes('wasapi')) return 'mdi-volume-high'
  if (kind.includes('pulse')) return 'mdi-volume-high'
  if (kind.includes('alsa')) return 'mdi-volume-high'
  if (kind.includes('capture')) return 'mdi-video-outline'
  if (kind.includes('camera')) return 'mdi-camera-outline'
  if (kind.includes('scene')) return 'mdi-view-dashboard-outline'
  if (kind.includes('color')) return 'mdi-palette-outline'
  return 'mdi-source-branch'
}

function switchScene(scene: any) {
  // Show the switch immediately; cleared once OBS reports the new live
  // scene (or after a timeout if the switch failed).
  clearSwitching()
  switchingKey.value = sceneKey(scene)
  switchingTimer = setTimeout(clearSwitching, 10_000)

  const sceneUuid = String(scene?.uuid ?? scene?.sceneUuid ?? '')
  const sceneName = sceneLabel(scene).trim()
  if (sceneUuid) send('SetCurrentProgramScene', { sceneUuid })
  else if (sceneName) send('SetCurrentProgramScene', { sceneName })
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

<style scoped>
.obs-scenes-control { min-width: 0; }

.obs-scene {
  transition: background-color .3s ease, color .3s ease;
}
.obs-scene__title {
  min-height: 40px !important;
  padding: 6px 12px;
}
.obs-scene__content :deep(.v-expansion-panel-text__wrapper) {
  padding: 4px 8px 8px 12px;
}

/* Pulse while OBS performs the switch, short glow when it becomes live. */
@keyframes obs-scene-switching {
  0%, 100% { background-color: rgba(var(--obs-switch-pulse), .06); }
  50% { background-color: rgba(var(--obs-switch-pulse), .26); }
}
@keyframes obs-scene-activated {
  0% { box-shadow: 0 0 0 0 rgba(var(--v-theme-primary), .7); }
  100% { box-shadow: 0 0 0 8px rgba(var(--v-theme-primary), 0); }
}
/* Glow once the transition is done (switching ends on the live scene). */
.obs-scene--active:not(.obs-scene--switching) { animation: obs-scene-activated .8s ease-out; }
/* Pulse only the title; on the (primary filled) live scene use a light tint. */
.obs-scene { --obs-switch-pulse: var(--v-theme-primary); }
.obs-scene--active { --obs-switch-pulse: var(--v-theme-on-primary); }
.obs-scene--switching .obs-scene__title { animation: obs-scene-switching 1s ease-in-out infinite; }

.obs-source { display: flex; align-items: center; gap: 6px; min-width: 0; min-height: 34px; }
.obs-source__icon { opacity: .8; flex: none; transition: opacity .2s ease; }
.obs-source__name { transition: opacity .2s ease; }
.obs-source__toggle { flex: none; margin-left: 10px; }
/* Disabled sources are dimmed; animate the change. */
.obs-source--disabled .obs-source__name,
.obs-source--disabled .obs-source__icon { opacity: .45; }
</style>
