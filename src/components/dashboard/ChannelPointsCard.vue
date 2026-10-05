<template>
  <div>
    <div v-if="items.length" class="channel-point-grid">
      <v-card v-for="item in items" :key="itemKey(item)" variant="tonal" rounded="lg"><v-card-text class="d-flex align-center ga-3">
        <v-avatar rounded="lg" size="48" :color="item.background || undefined"><v-img v-if="item.image" :src="item.image" cover /><v-icon v-else>mdi-star-circle-outline</v-icon></v-avatar>
        <div class="min-w-0 flex-grow-1"><div class="font-weight-medium text-truncate">{{ itemLabel(item) }}</div><div class="text-caption text-medium-emphasis">{{ item.exists_on_twitch ? 'Twitch' : t('instance.localOnly') }}</div></div>
        <v-switch color="primary" hide-details density="compact" :model-value="Boolean(item.active ?? item.twitch_enabled)" @update:model-value="()=>emit('command','channel_point.toggle',{state:'toggle',channel_point:item})" />
      </v-card-text></v-card>
    </div>
    <div v-else class="empty-state">{{ t('instance.emptySection') }}</div>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from '@/i18n'
defineProps<{ items:any[] }>()
const emit = defineEmits<{ command:[method:string,params:any] }>()
const { t } = useI18n()
function itemKey(item:any){ return String(item?.id ?? item?.uuid ?? item?.name ?? item?.label ?? JSON.stringify(item)) }
function itemLabel(item:any){ return String(item?.label ?? item?.name ?? item?.title ?? item?.display_name ?? item?.id ?? t('common.item')) }
</script>
