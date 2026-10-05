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
                <div v-if="interactionItems.length" class="interaction-list">
                  <div
                    v-for="item in interactionItems"
                    :key="itemKey(item)"
                    class="interaction-item"
                    :class="`interaction-item--${interactionState(item)}`"
                  >
                    <div class="interaction-item__icon">
                      <v-icon :icon="interactionSourceIcon(item)" size="22" />
                    </div>

                    <div class="interaction-item__body">
                      <div class="interaction-item__headline">
                        <span class="font-weight-bold">{{ interactionDisplayName(item) }}</span>
                        <v-chip
                          v-if="interactionState(item) !== 'active'"
                          size="x-small"
                          variant="tonal"
                          :color="interactionStateColor(item)"
                          :prepend-icon="interactionStateIcon(item)"
                        >
                          {{ interactionStateLabel(item) }}
                        </v-chip>
                      </div>

                      <div class="interaction-item__meta">
                        <span>
                          <v-icon :icon="interactionSourceIcon(item)" size="16" />
                          {{ interactionSourceLabel(item) }}
                        </span>
                        <span v-if="Number(item.duration ?? 0) > 0">
                          <v-icon icon="mdi-timer-outline" size="16" />
                          {{ t('instance.interactionDuration',{duration:formatSeconds(item.duration)}) }}
                        </span>
                        <span v-if="Number(item.eta_seconds ?? 0) > 0">
                          <v-icon icon="mdi-clock-fast" size="16" />
                          {{ t('instance.interactionEta',{duration:formatSeconds(item.eta_seconds)}) }}
                        </span>
                        <span v-else-if="interactionState(item) === 'active'">
                          <v-icon icon="mdi-progress-clock" size="16" />
                          {{ t('instance.interactionPleaseWait') }}
                        </span>
                        <span v-if="Number(item.alert_count ?? 0) > 0">
                          <v-icon icon="mdi-bell-outline" size="16" />
                          {{ t('instance.interactionAlerts',{count:Number(item.alert_count)}) }}
                        </span>
                      </div>

                      <v-progress-linear
                        v-if="interactionState(item) === 'active' && Number(item.duration ?? 0) > 0"
                        class="interaction-item__progress"
                        :model-value="interactionProgress(item)"
                        color="white"
                        bg-color="rgba(255,255,255,.22)"
                        rounded
                        height="4"
                      />

                      <div v-if="item.error" class="interaction-item__error">
                        <v-icon icon="mdi-alert-circle-outline" size="16" />
                        {{ item.error }}
                      </div>
                    </div>

                    <v-btn
                      class="interaction-item__remove"
                      icon="mdi-close"
                      :variant="interactionState(item) === 'active' ? 'tonal' : 'text'"
                      :color="interactionState(item) === 'active' ? 'white' : 'error'"
                      size="small"
                      :title="t('instance.interactionCancel')"
                      @click.stop="command('interaction.remove',{uuid:item.uuid ?? item.id},'interactions')"
                    />
                  </div>
                </div>
                <div v-else class="interaction-empty">
                  <v-icon icon="mdi-check-circle-outline" size="22" />
                  <span>{{ t('instance.noInteractions') }}</span>
                </div>
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
                <div v-if="filteredMacroItems(section).length" class="macro-grid">
                  <button
                    v-for="item in filteredMacroItems(section)"
                    :key="itemKey(item)"
                    type="button"
                    class="macro-tile"
                    :title="itemLabel(item)"
                    @click="command('macro.run',{macro:item.name ?? item.id},'macros')"
                  >
                    <span class="macro-tile__icon"><v-icon size="18">mdi-play</v-icon></span>
                    <span class="macro-tile__label">{{ itemLabel(item) }}</span>
                    <v-icon class="macro-tile__launch" size="16">mdi-chevron-right</v-icon>
                  </button>
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
                <RemoteAudioControl :audio="sectionData('audio') ?? {}" @command="(method,params)=>command(method,params,'audio')" @method="(method,params)=>nativeMethod(method,params,'audio')" />
              </template>

              <template v-else-if="section.key === 'obs'">
                <v-select
                  v-if="editLayout"
                  class="mb-4"
                  :model-value="obsConnectionFor(section)"
                  :items="obsConnectionOptions(section)"
                  :label="t('instance.obsConnection')"
                  prepend-inner-icon="mdi-connection"
                  variant="outlined" density="comfortable" hide-details
                  @update:model-value="(value)=>setObsConnection(section, String(value ?? ''))"
                />
                <RemoteObsControl :obs="sectionData('obs') ?? {}" :connection="obsConnectionFor(section)" :mode="obsPanelFor(section)" @command="(method,params)=>command(method,params,'obs')" />
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
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
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

function interactionState(item:any): string {
  return String(item?.state ?? item?.status ?? 'queued').toLowerCase()
}
function interactionSource(item:any): string {
  return String(item?.source ?? item?.type ?? 'other').toLowerCase()
}
function interactionDisplayName(item:any): string {
  const name = itemLabel(item).trim()
  const source = interactionSource(item)
  const prefixes:Record<string,string> = {
    channel_point: String(t('instance.interactionChannelPoint')),
    command: String(t('instance.interactionCommand')),
    event: String(t('instance.interactionEvent')),
  }
  const prefix = prefixes[source]
  if (!prefix) return name
  const normalized = name.toLowerCase()
  if (normalized.startsWith(`${prefix.toLowerCase()}:`)) return name
  return `${prefix}: ${name}`
}
function interactionSourceIcon(item:any): string {
  const icons:Record<string,string> = { command:'mdi-console-line', event:'mdi-lightning-bolt', channel_point:'mdi-star-circle', api:'mdi-api', other:'mdi-play-circle-outline' }
  return icons[interactionSource(item)] ?? icons.other
}
function interactionStateIcon(item:any): string {
  const icons:Record<string,string> = { queued:'mdi-clock-outline', active:'mdi-play-circle', finished:'mdi-check-circle', cancelled:'mdi-cancel', failed:'mdi-alert-circle' }
  return icons[interactionState(item)] ?? 'mdi-help-circle-outline'
}
function interactionStateColor(item:any): string {
  const state=interactionState(item)
  if (state === 'active' || state === 'finished') return 'success'
  if (state === 'failed') return 'error'
  if (state === 'cancelled') return 'warning'
  return 'grey'
}
function interactionStateLabel(item:any): string {
  const labels:Record<string,string> = { queued:t('instance.interactionQueued'), active:t('instance.interactionActive'), finished:t('instance.interactionFinished'), cancelled:t('instance.interactionCancelled'), failed:t('instance.interactionFailed') }
  return labels[interactionState(item)] ?? interactionState(item)
}
function interactionSourceLabel(item:any): string {
  const labels:Record<string,string> = { command:t('instance.interactionCommand'), event:t('instance.interactionEvent'), channel_point:t('instance.interactionChannelPoint'), api:'API', other:t('instance.interactionOther') }
  return labels[interactionSource(item)] ?? labels.other
}
function interactionProgress(item:any): number {
  const duration=Number(item?.duration ?? 0)
  const eta=Number(item?.eta_seconds ?? 0)
  if (interactionState(item) !== 'active' || duration <= 0) return 0
  return Math.max(0,Math.min(100,((duration-eta)/duration)*100))
}

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

<style scoped>
.action-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.macro-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px}
.macro-tile{appearance:none;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.055);color:inherit;border-radius:10px;min-width:0;min-height:46px;padding:7px 10px 7px 8px;display:grid;grid-template-columns:30px minmax(0,1fr) 18px;align-items:center;gap:8px;text-align:left;cursor:pointer;transition:background .14s ease,border-color .14s ease,transform .08s ease}
.macro-tile:hover{background:rgba(var(--v-theme-primary),.10);border-color:rgba(var(--v-theme-primary),.28)}
.macro-tile:active{transform:translateY(1px)}
.macro-tile:focus-visible{outline:2px solid rgb(var(--v-theme-primary));outline-offset:2px}
.macro-tile__icon{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(var(--v-theme-primary),.12);color:rgb(var(--v-theme-primary))}
.macro-tile__label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.88rem;font-weight:500}
.macro-tile__launch{opacity:.38;transition:opacity .14s ease,transform .14s ease}
.macro-tile:hover .macro-tile__launch{opacity:.85;transform:translateX(2px)}
@media (min-width:1500px){.macro-grid{grid-template-columns:repeat(auto-fill,minmax(210px,1fr))}}
.channel-point-grid,.audio-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.state-view{margin:0;padding:14px;border-radius:10px;background:rgba(255,255,255,.035);overflow:auto;max-height:430px;font-size:.8rem;line-height:1.45}
.preview{background:#090909}
.empty-state{padding:28px;text-align:center;opacity:.65}


.interaction-list{display:flex;flex-direction:column;gap:9px}
.interaction-item{display:flex;align-items:center;gap:14px;min-height:76px;padding:14px 14px 14px 16px;border-radius:8px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.075);color:rgba(255,255,255,.94);overflow:hidden;position:relative;transition:background .15s ease,border-color .15s ease}
.interaction-item--queued{background:rgba(255,255,255,.055);border-color:rgba(255,255,255,.09)}
.interaction-item--active{background:rgb(46,125,50);border-color:rgba(255,255,255,.08);color:#fff}
.interaction-item--finished{background:rgba(46,125,50,.10);border-color:rgba(76,175,80,.25)}
.interaction-item--failed{background:rgba(var(--v-theme-error),.08);border-color:rgba(var(--v-theme-error),.28)}
.interaction-item--cancelled{background:rgba(var(--v-theme-warning),.07);border-color:rgba(var(--v-theme-warning),.24)}
.interaction-item__icon{display:flex;align-items:center;justify-content:center;width:40px;height:40px;flex:0 0 40px;border-radius:50%;background:rgba(255,255,255,.075);color:rgba(255,255,255,.88)}
.interaction-item--active .interaction-item__icon{background:rgba(0,0,0,.18);color:#fff}
.interaction-item--failed .interaction-item__icon{color:rgb(var(--v-theme-error));background:rgba(var(--v-theme-error),.10)}
.interaction-item--cancelled .interaction-item__icon{color:rgb(var(--v-theme-warning));background:rgba(var(--v-theme-warning),.10)}
.interaction-item__body{min-width:0;flex:1}
.interaction-item__headline{display:flex;align-items:center;gap:8px;flex-wrap:wrap;line-height:1.25}
.interaction-item__meta{display:flex;align-items:center;flex-wrap:wrap;gap:4px 14px;margin-top:5px;font-size:.82rem;color:rgba(255,255,255,.58)}
.interaction-item--active .interaction-item__meta{color:rgba(255,255,255,.82)}
.interaction-item__meta>span{display:inline-flex;align-items:center;gap:4px}
.interaction-item__progress{margin-top:9px}
.interaction-item__error{display:flex;align-items:center;gap:5px;margin-top:7px;font-size:.8rem;color:rgb(var(--v-theme-error))}
.interaction-item--active .interaction-item__error{color:#fff}
.interaction-item__remove{flex:0 0 auto;opacity:.8}
.interaction-item__remove:hover{opacity:1}
.interaction-empty{display:flex;align-items:center;gap:10px;padding:20px;border-radius:8px;background:rgba(255,255,255,.035);border:1px dashed rgba(255,255,255,.08);color:rgba(255,255,255,.55)}

/* One layout engine in both normal and edit mode: persistent column stacks. */
.dashboard-board{display:grid;grid-template-columns:repeat(var(--dashboard-columns,1),minmax(0,1fr));gap:24px;align-items:start;width:100%;max-width:none}
.dashboard-column{display:flex;flex-direction:column;gap:22px;min-width:0;min-height:72px}
.dashboard-card{width:100%;min-width:0;overflow:hidden;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.028);transition:border-color .16s ease,transform .16s ease,box-shadow .16s ease,opacity .16s ease}
.dashboard-card__title{display:flex;align-items:center;gap:10px;min-height:58px;border-bottom:1px solid rgba(255,255,255,.055)}
.dashboard-card__content--offline{opacity:.52;filter:saturate(.55);cursor:not-allowed;user-select:none}
.dashboard-card__content--offline :deep(*){cursor:not-allowed!important}
.dashboard-card__content--offline :deep(.v-slider-thumb){pointer-events:none}

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
