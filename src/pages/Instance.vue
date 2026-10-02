<template>
  <PageShell :title="instanceName" wide>
    <template #title-after>
      <v-chip
        size="small"
        variant="tonal"
        :color="online ? 'success' : undefined"
        :prepend-icon="online ? 'mdi-lan-connect' : 'mdi-lan-disconnect'"
      >
        {{ online ? t('common.online') : t('common.offline') }}
      </v-chip>
    </template>

    <template #actions>
      <v-menu v-if="hiddenSections.length">
        <template #activator="{ props }">
          <v-btn v-bind="props" prepend-icon="mdi-plus" variant="text">
            {{ t('instance.addCard') }}
          </v-btn>
        </template>
        <v-list density="comfortable">
          <v-list-item
            v-for="section in hiddenSections"
            :key="section.key"
            :prepend-icon="section.icon"
            :title="t(`sections.${section.key}`)"
            @click="showSection(section.key)"
          />
        </v-list>
      </v-menu>

      <v-btn
        :prepend-icon="editLayout ? 'mdi-check' : 'mdi-view-dashboard-edit-outline'"
        :color="editLayout ? 'primary' : undefined"
        :variant="editLayout ? 'flat' : 'tonal'"
        @click="editLayout = !editLayout"
      >
        {{ editLayout ? t('instance.finishEditing') : t('instance.editDashboard') }}
      </v-btn>
      <v-btn prepend-icon="mdi-arrow-left" variant="text" to="/instances">{{ t('common.back') }}</v-btn>
    </template>

    <v-alert v-if="!instance" type="warning" variant="tonal" class="mb-4">{{ t('instance.unavailable') }}</v-alert>

    <template v-if="instance">
      <div
        v-if="visibleSections.length"
        ref="dashboardBoard"
        class="dashboard-board"
        :class="{ 'dashboard-board--editing': editLayout }"
        :style="{ '--dashboard-columns': dashboardColumnCount }"
      >
        <div
          v-for="(column, columnIndex) in dashboardColumns"
          :key="columnIndex"
          class="dashboard-column"
          :class="{ 'dashboard-column--editing': editLayout }"
          @dragover.prevent
          @drop.prevent="onDropAt(columnIndex, column.length)"
        >
          <template v-for="(section, sectionIndex) in column" :key="section.key">
            <div
              v-if="editLayout"
              class="dashboard-drop-slot"
              :class="{ 'dashboard-drop-slot--active': dropSlot?.column === columnIndex && dropSlot?.index === sectionIndex }"
              @dragenter.prevent="onDragSlot(columnIndex, sectionIndex)"
              @dragover.prevent="onDragSlot(columnIndex, sectionIndex)"
              @drop.stop.prevent="onDropAt(columnIndex, sectionIndex)"
            />
            <v-card
              rounded="xl"
              class="dashboard-card"
              :class="{ 'dashboard-card--editing': editLayout, 'dashboard-card--dragging': draggedSection === section.key }"
              :draggable="editLayout"
              @dragstart="onDragStart($event, section.key)"
              @dragend="onDragEnd"
            >
          <v-card-title class="dashboard-card__title">
            <div class="d-flex align-center ga-2 min-w-0">
              <v-icon>{{ section.icon }}</v-icon>
              <span class="text-truncate">{{ t(`sections.${section.key}`) }}</span>
              <v-chip v-if="section.key === 'obs' && obsConnectionFor(section)" size="x-small" variant="tonal" prepend-icon="mdi-connection">{{ obsConnectionFor(section) }}</v-chip>
            </div>
            <v-spacer />
            <div v-if="editLayout" class="dashboard-card__edit-actions">
              <v-btn v-if="section.key === 'macros'" icon="mdi-tune-variant" size="x-small" variant="text" :title="t('instance.selectMacros')" @click.stop="openMacroSelector(section)" />
              <v-icon class="dashboard-drag-handle" :title="t('instance.moveCard')">mdi-drag</v-icon>
              <v-btn icon="mdi-close" size="x-small" variant="text" :title="t('instance.removeCard')" @click.stop="hideSection(section.key)" />
            </div>
          </v-card-title>
            <v-card-text>
              <template v-if="section.key === 'music'">
                <div class="music-card">
                  <div class="music-meta">
                    <div class="music-art">
                      <v-img v-if="music.thumbnail" :src="music.thumbnail" cover />
                      <v-icon v-else size="42">mdi-music-note</v-icon>
                    </div>
                    <div class="min-w-0 flex-grow-1">
                      <div class="text-h6 text-truncate">{{ music.title || t('instance.noTrack') }}</div>
                      <div class="text-body-2 text-medium-emphasis text-truncate">{{ [music.artist, music.album].filter(Boolean).join(' · ') }}</div>
                    </div>
                  </div>

                  <div class="music-progress mt-5">
                    <v-slider :model-value="musicProgress" min="0" max="100" step="0.1" hide-details readonly class="music-progress-slider" />
                    <div class="d-flex justify-space-between text-caption text-medium-emphasis mt-n1">
                      <span>{{ formatDuration(music.position ?? music.progress) }}</span>
                      <span>{{ formatDuration(music.duration) }}</span>
                    </div>
                  </div>

                  <div class="music-controls mt-4">
                    <v-btn icon="mdi-shuffle" size="small" :variant="music.shuffle ? 'flat' : 'text'" :color="music.shuffle ? 'primary' : undefined" @click="command('music.shuffle',{},'music')" />
                    <v-btn icon="mdi-skip-previous" size="large" variant="text" @click="command('music.prev',{},'music')" />
                    <v-btn :icon="music.status === 'playing' ? 'mdi-pause' : 'mdi-play'" size="x-large" color="primary" variant="flat" class="music-play" @click="command(music.status === 'playing' ? 'music.pause' : 'music.play',{},'music')" />
                    <v-btn icon="mdi-skip-next" size="large" variant="text" @click="command('music.next',{},'music')" />
                    <v-btn icon="mdi-repeat" size="small" :variant="music.loop ? 'flat' : 'text'" :color="music.loop ? 'primary' : undefined" @click="command('music.loop',{},'music')" />
                  </div>

                  <div class="music-volume mt-5">
                    <v-icon size="small">mdi-volume-medium</v-icon>
                    <v-slider :model-value="Number(music.volume ?? 0)" min="0" max="100" step="1" hide-details thumb-label @end="(v:any)=>command('music.volume',{volume:Number(v)},'music')" />
                    <span class="text-caption text-medium-emphasis">{{ Math.round(Number(music.volume ?? 0)) }}%</span>
                  </div>

                  <div class="music-stats mt-4">
                    <span>{{ t('instance.playlistTracks', { count: Number(music.playlist_length ?? 0) }) }}</span>
                    <span>{{ t('instance.songRequests') }}: {{ music.songrequest?.enabled ? t('common.yes') : t('common.no') }}</span>
                    <span>{{ t('instance.queue') }}: {{ Number(music.songrequest?.queue_length ?? music.songrequest?.queue?.length ?? 0) }}</span>
                  </div>
                </div>
              </template>

              <template v-else-if="section.key === 'giveaway'">
                <v-row>
                  <v-col cols="12" md="4">
                    <v-card variant="tonal" rounded="lg">
                      <v-card-text>
                        <div class="text-overline">{{ t('instance.status') }}</div>
                        <div class="text-h5">{{ giveaway.active ? t('instance.active') : t('instance.inactive') }}</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-card variant="tonal" rounded="lg"><v-card-text><div class="text-overline">{{ t('instance.entries') }}</div><div class="text-h5">{{ giveaway.users?.length ?? 0 }}</div></v-card-text></v-card>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-card variant="tonal" rounded="lg"><v-card-text><div class="text-overline">{{ t('instance.command') }}</div><div class="text-h5">!{{ giveaway.settings?.giveawayCommand ?? 'ticket' }}</div></v-card-text></v-card>
                  </v-col>
                </v-row>
                <div class="mt-4 text-body-1">{{ giveaway.giveawayText || t('instance.noGiveaway') }}</div>
              </template>

              <template v-else-if="section.key === 'interactions'">
                <v-list v-if="interactionItems.length" bg-color="transparent">
                  <v-list-item v-for="item in interactionItems" :key="itemKey(item)" :title="itemLabel(item)" :subtitle="String(item.eta ?? item.status ?? '')">
                    <template #append><v-btn icon="mdi-delete-outline" variant="text" color="error" @click="command('interaction.remove',{uuid:item.uuid ?? item.id},'interactions')" /></template>
                  </v-list-item>
                </v-list>
                <div v-else class="empty-state">{{ t('instance.emptySection') }}</div>
              </template>

              <template v-else-if="section.key === 'auto_macros'">
                <v-list v-if="autoMacroItems.length" bg-color="transparent" class="auto-macro-list">
                  <v-list-item v-for="item in autoMacroItems" :key="itemKey(item)" class="auto-macro-item">
                    <div v-if="item.enabled" class="auto-macro-item__progress" :style="{ width: `${autoMacroProgress(item)}%` }"></div>
                    <div class="auto-macro-item__content">
                      <div class="d-flex align-center ga-3 flex-grow-1 min-w-0">
                        <v-icon :color="item.enabled ? 'success' : undefined">{{ item.enabled ? 'mdi-robot' : 'mdi-robot-off-outline' }}</v-icon>
                        <div class="min-w-0">
                          <div class="font-weight-medium text-truncate">{{ itemLabel(item) }}</div>
                          <div class="text-caption text-medium-emphasis">
                            {{ item.enabled ? t('instance.nextTriggerIn',{time:formatSeconds(item.current_interval ?? 0)}) : t('instance.intervalSeconds',{count:Number(item.interval ?? 0)}) }}
                          </div>
                        </div>
                      </div>
                      <v-switch class="auto-macro-switch" color="primary" hide-details density="compact" :model-value="Boolean(item.enabled)" @update:model-value="(enabled)=>command('auto_macro.toggle',{name:item.name ?? item.id,enable:Boolean(enabled)},'auto_macros')" />
                    </div>
                  </v-list-item>
                </v-list>
                <div v-else class="empty-state">{{ t('instance.emptySection') }}</div>
              </template>

              <template v-else-if="section.key === 'macros'">
                <div v-if="filteredMacroItems(section).length" class="action-grid">
                  <v-btn v-for="item in filteredMacroItems(section)" :key="itemKey(item)" variant="tonal" prepend-icon="mdi-play" @click="command('macro.run',{macro:item.name ?? item.id},'macros')">{{ itemLabel(item) }}</v-btn>
                </div>
                <div v-else class="empty-state">{{ editLayout ? t('instance.chooseMacros') : t('instance.emptySection') }}</div>
              </template>

              <template v-else-if="section.key === 'channel_points'">
                <div v-if="channelPointItems.length" class="channel-point-grid">
                  <v-card v-for="item in channelPointItems" :key="itemKey(item)" variant="tonal" rounded="lg">
                    <v-card-text class="d-flex align-center ga-3">
                      <v-avatar rounded="lg" size="48" :color="item.background || undefined">
                        <v-img v-if="item.image" :src="item.image" cover />
                        <v-icon v-else>mdi-star-circle-outline</v-icon>
                      </v-avatar>
                      <div class="min-w-0 flex-grow-1">
                        <div class="font-weight-medium text-truncate">{{ itemLabel(item) }}</div>
                        <div class="text-caption text-medium-emphasis">{{ item.exists_on_twitch ? 'Twitch' : t('instance.localOnly') }}</div>
                      </div>
                      <v-switch color="primary" hide-details density="compact" :model-value="Boolean(item.active ?? item.twitch_enabled)" @update:model-value="()=>command('channel_point.toggle',{state:'toggle',channel_point:item},'channel_points')" />
                    </v-card-text>
                  </v-card>
                </div>
                <div v-else class="empty-state">{{ t('instance.emptySection') }}</div>
              </template>

              <template v-else-if="section.key === 'rotating_scene'">
                <div class="d-flex align-center ga-2 mb-4">
                  <v-chip variant="tonal" :color="rotatingScene.runtime?.active ? 'success' : undefined">{{ rotatingScene.runtime?.active ? t('instance.active') : t('instance.inactive') }}</v-chip>
                  <v-btn v-if="rotatingScene.runtime?.active" prepend-icon="mdi-stop" color="error" variant="tonal" @click="command('rotating_scene.stop',{},'rotating_scene')">Stop</v-btn>
                </div>
                <div v-if="rotatingSceneItems.length" class="action-grid">
                  <v-btn v-for="item in rotatingSceneItems" :key="itemKey(item)" variant="tonal" prepend-icon="mdi-play" @click="command('rotating_scene.start',{name:item.name ?? item.id},'rotating_scene')">{{ itemLabel(item) }}</v-btn>
                </div>
                <div v-else class="empty-state">{{ t('instance.noRotatingScenes') }}</div>
              </template>

              <template v-else-if="section.key === 'audio'">
                <RemoteAudioControl :audio="sectionData('audio') ?? {}" @command="(method,params)=>command(method,params,'audio')" />
              </template>

              <template v-else-if="section.key === 'obs'">
                <v-select
                  v-if="editLayout"
                  class="mb-4"
                  :model-value="obsConnectionFor(section)"
                  :items="obsConnectionNames"
                  :label="t('instance.obsConnection')"
                  prepend-inner-icon="mdi-connection"
                  variant="outlined" density="comfortable" hide-details
                  @update:model-value="(value)=>setObsConnection(section, String(value ?? ''))"
                />
                <RemoteObsControl :obs="sectionData('obs') ?? {}" :connection="obsConnectionFor(section)" @command="(method,params)=>command(method,params,'obs')" />
              </template>

              <template v-else-if="section.key === 'yolobox'">
                <div class="d-flex flex-wrap ga-2 mb-4">
                  <v-chip variant="tonal" :color="yolobox.connection ? 'success' : undefined">{{ yolobox.connection ? t('common.online') : t('common.offline') }}</v-chip>
                  <v-chip v-if="yolobox.ip" variant="tonal">{{ yolobox.ip }}</v-chip>
                </div>
                <RemoteYoloboxControl :yolobox="yolobox" @command="(method,params)=>command(method,params,'yolobox')" />
              </template>
            </v-card-text>
            </v-card>
          </template>
          <div
            v-if="editLayout"
            class="dashboard-drop-slot dashboard-drop-slot--end"
            :class="{ 'dashboard-drop-slot--active': dropSlot?.column === columnIndex && dropSlot?.index === column.length }"
            @dragenter.prevent="onDragSlot(columnIndex, column.length)"
            @dragover.prevent="onDragSlot(columnIndex, column.length)"
            @drop.stop.prevent="onDropAt(columnIndex, column.length)"
          />
        </div>
      </div>

      <v-card v-else rounded="xl" variant="tonal" class="dashboard-empty">
        <v-card-text class="text-center py-12">
          <v-icon size="48" class="mb-3">mdi-view-dashboard-outline</v-icon>
          <div class="text-h6 mb-2">{{ t('instance.noDashboardCards') }}</div>
          <div class="text-body-2 text-medium-emphasis mb-5">{{ t('instance.noDashboardCardsHint') }}</div>
          <v-menu v-if="hiddenSections.length">
            <template #activator="{ props }">
              <v-btn v-bind="props" prepend-icon="mdi-plus" color="primary" variant="tonal">
                {{ t('instance.addCard') }}
              </v-btn>
            </template>
            <v-list>
              <v-list-item
                v-for="section in hiddenSections"
                :key="section.key"
                :prepend-icon="section.icon"
                :title="t(`sections.${section.key}`)"
                @click="showSection(section.key)"
              />
            </v-list>
          </v-menu>
        </v-card-text>
      </v-card>

      <div v-if="editLayout" class="dashboard-edit-footer">
        <span class="text-caption text-medium-emphasis">{{ t('instance.dragCardsHint') }}</span>
        <v-btn size="small" variant="text" prepend-icon="mdi-restore" @click="resetDashboardLayout">{{ t('instance.resetDashboard') }}</v-btn>
      </div>
    </template>

    <v-dialog v-model="macroSelectorOpen" max-width="620">
      <v-card rounded="xl">
        <v-card-title class="d-flex align-center ga-2"><v-icon>mdi-tune-variant</v-icon>{{ t('instance.selectMacros') }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="macroSearch" :label="t('instance.searchMacros')" prepend-inner-icon="mdi-magnify" variant="outlined" density="comfortable" clearable hide-details class="mb-3" />
          <div class="d-flex ga-2 mb-3">
            <v-btn size="small" variant="tonal" prepend-icon="mdi-checkbox-multiple-marked" @click="selectAllMacros">{{ t('instance.selectAll') }}</v-btn>
            <v-btn size="small" variant="text" prepend-icon="mdi-checkbox-multiple-blank-outline" @click="clearMacroSelection">{{ t('instance.clearSelection') }}</v-btn>
          </div>
          <v-list class="macro-selector-list" bg-color="transparent" density="compact">
            <v-list-item v-for="name in filteredMacroOptions" :key="name" @click="toggleMacroDraft(name)">
              <template #prepend><v-checkbox-btn :model-value="macroDraft.includes(name)" @click.stop @update:model-value="()=>toggleMacroDraft(name)" /></template>
              <v-list-item-title>{{ name }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <span class="text-caption text-medium-emphasis ml-2">{{ t('instance.macrosSelected',{count:macroDraft.length}) }}</span>
          <v-spacer />
          <v-btn variant="text" @click="macroSelectorOpen=false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="tonal" prepend-icon="mdi-check" @click="applyMacroSelection">{{ t('common.save') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageShell from '@/components/PageShell.vue'
import RemoteObsControl from '@/components/remote/RemoteObsControl.vue'
import RemoteAudioControl from '@/components/remote/RemoteAudioControl.vue'
import RemoteYoloboxControl from '@/components/remote/RemoteYoloboxControl.vue'
import { dashboardSections, instanceKey, type DashboardLayoutItem, type DashboardSectionName, useAppStore } from '@/stores/app'
import { useI18n } from '@/i18n'

const StateView = defineComponent({
  props: { value: { type: null, required: false } },
  setup(props) { return () => h('pre', { class: 'state-view' }, JSON.stringify(props.value ?? {}, null, 2)) },
})

const route = useRoute()
const store = useAppStore()
const { t } = useI18n()
const id = computed(() => String(route.params.id ?? ''))
const sectionLoading = ref<DashboardSectionName | null>(null)
const previewFailed = ref(false)

const instance = computed(() => store.instances.find((v:any) => instanceKey(v) === id.value))
const dashboard = computed<any>(() => store.dashboards[id.value] ?? {})
const sectionIcons = {music:'mdi-music',giveaway:'mdi-gift-outline',interactions:'mdi-timer-sand',auto_macros:'mdi-robot-outline',macros:'mdi-gesture-tap-button',channel_points:'mdi-star-circle-outline',rotating_scene:'mdi-camera-switch-outline',audio:'mdi-volume-high',obs:'mdi-video-outline',yolobox:'mdi-monitor-eye'} as Record<DashboardSectionName,string>
const defaultDashboardLayout = dashboardSections.map(key => ({ key, icon: sectionIcons[key], visible: true }))
const dashboardLayout = ref<Array<{ key: DashboardSectionName; icon: string; visible: boolean; column: number; config?: any }>>(defaultDashboardLayout.map((v,index) => ({ ...v, column: index % 3 })))
const editLayout = ref(false)
const draggedSection = ref<DashboardSectionName | null>(null)
const dropSlot = ref<{ column:number; index:number } | null>(null)
const dashboardBoard = ref<HTMLElement | null>(null)
const dashboardColumnCount = ref(3)
let boardResizeObserver: ResizeObserver | null = null
const macroSelectorOpen = ref(false)
const macroSelectorSection = ref<any>(null)
const macroSearch = ref('')
const macroDraft = ref<string[]>([])
const visibleSections = computed(() => dashboardLayout.value.filter(section => section.visible))
const dashboardColumns = computed(() => {
  const count = Math.max(1, dashboardColumnCount.value)
  const columns = Array.from({ length: count }, () => [] as typeof dashboardLayout.value)
  for (const section of visibleSections.value) {
    const column = Math.max(0, Math.min(count - 1, Number(section.column ?? 0)))
    columns[column].push(section)
  }
  return columns
})
const hiddenSections = computed(() => dashboardLayout.value.filter(section => !section.visible))
const instanceName = computed(() => instance.value?.name ?? instance.value?.hostname ?? instance.value?.display_name ?? `${t('common.instance')} ${id.value}`)
const online = computed(() => Boolean(instance.value?.online ?? instance.value?.connected ?? instance.value?.is_connected))
const previewUrl = computed(() => {
  const value = yolobox.value?.preview ?? yolobox.value?.preview_url ?? yolobox.value?.previewUrl ?? ''
  if (typeof value === 'string') return value
  if (value?.data_url) return value.data_url
  if (value?.url) return value.url
  if (value?.base64) {
    const mime = value.mime_type ?? value.mime ?? 'image/jpeg'
    return `data:${mime};base64,${value.base64}`
  }
  return ''
})

const music = computed<any>(() => sectionData('music') ?? {})
const giveaway = computed<any>(() => sectionData('giveaway') ?? {})
const interactionItems = computed(() => toArray(sectionData('interactions')))
const autoMacroItems = computed(() => toArray(sectionData('auto_macros')))
const macroItems = computed(() => objectValues(sectionData('macros')))
const macroOptions = computed(() => macroItems.value.map(item => itemLabel(item)).sort((a,b)=>a.localeCompare(b)))
const filteredMacroOptions = computed(() => { const q=macroSearch.value.trim().toLowerCase(); return q ? macroOptions.value.filter(name => name.toLowerCase().includes(q)) : macroOptions.value })
const channelPointItems = computed(() => {
  const data = sectionData('channel_points')
  if (Array.isArray(data?.all)) return data.all
  if (Array.isArray(data?.active)) return data.active
  return toArray(data)
})
const rotatingScene = computed<any>(() => sectionData('rotating_scene') ?? {})
const rotatingSceneItems = computed(() => objectValues(rotatingScene.value?.items))
const audioInterfaces = computed(() => Object.entries(sectionData('audio')?.data ?? {}).map(([name, data]) => ({ name, data: data as any })))
const audioOutputs = computed(() => toArray(sectionData('audio')?.outputs))
const obsConnections = computed(() => {
  const obs = sectionData('obs') ?? {}
  const names = Array.from(new Set<string>([...(obs.connection_names ?? []), ...Object.keys(obs.scenes ?? {}), ...Object.keys(obs.audio ?? {})]))
  return names.map(name => ({
    name,
    connected: Array.isArray(obs.connected_connections) && obs.connected_connections.includes(name),
    scenes: Array.isArray(obs.scenes?.[name]) ? obs.scenes[name] : [],
  }))
})
const obsConnectionNames = computed(() => obsConnections.value.map(item => item.name))
const yolobox = computed<any>(() => sectionData('yolobox') ?? {})
const musicProgress = computed(() => {
  const direct = Number(music.value?.progress_percentage)
  if (Number.isFinite(direct)) return Math.max(0, Math.min(100, direct))
  const pos = Number(music.value?.position ?? music.value?.progress)
  const duration = Number(music.value?.duration)
  return duration > 0 ? Math.max(0, Math.min(100, pos / duration * 100)) : 0
})

function sectionData(section: DashboardSectionName){ return dashboard.value?.[section] }
function toArray(value:any):any[]{ return Array.isArray(value) ? value : [] }
function objectValues(value:any):any[]{ return value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value).map(([key, entry]:any) => ({ id:key, ...(entry ?? {}) })) : toArray(value) }
function itemKey(item:any){ return String(item?.id ?? item?.uuid ?? item?.name ?? item?.label ?? JSON.stringify(item)) }
function itemLabel(item:any){ return String(item?.label ?? item?.name ?? item?.title ?? item?.display_name ?? item?.sceneName ?? item?.id ?? t('common.item')) }
function formatDuration(value:any){ const ms=Number(value); if(!Number.isFinite(ms) || ms < 0) return '0:00'; const total=Math.floor(ms/1000); return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}` }
function formatSeconds(value:any){ const total=Math.max(0,Math.round(Number(value)||0)); const h=Math.floor(total/3600); const m=Math.floor((total%3600)/60); const sec=total%60; if(h) return `${h}h ${m}m`; if(m) return `${m}m ${sec}s`; return `${sec}s` }
function autoMacroProgress(item:any){ const interval=Number(item?.interval ?? 0); const current=Number(item?.current_interval ?? 0); return interval>0 ? Math.max(0,Math.min(100,(100/interval)*current)) : 0 }

function normalizeDashboardLayout(items: any): Array<{ key: DashboardSectionName; icon: string; visible: boolean; column: number; config?: any }> {
  const raw = Array.isArray(items) ? items : []
  const byKey = new Map(raw.map((item:any) => [String(item?.key), item]))
  const sorted = dashboardSections.map(key => {
    const saved:any = byKey.get(key)
    return {
      key,
      icon: sectionIcons[key],
      visible: saved?.visible !== false,
      config: saved?.config && typeof saved.config === 'object' ? { ...saved.config } : undefined,
      column: Number.isFinite(Number(saved?.column)) ? Math.max(0, Number(saved.column)) : -1,
      order: Number(saved?.order ?? dashboardSections.indexOf(key)),
    }
  }).sort((a,b) => a.order - b.order)
  // v1/v2 layouts had no persistent column. Distribute those cards in stable order.
  let migrateColumn = 0
  return sorted.map(({order,...item}) => ({
    ...item,
    column: item.column >= 0 ? item.column : (migrateColumn++ % 3),
  }))
}
function loadDashboardLayout(){
  const saved = store.userSettings?.dashboard_layouts?.[id.value]
  dashboardLayout.value = normalizeDashboardLayout(saved?.sections)
}
let layoutSaveTimer: ReturnType<typeof setTimeout> | null = null
let layoutSaveGeneration = 0
function serializedDashboardLayout(): DashboardLayoutItem[] {
  let order = 0
  return dashboardColumns.value.flatMap((column,columnIndex) => column.map(item => ({ key:item.key, visible:item.visible, order:order++, column:columnIndex, ...(item.config ? { config:item.config } : {}) }))).concat(
    dashboardLayout.value.filter(item => !item.visible).map(item => ({ key:item.key, visible:false, order:order++, column:item.column ?? 0, ...(item.config ? { config:item.config } : {}) }))
  )
}
function saveDashboardLayout(){
  if (layoutSaveTimer) clearTimeout(layoutSaveTimer)
  const generation = ++layoutSaveGeneration
  layoutSaveTimer = setTimeout(async () => {
    const layouts = { ...(store.userSettings?.dashboard_layouts ?? {}) }
    layouts[id.value] = { version: 3, sections: serializedDashboardLayout() }
    try {
      await store.updateUserSettings({ dashboard_layouts: layouts })
    } catch (error:any) {
      if (generation === layoutSaveGeneration) store.error = error?.message ?? t('settings.saveError')
    }
  }, 250)
}
function layoutItem(sectionOrKey:any){
  const key = typeof sectionOrKey === 'string' ? sectionOrKey : sectionOrKey?.key
  return dashboardLayout.value.find(item => item.key === key)
}
function openMacroSelector(section:any){
  macroSelectorSection.value = section
  macroDraft.value = [...macroSelection(section)]
  macroSearch.value = ''
  macroSelectorOpen.value = true
}
function toggleMacroDraft(name:string){
  const next = new Set(macroDraft.value)
  next.has(name) ? next.delete(name) : next.add(name)
  macroDraft.value = [...next]
}
function selectAllMacros(){ macroDraft.value = [...macroOptions.value] }
function clearMacroSelection(){ macroDraft.value = [] }
function applyMacroSelection(){
  if (macroSelectorSection.value) setMacroSelection(macroSelectorSection.value, macroDraft.value)
  macroSelectorOpen.value = false
}
function macroSelection(section:any): string[]{
  const selected = layoutItem(section)?.config?.macros
  return Array.isArray(selected) ? selected : macroOptions.value
}
function setMacroSelection(section:any, values:any){
  const item:any = layoutItem(section); if(!item) return
  item.config = { ...(item.config ?? {}), macros: Array.isArray(values) ? [...values] : [] }
  saveDashboardLayout()
}
function filteredMacroItems(section:any){
  const selected = layoutItem(section)?.config?.macros
  if (!Array.isArray(selected)) return macroItems.value
  const allowed = new Set(selected.map(String))
  return macroItems.value.filter(item => allowed.has(itemLabel(item)))
}
function obsConnectionFor(section:any): string {
  const configured = String(layoutItem(section)?.config?.obs_connection ?? '')
  if (configured && obsConnectionNames.value.includes(configured)) return configured
  const connected = obsConnections.value.find(item => item.connected)?.name
  return connected ?? obsConnectionNames.value[0] ?? 'default'
}
function setObsConnection(section:any, value:string){
  const item:any = layoutItem(section); if(!item) return
  item.config = { ...(item.config ?? {}), obs_connection: value || undefined }
  saveDashboardLayout()
}
function hideSection(key: DashboardSectionName){
  const section = dashboardLayout.value.find(item => item.key === key)
  if (!section) return
  section.visible = false
  saveDashboardLayout()
}
function showSection(key: DashboardSectionName){
  const section = dashboardLayout.value.find(item => item.key === key)
  if (!section) return
  section.visible = true
  const counts = dashboardColumns.value.map(column => column.length)
  section.column = counts.indexOf(Math.min(...counts))
  saveDashboardLayout()
}
function onDragStart(event: DragEvent, key: DashboardSectionName){
  if (!editLayout.value) { event.preventDefault(); return }
  draggedSection.value = key
  dropSlot.value = null
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', key)
  }
}
function onDragSlot(column:number, index:number){
  if (!draggedSection.value) return
  dropSlot.value = { column, index }
}
function onDropAt(column:number, index:number){
  const sourceKey = draggedSection.value
  if (!sourceKey) return
  const source = dashboardLayout.value.find(item => item.key === sourceKey)
  if (!source) return onDragEnd()

  const count = Math.max(1, dashboardColumnCount.value)
  const targetColumnIndex = Math.max(0, Math.min(count - 1, column))
  const columns = Array.from({ length: count }, (_, col) =>
    (dashboardColumns.value[col] ?? []).filter(item => item.key !== sourceKey)
  )

  // Slot indexes are based on the pre-removal column. If the card came from the
  // same column and was above the selected slot, compensate for its removal.
  const sourceColumnIndex = Math.max(0, Math.min(count - 1, Number(source.column ?? 0)))
  const sourceOriginalIndex = (dashboardColumns.value[sourceColumnIndex] ?? []).findIndex(item => item.key === sourceKey)
  let targetIndex = Math.max(0, Math.min(index, columns[targetColumnIndex].length))
  if (sourceColumnIndex === targetColumnIndex && sourceOriginalIndex >= 0 && sourceOriginalIndex < index) {
    targetIndex = Math.max(0, targetIndex - 1)
  }

  source.column = targetColumnIndex
  columns[targetColumnIndex].splice(targetIndex, 0, source)

  const next = columns.flat()
  for (const hidden of dashboardLayout.value.filter(item => !item.visible)) next.push(hidden)
  dashboardLayout.value = next
  saveDashboardLayout()
  onDragEnd()
}
function onDragEnd(){
  draggedSection.value = null
  dropSlot.value = null
}
function resetDashboardLayout(){
  dashboardLayout.value = defaultDashboardLayout.map((v,index) => ({ ...v, column:index % Math.max(1,dashboardColumnCount.value) }))
  saveDashboardLayout()
}
watch(id, () => loadDashboardLayout())
watch(() => store.userSettings?.dashboard_layouts?.[id.value], () => loadDashboardLayout(), { deep: true })

async function command(method:string, params:any={}, section?:DashboardSectionName){ try{ await store.streamdingCommand(id.value,method,params,section) } catch(e:any){ store.error=e?.message ?? t('instance.actionError') } }
onMounted(() => {
  loadDashboardLayout()
  const updateColumns = () => {
    const width = dashboardBoard.value?.clientWidth ?? window.innerWidth
    dashboardColumnCount.value = width >= 1500 ? 3 : width >= 900 ? 2 : 1
  }
  updateColumns()
  if (typeof ResizeObserver !== 'undefined' && dashboardBoard.value) {
    boardResizeObserver = new ResizeObserver(updateColumns)
    boardResizeObserver.observe(dashboardBoard.value)
  }
  store.openDashboard(id.value).catch((e:any) => { store.error = e?.message ?? t('instance.loadError') })
})
onBeforeUnmount(() => { if (layoutSaveTimer) clearTimeout(layoutSaveTimer); boardResizeObserver?.disconnect(); boardResizeObserver = null; store.closeDashboard(id.value) })
</script>

<style scoped>
.action-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.channel-point-grid,.audio-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.state-view{margin:0;padding:14px;border-radius:10px;background:rgba(255,255,255,.035);overflow:auto;max-height:430px;font-size:.8rem;line-height:1.45}
.preview{background:#090909}
.empty-state{padding:28px;text-align:center;opacity:.65}

/* One layout engine in both normal and edit mode: persistent column stacks. */
.dashboard-board{display:grid;grid-template-columns:repeat(var(--dashboard-columns,1),minmax(0,1fr));gap:24px;align-items:start;width:100%;max-width:none}
.dashboard-column{display:flex;flex-direction:column;gap:22px;min-width:0;min-height:72px}
.dashboard-card{width:100%;min-width:0;overflow:hidden;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.028);transition:border-color .16s ease,transform .16s ease,box-shadow .16s ease,opacity .16s ease}
.dashboard-card__title{display:flex;align-items:center;gap:10px;min-height:58px;border-bottom:1px solid rgba(255,255,255,.055)}
.dashboard-board--editing{padding:16px;border:1px solid rgba(var(--v-theme-primary),.22);border-radius:18px;background-color:rgba(var(--v-theme-primary),.012);background-image:linear-gradient(rgba(var(--v-theme-primary),.04) 1px,transparent 1px),linear-gradient(90deg,rgba(var(--v-theme-primary),.04) 1px,transparent 1px);background-size:24px 24px}
.dashboard-column--editing{gap:0;padding:0 5px 14px;border-radius:12px;outline:1px dashed rgba(var(--v-theme-primary),.12);outline-offset:-1px}
.dashboard-card--editing{border-color:rgba(var(--v-theme-primary),.4);cursor:grab;box-shadow:0 0 0 1px rgba(var(--v-theme-primary),.08)}
.dashboard-card--editing:active{cursor:grabbing}
.dashboard-card--dragging{opacity:.35;transform:scale(.985)}
.dashboard-drop-slot{height:28px;margin:3px 0;border:1px dashed rgba(var(--v-theme-primary),.12);border-radius:8px;background:rgba(var(--v-theme-primary),.018);transition:height .12s ease,border-color .12s ease,background .12s ease}
.dashboard-drop-slot--active{height:52px;border-color:rgb(var(--v-theme-primary));background:rgba(var(--v-theme-primary),.13)}
.dashboard-drop-slot--end{min-height:42px;flex:0 0 auto}
.dashboard-card__edit-actions{display:flex;align-items:center;gap:2px}
.dashboard-drag-handle{cursor:grab;opacity:.75}
.dashboard-edit-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:14px;padding:8px 4px}
.dashboard-empty{border:1px dashed rgba(255,255,255,.12)}
.auto-macro-list{padding:0}
.auto-macro-item{position:relative;overflow:hidden;border-radius:10px;margin:4px 0}
.auto-macro-item__progress{position:absolute;inset:0 auto 0 0;background:rgba(var(--v-theme-primary),.12);pointer-events:none;transition:width .25s linear}
.auto-macro-item__content{position:relative;z-index:1;display:flex;align-items:center;gap:12px;width:100%;min-width:0;box-sizing:border-box;padding:6px 8px 6px 0}
.auto-macro-switch{flex:0 0 auto;margin-right:2px}
.auto-macro-item :deep(.v-list-item__content){min-width:0;overflow:visible}
.macro-selector-list{max-height:460px;overflow:auto;border:1px solid rgba(255,255,255,.07);border-radius:12px}
.music-card{max-width:820px;margin:0 auto;padding:8px 4px 4px}
.music-meta{display:flex;align-items:center;gap:16px}
.music-art{width:72px;height:72px;display:flex;align-items:center;justify-content:center;border-radius:16px;overflow:hidden;background:rgba(255,255,255,.06)}
.music-controls{display:flex;align-items:center;justify-content:center;gap:10px}
.music-play{width:64px!important;height:64px!important}
.music-volume{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px}
.music-stats{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 18px;font-size:.8rem;opacity:.7}
.music-progress-slider :deep(.v-slider-thumb){display:none}
.music-progress-slider :deep(.v-slider-track__background){opacity:.2}

</style>
