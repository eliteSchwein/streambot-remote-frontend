<template>
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
      <v-btn icon="mdi-shuffle" size="small" :variant="music.shuffle ? 'flat' : 'text'" :color="music.shuffle ? 'primary' : undefined" @click="send('music.shuffle')" />
      <v-btn icon="mdi-skip-previous" size="large" variant="text" @click="send('music.prev')" />
      <v-btn :icon="music.status === 'playing' ? 'mdi-pause' : 'mdi-play'" size="x-large" color="primary" variant="flat" class="music-play" @click="send(music.status === 'playing' ? 'music.pause' : 'music.play')" />
      <v-btn icon="mdi-skip-next" size="large" variant="text" @click="send('music.next')" />
      <v-btn icon="mdi-repeat" size="small" :variant="music.loop ? 'flat' : 'text'" :color="music.loop ? 'primary' : undefined" @click="send('music.loop')" />
    </div>

    <div class="music-volume mt-5">
      <v-icon size="small">mdi-volume-medium</v-icon>
      <v-slider :model-value="Number(music.volume ?? 0)" min="0" max="100" step="1" hide-details thumb-label @end="(v:any)=>send('music.volume',{volume:Number(v)})" />
      <span class="text-caption text-medium-emphasis">{{ Math.round(Number(music.volume ?? 0)) }}%</span>
    </div>

    <div class="music-stats mt-4">
      <span>{{ t('instance.playlistTracks', { count: Number(music.playlist_length ?? 0) }) }}</span>
      <span>{{ t('instance.songRequests') }}: {{ music.songrequest?.enabled ? t('common.yes') : t('common.no') }}</span>
      <span>{{ t('instance.queue') }}: {{ Number(music.songrequest?.queue_length ?? music.songrequest?.queue?.length ?? 0) }}</span>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'
const props = defineProps<{ music:any }>()
const emit = defineEmits<{ command:[method:string,params:any] }>()
const { t } = useI18n()
const musicProgress = computed(() => {
  const direct = Number(props.music?.progress_percentage)
  if (Number.isFinite(direct)) return Math.max(0, Math.min(100, direct))
  const pos = Number(props.music?.position ?? props.music?.progress)
  const duration = Number(props.music?.duration)
  return duration > 0 ? Math.max(0, Math.min(100, pos / duration * 100)) : 0
})
function formatDuration(value:any){ const ms=Number(value); if(!Number.isFinite(ms) || ms < 0) return '0:00'; const total=Math.floor(ms/1000); return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}` }
function send(method:string,params:any={}){ emit('command',method,params) }
</script>
