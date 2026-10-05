<template>
  <div>
    <v-list v-if="items.length" bg-color="transparent" class="auto-macro-list">
      <v-list-item v-for="item in items" :key="itemKey(item)" class="auto-macro-item">
        <div v-if="item.enabled" class="auto-macro-item__progress" :style="{ width: `${autoMacroProgress(item)}%` }"></div>
        <div class="auto-macro-item__content">
          <div class="d-flex align-center ga-3 flex-grow-1 min-w-0">
            <v-icon :color="item.enabled ? 'success' : undefined">{{ item.enabled ? 'mdi-robot' : 'mdi-robot-off-outline' }}</v-icon>
            <div class="min-w-0"><div class="font-weight-medium text-truncate">{{ itemLabel(item) }}</div><div class="text-caption text-medium-emphasis">{{ item.enabled ? t('instance.nextTriggerIn',{time:formatSeconds(item.current_interval ?? 0)}) : t('instance.intervalSeconds',{count:Number(item.interval ?? 0)}) }}</div></div>
          </div>
          <v-switch class="auto-macro-switch" color="primary" hide-details density="compact" :model-value="Boolean(item.enabled)" @update:model-value="(enabled)=>emit('command','auto_macro.toggle',{name:item.name ?? item.id,enable:Boolean(enabled)})" />
        </div>
      </v-list-item>
    </v-list>
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
function formatSeconds(value:any){ const total=Math.max(0,Math.round(Number(value)||0)); const h=Math.floor(total/3600); const m=Math.floor((total%3600)/60); const sec=total%60; if(h) return `${h}h ${m}m`; if(m) return `${m}m ${sec}s`; return `${sec}s` }
function autoMacroProgress(item:any){ const interval=Number(item?.interval ?? 0), current=Number(item?.current_interval ?? 0); return interval>0 ? Math.max(0,Math.min(100,(100/interval)*current)) : 0 }
</script>
