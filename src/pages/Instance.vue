<template>
  <PageShell :title="instanceName" wide compact-header>
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
      <v-menu v-if="hiddenSections.length || addableObsCards.length">
        <template #activator="{ props }">
          <v-btn v-bind="props" prepend-icon="mdi-plus" variant="text">
            {{ t('instance.addCard') }}
          </v-btn>
        </template>
        <v-list density="comfortable">
          <v-list-item
            v-for="section in hiddenSections"
            :key="section.id"
            :prepend-icon="section.icon"
            :title="t(`sections.${section.key}`)"
            @click="showSection(section.id)"
          />
          <v-divider v-if="hiddenSections.length && addableObsCards.length" />
          <v-list-subheader v-if="addableObsCards.length">OBS</v-list-subheader>
          <v-list-item
            v-for="card in addableObsCards"
            :key="`obs-add-${card.panel}-${card.connection}`"
            :prepend-icon="card.icon"
            :title="`${card.title} · ${card.connection}`"
            @click="addObsCard(card.connection, card.panel)"
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
          <template v-for="(section, sectionIndex) in column" :key="section.id">
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
              :class="{ 'dashboard-card--editing': editLayout, 'dashboard-card--dragging': draggedSection === section.id }"
              :draggable="editLayout"
              @dragstart="onDragStart($event, section.id)"
              @dragend="onDragEnd"
            >
          <v-card-title class="dashboard-card__title">
            <div class="d-flex align-center ga-2 min-w-0">
              <v-icon>{{ section.icon }}</v-icon>
              <span class="text-truncate">{{ section.key === 'obs' ? obsCardTitle(section) : t(`sections.${section.key}`) }}</span>
              <v-chip v-if="section.key === 'obs' && obsConnectionFor(section)" size="x-small" variant="tonal" prepend-icon="mdi-connection">{{ obsConnectionFor(section) }}</v-chip>
            </div>
            <v-spacer />
            <div v-if="editLayout" class="dashboard-card__edit-actions">
              <v-btn v-if="section.key === 'macros'" icon="mdi-tune-variant" size="x-small" variant="text" :title="t('instance.selectMacros')" @click.stop="openMacroSelector(section)" />
              <v-icon class="dashboard-drag-handle" :title="t('instance.moveCard')">mdi-drag</v-icon>
              <v-btn icon="mdi-close" size="x-small" variant="text" :title="t('instance.removeCard')" @click.stop="hideSection(section.id)" />
            </div>
          </v-card-title>
            <v-card-text
              :class="{ 'dashboard-card__content--offline': !online }"
              :inert="!online || undefined"
              :aria-disabled="!online ? 'true' : undefined"
            >
              <template v-if="section.key === 'music'">
                <MusicCard :music="music" @command="(method,params)=>command(method,params,'music')" />
              </template>

              <template v-else-if="section.key === 'giveaway'">
                <GiveawayCard :giveaway="giveaway" />
              </template>

              <template v-else-if="section.key === 'interactions'">
                <InteractionsCard :items="interactionItems" @command="(method,params)=>command(method,params,'interactions')" />
              </template>

              <template v-else-if="section.key === 'auto_macros'">
                <AutoMacrosCard :items="autoMacroItems" @command="(method,params)=>command(method,params,'auto_macros')" />
              </template>

              <template v-else-if="section.key === 'macros'">
                <MacrosCard :items="filteredMacroItems(section)" :edit-layout="editLayout" @command="(method,params)=>command(method,params,'macros')" />
              </template>

              <template v-else-if="section.key === 'channel_points'">
                <ChannelPointsCard :items="channelPointItems" @command="(method,params)=>command(method,params,'channel_points')" />
              </template>

              <template v-else-if="section.key === 'rotating_scene'">
                <RotatingSceneCard :rotating-scene="rotatingScene" :items="rotatingSceneItems" @command="(method,params)=>command(method,params,'rotating_scene')" />
              </template>

              <template v-else-if="section.key === 'audio'">
                <AudioCard :audio="sectionData('audio') ?? {}" @command="(method,params)=>command(method,params,'audio')" @method="(method,params)=>nativeMethod(method,params,'audio')" />
              </template>

              <template v-else-if="section.key === 'obs'">
                <ObsAudioMixerCard
                  v-if="obsPanelFor(section) === 'audio'"
                  :obs="sectionData('obs') ?? {}"
                  :connection="obsConnectionFor(section)"
                  :connection-options="obsConnectionOptions(section)"
                  :edit-layout="editLayout"
                  @update:connection="(value)=>setObsConnection(section, value)"
                  @command="(method,params)=>command(method,params,'obs')"
                />
                <ObsScenesCard
                  v-else
                  :obs="sectionData('obs') ?? {}"
                  :connection="obsConnectionFor(section)"
                  :connection-options="obsConnectionOptions(section)"
                  :edit-layout="editLayout"
                  @update:connection="(value)=>setObsConnection(section, value)"
                  @command="(method,params)=>command(method,params,'obs')"
                />
              </template>

              <template v-else-if="section.key === 'yolobox'">
                <YoloboxCard :yolobox="yolobox" @command="(method,params)=>command(method,params,'yolobox')" />
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
          <v-menu v-if="hiddenSections.length || addableObsCards.length">
            <template #activator="{ props }">
              <v-btn v-bind="props" prepend-icon="mdi-plus" color="primary" variant="tonal">
                {{ t('instance.addCard') }}
              </v-btn>
            </template>
            <v-list>
              <v-list-item
                v-for="section in hiddenSections"
                :key="section.id"
                :prepend-icon="section.icon"
                :title="t(`sections.${section.key}`)"
                @click="showSection(section.id)"
              />
              <v-divider v-if="hiddenSections.length && addableObsCards.length" />
              <v-list-subheader v-if="addableObsCards.length">OBS</v-list-subheader>
              <v-list-item
                v-for="card in addableObsCards"
                :key="`obs-empty-add-${card.panel}-${card.connection}`"
                :prepend-icon="card.icon"
                :title="`${card.title} · ${card.connection}`"
                @click="addObsCard(card.connection, card.panel)"
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import PageShell from '@/components/PageShell.vue'
import ObsScenesCard from '@/components/dashboard/ObsScenesCard.vue'
import ObsAudioMixerCard from '@/components/dashboard/ObsAudioMixerCard.vue'
import MusicCard from '@/components/dashboard/MusicCard.vue'
import GiveawayCard from '@/components/dashboard/GiveawayCard.vue'
import InteractionsCard from '@/components/dashboard/InteractionsCard.vue'
import AutoMacrosCard from '@/components/dashboard/AutoMacrosCard.vue'
import MacrosCard from '@/components/dashboard/MacrosCard.vue'
import ChannelPointsCard from '@/components/dashboard/ChannelPointsCard.vue'
import RotatingSceneCard from '@/components/dashboard/RotatingSceneCard.vue'
import AudioCard from '@/components/dashboard/AudioCard.vue'
import YoloboxCard from '@/components/dashboard/YoloboxCard.vue'
import { dashboardSections, instanceKey, type DashboardLayoutItem, type DashboardSectionName, useAppStore } from '@/stores/app'
import { useI18n } from '@/i18n'

const route = useRoute()
const store = useAppStore()
const { t } = useI18n()
const id = computed(() => String(route.params.id ?? ''))

const instance = computed(() => store.instances.find((v:any) => instanceKey(v) === id.value))
const dashboard = computed<any>(() => store.dashboards[id.value] ?? {})
const sectionIcons = {music:'mdi-music',giveaway:'mdi-gift-outline',interactions:'mdi-timer-sand',auto_macros:'mdi-robot-outline',macros:'mdi-gesture-tap-button',channel_points:'mdi-star-circle-outline',rotating_scene:'mdi-camera-switch-outline',audio:'mdi-volume-high',obs:'mdi-video-outline',yolobox:'mdi-monitor-eye'} as Record<DashboardSectionName,string>
type DashboardCard = {
  id: string
  key: DashboardSectionName
  icon: string
  visible: boolean
  column: number
  config?: any
}

const defaultDashboardLayout: DashboardCard[] = dashboardSections.map((key,index) => ({
  id: key,
  key,
  icon: sectionIcons[key],
  visible: true,
  column: index % 3,
}))
const dashboardLayout = ref<DashboardCard[]>(defaultDashboardLayout.map(item => ({ ...item, config: item.config ? { ...item.config } : undefined })))
const editLayout = ref(false)
const draggedSection = ref<string | null>(null)
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
const hiddenSections = computed(() => dashboardLayout.value.filter(section => section.key !== 'obs' && !section.visible))
const instanceName = computed(() => instance.value?.name ?? instance.value?.hostname ?? instance.value?.display_name ?? `${t('common.instance')} ${id.value}`)
const online = computed(() => Boolean(instance.value?.online ?? instance.value?.connected ?? instance.value?.is_connected))
const music = computed<any>(() => sectionData('music') ?? {})
const giveaway = computed<any>(() => sectionData('giveaway') ?? {})
const interactionItems = computed(() => toArray(sectionData('interactions')))
const autoMacroItems = computed(() => toArray(sectionData('auto_macros')))
const hiddenMacroPrefixes = ['channel_point_', 'command_', 'event_'] as const
const macroItems = computed(() => objectValues(sectionData('macros')).filter(item => {
  const name = itemLabel(item).trim().toLowerCase()
  return !hiddenMacroPrefixes.some(prefix => name.startsWith(prefix))
}))
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
type ObsPanelMode = 'scenes' | 'audio'
const addableObsCards = computed(() => {
  const visible = new Set(
    dashboardLayout.value
      .filter(item => item.key === 'obs' && item.visible)
      .map(item => `${obsConnectionFor(item)}:${obsPanelFor(item)}`)
  )
  return obsConnectionNames.value.flatMap(connection => ([
    { connection, panel: 'scenes' as ObsPanelMode, title: String(t('instance.obsScenes')), icon: 'mdi-view-dashboard-outline' },
    { connection, panel: 'audio' as ObsPanelMode, title: String(t('instance.obsAudioMixer')), icon: 'mdi-tune-vertical' },
  ])).filter(card => !visible.has(`${card.connection}:${card.panel}`))
})
const yolobox = computed<any>(() => sectionData('yolobox') ?? {})
function sectionData(section: DashboardSectionName){ return dashboard.value?.[section] }
function toArray(value:any):any[]{ return Array.isArray(value) ? value : [] }
function objectValues(value:any):any[]{ return value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value).map(([key, entry]:any) => ({ id:key, ...(entry ?? {}) })) : toArray(value) }
function itemLabel(item:any){ return String(item?.label ?? item?.name ?? item?.title ?? item?.display_name ?? item?.sceneName ?? item?.id ?? t('common.item')) }
function uniqueCardId(base:string, used:Set<string>): string {
  let id = base || 'card'
  let suffix = 2
  while (used.has(id)) id = `${base}-${suffix++}`
  used.add(id)
  return id
}

function normalizeDashboardLayout(items: any): DashboardCard[] {
  const raw = Array.isArray(items) ? [...items] : []
  const usedIds = new Set<string>()
  const result: Array<DashboardCard & { order:number }> = []

  // All non-OBS sections remain singletons.
  for (const key of dashboardSections.filter(key => key !== 'obs')) {
    const saved:any = raw.find((item:any) => String(item?.key) === key)
    result.push({
      id: uniqueCardId(String(saved?.id ?? key), usedIds),
      key,
      icon: sectionIcons[key],
      visible: saved?.visible !== false,
      config: saved?.config && typeof saved.config === 'object' ? { ...saved.config } : undefined,
      column: Number.isFinite(Number(saved?.column)) ? Math.max(0, Number(saved.column)) : -1,
      order: Number(saved?.order ?? dashboardSections.indexOf(key)),
    })
  }

  // OBS cards are repeatable and split by panel type (Scenes / Audio Mixer).
  // v4 and older had one combined OBS card, so migrate each saved card into two cards.
  const savedObs = raw.filter((item:any) => String(item?.key) === 'obs')
  if (savedObs.length) {
    savedObs.forEach((saved:any, index:number) => {
      const connection = String(saved?.config?.obs_connection ?? '').trim()
      const configuredPanel = String(saved?.config?.obs_panel ?? '')
      const panels: ObsPanelMode[] = configuredPanel === 'audio' || configuredPanel === 'scenes'
        ? [configuredPanel as ObsPanelMode]
        : ['scenes', 'audio']
      panels.forEach((panel, panelIndex) => {
        const baseId = String(
          configuredPanel
            ? (saved?.id ?? `obs:${panel}:${connection || index + 1}`)
            : `obs:${panel}:${connection || index + 1}`
        )
        result.push({
          id: uniqueCardId(baseId, usedIds),
          key: 'obs',
          icon: panel === 'audio' ? 'mdi-tune-vertical' : 'mdi-view-dashboard-outline',
          visible: saved?.visible !== false,
          config: {
            ...(saved?.config && typeof saved.config === 'object' ? saved.config : {}),
            obs_connection: connection || undefined,
            obs_panel: panel,
          },
          column: Number.isFinite(Number(saved?.column)) ? Math.max(0, Number(saved.column)) : -1,
          order: Number(saved?.order ?? dashboardSections.indexOf('obs') + index / 10) + panelIndex / 100,
        })
      })
    })
  } else {
    ;(['scenes', 'audio'] as ObsPanelMode[]).forEach((panel, index) => {
      result.push({
        id: uniqueCardId(`obs:${panel}`, usedIds),
        key: 'obs',
        icon: panel === 'audio' ? 'mdi-tune-vertical' : 'mdi-view-dashboard-outline',
        visible: true,
        column: -1,
        order: dashboardSections.indexOf('obs') + index / 100,
        config: { obs_panel: panel },
      })
    })
  }

  result.sort((a,b) => a.order - b.order)

  // v1/v2 layouts had no persistent column. Distribute those cards in stable order.
  let migrateColumn = 0
  return result.map(({order,...item}) => ({
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
  return dashboardColumns.value.flatMap((column,columnIndex) => column.map(item => ({
    id:item.id,
    key:item.key,
    visible:item.visible,
    order:order++,
    column:columnIndex,
    ...(item.config ? { config:item.config } : {}),
  }))).concat(
    dashboardLayout.value.filter(item => !item.visible).map(item => ({
      id:item.id,
      key:item.key,
      visible:false,
      order:order++,
      column:item.column ?? 0,
      ...(item.config ? { config:item.config } : {}),
    }))
  )
}
function saveDashboardLayout(){
  if (layoutSaveTimer) clearTimeout(layoutSaveTimer)
  const generation = ++layoutSaveGeneration
  layoutSaveTimer = setTimeout(async () => {
    const layouts = { ...(store.userSettings?.dashboard_layouts ?? {}) }
    layouts[id.value] = { version: 5, sections: serializedDashboardLayout() }
    try {
      await store.updateUserSettings({ dashboard_layouts: layouts })
    } catch (error:any) {
      if (generation === layoutSaveGeneration) store.error = error?.message ?? t('settings.saveError')
    }
  }, 250)
}
function layoutItem(sectionOrId:any){
  if (sectionOrId && typeof sectionOrId === 'object') {
    const cardId = String(sectionOrId.id ?? '')
    if (cardId) return dashboardLayout.value.find(item => item.id === cardId)
  }
  const value = String(sectionOrId ?? '')
  return dashboardLayout.value.find(item => item.id === value)
    ?? dashboardLayout.value.find(item => item.key === value)
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
  if (!Array.isArray(selected)) return macroOptions.value
  const available = new Set(macroOptions.value)
  return selected.map(String).filter(name => available.has(name))
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
function obsPanelFor(section:any): ObsPanelMode {
  return String(layoutItem(section)?.config?.obs_panel ?? 'scenes') === 'audio' ? 'audio' : 'scenes'
}
function obsCardTitle(section:any): string {
  return obsPanelFor(section) === 'audio' ? String(t('instance.obsAudioMixer')) : String(t('instance.obsScenes'))
}
function obsConnectionFor(section:any): string {
  const configured = String(layoutItem(section)?.config?.obs_connection ?? '')
  if (configured && obsConnectionNames.value.includes(configured)) return configured
  const connected = obsConnections.value.find(item => item.connected)?.name
  return connected ?? obsConnectionNames.value[0] ?? 'default'
}
function obsConnectionOptions(section:any): string[]{
  const current = obsConnectionFor(section)
  const used = new Set(
    dashboardLayout.value
      .filter(item => item.key === 'obs' && item.visible && item.id !== section?.id && obsPanelFor(item) === obsPanelFor(section))
      .map(item => obsConnectionFor(item))
      .filter(Boolean)
  )
  return obsConnectionNames.value.filter(name => name === current || !used.has(name))
}
function setObsConnection(section:any, value:string){
  const item:any = layoutItem(section); if(!item) return
  item.config = { ...(item.config ?? {}), obs_connection: value || undefined }
  saveDashboardLayout()
}
function shortestDashboardColumn(): number {
  const counts = dashboardColumns.value.map(column => column.length)
  return counts.indexOf(Math.min(...counts))
}

function hideSection(cardId: string){
  const section = dashboardLayout.value.find(item => item.id === cardId)
  if (!section) return
  section.visible = false
  saveDashboardLayout()
}

function showSection(cardId: string){
  const section = dashboardLayout.value.find(item => item.id === cardId)
  if (!section) return
  section.visible = true
  section.column = shortestDashboardColumn()
  saveDashboardLayout()
}

function addObsCard(connection:string, panel:ObsPanelMode){
  const existing = dashboardLayout.value.find(item =>
    item.key === 'obs'
      && String(item.config?.obs_connection ?? '') === connection
      && obsPanelFor(item) === panel
  )
  if (existing) {
    existing.visible = true
    existing.column = shortestDashboardColumn()
    saveDashboardLayout()
    return
  }

  const used = new Set(dashboardLayout.value.map(item => item.id))
  dashboardLayout.value.push({
    id: uniqueCardId(`obs:${panel}:${connection}`, used),
    key: 'obs',
    icon: panel === 'audio' ? 'mdi-tune-vertical' : 'mdi-view-dashboard-outline',
    visible: true,
    column: shortestDashboardColumn(),
    config: { obs_connection: connection, obs_panel: panel },
  })
  saveDashboardLayout()
}

function onDragStart(event: DragEvent, cardId: string){
  if (!editLayout.value) { event.preventDefault(); return }
  draggedSection.value = cardId
  dropSlot.value = null
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', cardId)
  }
}
function onDragSlot(column:number, index:number){
  if (!draggedSection.value) return
  dropSlot.value = { column, index }
}
function onDropAt(column:number, index:number){
  const sourceId = draggedSection.value
  if (!sourceId) return
  const source = dashboardLayout.value.find(item => item.id === sourceId)
  if (!source) return onDragEnd()

  const count = Math.max(1, dashboardColumnCount.value)
  const targetColumnIndex = Math.max(0, Math.min(count - 1, column))
  const columns = Array.from({ length: count }, (_, col) =>
    (dashboardColumns.value[col] ?? []).filter(item => item.id !== sourceId)
  )

  const sourceColumnIndex = Math.max(0, Math.min(count - 1, Number(source.column ?? 0)))
  const sourceOriginalIndex = (dashboardColumns.value[sourceColumnIndex] ?? []).findIndex(item => item.id === sourceId)
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
  dashboardLayout.value = normalizeDashboardLayout([]).map((item,index) => ({
    ...item,
    config: item.config ? { ...item.config } : undefined,
    column:index % Math.max(1,dashboardColumnCount.value),
  }))
  saveDashboardLayout()
}
watch(id, (newId, oldId) => {
  if (oldId && oldId !== newId) store.closeDashboard(oldId)
  loadDashboardLayout()
  if (newId && oldId && oldId !== newId) {
    store.openDashboard(newId).catch((e:any) => { store.error = e?.message ?? t('instance.loadError') })
  }
})
watch(() => store.userSettings?.dashboard_layouts?.[id.value], () => loadDashboardLayout(), { deep: true })

async function command(method:string, params:any={}, section?:DashboardSectionName){
  if (!online.value) return
  try{ await store.streamdingCommand(id.value,method,params,section) } catch(e:any){ store.error=e?.message ?? t('instance.actionError') }
}
async function nativeMethod(method:string, params:any={}, section?:DashboardSectionName){
  if (!online.value) return
  try{ await store.streamdingMethod(id.value,method,params,section) } catch(e:any){ store.error=e?.message ?? t('instance.actionError') }
}
function updateDashboardColumns(){
  const width = dashboardBoard.value?.getBoundingClientRect().width || window.innerWidth
  dashboardColumnCount.value = width >= 1500 ? 3 : width >= 900 ? 2 : 1
}
function attachDashboardResizeObserver(element: HTMLElement | null){
  boardResizeObserver?.disconnect()
  boardResizeObserver = null
  if (element && typeof ResizeObserver !== 'undefined') {
    boardResizeObserver = new ResizeObserver(() => updateDashboardColumns())
    boardResizeObserver.observe(element)
  }
  updateDashboardColumns()
}
watch(dashboardBoard, element => attachDashboardResizeObserver(element), { flush: 'post' })
const onWindowResize = () => updateDashboardColumns()

onMounted(() => {
  loadDashboardLayout()
  updateDashboardColumns()
  if (typeof window !== 'undefined') window.addEventListener('resize', onWindowResize, { passive: true })
  store.openDashboard(id.value).catch((e:any) => { store.error = e?.message ?? t('instance.loadError') })
})
const closeInstanceDashboardSocket = () => {
  store.closeDashboard(id.value)
}

onBeforeRouteLeave(() => {
  closeInstanceDashboardSocket()
})

const onPageHide = () => closeInstanceDashboardSocket()
if (typeof window !== 'undefined') window.addEventListener('pagehide', onPageHide)

onBeforeUnmount(() => {
  if (layoutSaveTimer) clearTimeout(layoutSaveTimer)
  boardResizeObserver?.disconnect()
  boardResizeObserver = null
  if (typeof window !== 'undefined') {
    window.removeEventListener('pagehide', onPageHide)
    window.removeEventListener('resize', onWindowResize)
  }
  closeInstanceDashboardSocket()
})
</script>

