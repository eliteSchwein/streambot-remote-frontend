<template>
  <div>
    <div class="d-flex align-center ga-2 mb-4">
      <v-chip variant="tonal" :color="rotatingScene.runtime?.active ? 'success' : undefined">{{ rotatingScene.runtime?.active ? t('instance.active') : t('instance.inactive') }}</v-chip>
      <v-btn v-if="rotatingScene.runtime?.active" prepend-icon="mdi-stop" color="error" variant="tonal" @click="emit('command','rotating_scene.stop',{})">Stop</v-btn>
    </div>
    <div v-if="items.length" class="action-grid"><v-btn v-for="item in items" :key="itemKey(item)" variant="tonal" prepend-icon="mdi-play" @click="emit('command','rotating_scene.start',{name:item.name ?? item.id})">{{ itemLabel(item) }}</v-btn></div>
    <div v-else class="empty-state">{{ t('instance.noRotatingScenes') }}</div>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from '@/i18n'
defineProps<{ rotatingScene:any; items:any[] }>()
const emit = defineEmits<{ command:[method:string,params:any] }>()
const { t } = useI18n()
function itemKey(item:any){ return String(item?.id ?? item?.uuid ?? item?.name ?? item?.label ?? JSON.stringify(item)) }
function itemLabel(item:any){ return String(item?.label ?? item?.name ?? item?.title ?? item?.display_name ?? item?.id ?? t('common.item')) }
</script>
